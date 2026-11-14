import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { temAcessoNovaArea } from "@/lib/consultor-nova-area-servidor";
import { diaEmPortugal, mudarMes, type AcontecimentoCalendario } from "@/lib/calendario-consultor";
import { TITULO_WEBINAR_PUBLICO, TITULO_WELCOME_ABOARD } from "@/lib/webinars";
import { EVENTO_TITULO, EVENTO_LOCAL, estaoInscricoesAbertas } from "@/lib/eventos";
import { obterCalendarioForum } from "@/lib/forum-icligo";
import { juntarFormacoesIcligo, linguaDaFormacao, tituloSemBandeira } from "@/lib/formacoes-forum-icligo";
import { eventosEquipa2027, eventosPresenciais2027 } from "@/lib/eventos-equipa-2027";

export async function POST(request: Request): Promise<Response> {
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  // Publicado para todos os consultores da equipa (nova área e /consultor/calendario).
  if (!email.includes("@")) return NextResponse.json({ erro: "Identifica-te com o teu email de consultor." }, { status: 400 });
  try {
    if (!(await temAcessoNovaArea(email))) {
      return NextResponse.json({ erro: "Conta não encontrada na equipa." }, { status: 403 });
    }
  } catch (erro) {
    console.error("falha ao confirmar o acesso ao calendário:", erro);
    return NextResponse.json({ erro: "Não foi possível carregar o calendário. Tenta novamente." }, { status: 500 });
  }
  const mes = corpo?.mes;
  if (typeof mes !== "string" || !/^(20\d{2})-(0[1-9]|1[0-2])$/.test(mes)) {
    return NextResponse.json({ erro: "Escolhe um mês válido." }, { status: 400 });
  }
  try {
    const inicio = `${mes}-01`, fim = `${mudarMes(mes, 1)}-01`;
    const [sessoes, externas, forum] = await Promise.all([
      db().query<{ id: string; titulo: string; publico_para_leads: boolean; sessao_externa_em: Date; duracao_minutos: number | null; inscrito: boolean }>(
        `select w.id, w.titulo, w.publico_para_leads, w.sessao_externa_em, w.duracao_minutos,
           exists(select 1 from registrations r where r.webinar_id = w.id
             and r.email = $3 and r.cancelada_em is null and r.link_pessoal is not null) as inscrito
         from webinars w where w.cancelada_em is null
           and (w.destinatarios_emails is null or $3 = any(w.destinatarios_emails))
           and sessao_externa_em >= ($1::date::timestamp at time zone 'Europe/Lisbon')
           and sessao_externa_em < ($2::date::timestamp at time zone 'Europe/Lisbon')
         order by sessao_externa_em`, [inicio, fim, email],
      ),
      db().query<{ id: string; titulo: string; sessao_externa_em: Date; link: string }>(
        `select id, titulo, sessao_externa_em, link from formacoes_externas
         where sessao_externa_em >= ($1::date::timestamp at time zone 'Europe/Lisbon')
           and sessao_externa_em < ($2::date::timestamp at time zone 'Europe/Lisbon')
         order by sessao_externa_em`, [inicio, fim],
      ),
      obterCalendarioForum(mes),
    ]);
    const acontecimentos: AcontecimentoCalendario[] = [
      ...sessoes.rows.map(s => ({
        id: `sessao-${s.id}`, titulo: s.titulo,
        categoria: s.titulo === TITULO_WELCOME_ABOARD ? "welcome" as const
          : s.titulo === TITULO_WEBINAR_PUBLICO || s.publico_para_leads ? "webinar" as const : "formacao" as const,
        comecaEm: s.sessao_externa_em.toISOString(),
        terminaEm: s.duracao_minutos && s.duracao_minutos > 0 ? new Date(s.sessao_externa_em.getTime() + s.duracao_minutos * 60000).toISOString() : null,
        diaInteiro: false, local: "Online", url: null, webinarId: s.id, inscrito: s.inscrito,
      })),
      ...juntarFormacoesIcligo(externas.rows.map(f => ({
        id: `icligo-${f.id}`, titulo: tituloSemBandeira(f.titulo), categoria: "icligo" as const, lingua: linguaDaFormacao(f.titulo) ?? "pt",
        comecaEm: f.sessao_externa_em.toISOString(), terminaEm: null, diaInteiro: false, local: "Online · iCliGo", url: f.link,
      })), forum.formacoes),
    ];
    // Eventos presenciais já anunciados na plataforma; a hora ainda não foi indicada.
    const hoje = diaEmPortugal();
    const teambuilding: AcontecimentoCalendario | null = mes === "2026-11" || hoje <= "2026-11-14" ? {
      id: "teambuilding-2026", titulo: EVENTO_TITULO, categoria: "evento", comecaEm: "2026-11-14",
      terminaEm: null, diaInteiro: true, local: EVENTO_LOCAL, url: null, inscricoesAbertas: await estaoInscricoesAbertas(),
    } : null;
    if (teambuilding && mes === "2026-11") acontecimentos.push(teambuilding);
    acontecimentos.push(...eventosEquipa2027(mes));
    acontecimentos.sort((a, b) => a.comecaEm.localeCompare(b.comecaEm) || a.titulo.localeCompare(b.titulo));
    // Vista "Eventos presenciais": todos os encontros presenciais a partir de hoje, sem depender do mês.
    const presenciais = [
      ...(teambuilding && hoje <= "2026-11-14" ? [teambuilding] : []),
      ...eventosPresenciais2027(hoje),
    ];
    return NextResponse.json({ mes, acontecimentos, presenciais, forum: { atualizadoEm: forum.atualizadoEm, aviso: forum.aviso } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    console.error("falha ao carregar o calendário:", erro);
    return NextResponse.json({ erro: "Não foi possível carregar o calendário. Tenta novamente." }, { status: 500 });
  }
}
