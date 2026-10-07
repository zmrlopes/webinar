import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { podeVerNovaArea, type DadosNovaArea } from "@/lib/consultor-nova-area";
import { obterElegibilidadeWelcomeAboard } from "@/lib/welcome-aboard";
import { buscarProximaSessaoWelcomeAboard } from "@/lib/webinars";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) {
    return NextResponse.json({ erro: "A nova área ainda está em preparação." }, { status: 403 });
  }

  try {
    const { rows } = await db().query<{ nome: string; upline_email: string | null; upline_nome: string | null }>(
      `select membro.nome, membro.upline_email, upline.nome as upline_nome
       from equipa_afiliados membro
       left join equipa_afiliados upline on upline.email = membro.upline_email
       where membro.email = $1`,
      [email],
    );
    const membro = rows[0];
    if (!membro) {
      return NextResponse.json({ erro: "Não encontrámos esta conta na equipa." }, { status: 403 });
    }
    const [welcomeAboard, sessao] = await Promise.all([
      obterElegibilidadeWelcomeAboard(email),
      buscarProximaSessaoWelcomeAboard(),
    ]);
    const inscricao = sessao
      ? await db().query<{ inscrito: boolean }>(
          `select exists(select 1 from registrations
           where webinar_id = $1 and email = $2 and cancelada_em is null
             and link_pessoal is not null) as inscrito`,
          [sessao.id, email],
        )
      : null;
    const dados: DadosNovaArea = {
      nome: membro.nome,
      upline: membro.upline_email ? { nome: membro.upline_nome, email: membro.upline_email } : null,
      welcomeAboard,
      proximaSessao: sessao ? { id: sessao.id, comecaEm: sessao.sessaoExternaEm.toISOString() } : null,
      inscritoWelcomeAboard: inscricao?.rows[0]?.inscrito ?? false,
    };
    return NextResponse.json(dados, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("falha ao carregar a nova área de teste:", erro);
    return NextResponse.json({ erro: "Não foi possível carregar a nova área. Tenta novamente." }, { status: 500 });
  }
}
