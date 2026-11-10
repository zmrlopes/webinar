import { NextResponse } from "next/server";
import { buscarMembroEquipa } from "@/lib/equipa";
import { podeVerAreaEquipa, LIDERES_EQUIPA_BF } from "@/lib/lideres-equipa";
import { equipaDoLider, estatisticasEquipa } from "@/lib/lideres-equipa-servidor";
import {
  comprovativoEquipaBF, configuracaoBF, ErroBF, faturacaoEquipaBF, guardarFaturacaoEquipaBF,
  listarReservasEquipaBF, reverReservaEquipaBF,
} from "@/lib/blackfriday-servidor";
import { hojeBF, periodoBF } from "@/lib/blackfriday";

export const runtime = "nodejs";
const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  try {
    const corpo = await request.json().catch(() => null) as Record<string, unknown> | null;
    const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
    if (!podeVerAreaEquipa(email)) return json({ erro: "Esta área é exclusiva de líderes com equipa própria no desafio." }, 403);
    if (!await buscarMembroEquipa(email)) return json({ erro: "Conta não encontrada na equipa." }, 403);
    const liderEmail = email;
    const nome = LIDERES_EQUIPA_BF[liderEmail]!.nome;
    const meta = LIDERES_EQUIPA_BF[liderEmail]!.metaBingo;

    if (corpo?.acao === "periodo") {
      const { inicio, fim } = periodoBF(await configuracaoBF(), hojeBF());
      return json({ inicio, fim });
    }

    if (corpo?.acao === "atualizar-faturacao") {
      const origemEmail = typeof corpo.origemEmail === "string" ? corpo.origemEmail.trim().toLowerCase() : "";
      if (origemEmail !== email) return json({ erro: "Entra no MyOffice com o mesmo email da tua conta e volta a carregar no favorito." }, 403);
      const valor = typeof corpo.valor === "number" ? corpo.valor : NaN;
      const faturacao = await guardarFaturacaoEquipaBF(liderEmail, valor);
      return json({ faturacao });
    }

    const emails = await equipaDoLider(liderEmail);

    if (corpo?.acao === "listar") {
      const [config, reservas, faturacao, estatisticas] = await Promise.all([
        configuracaoBF(), listarReservasEquipaBF(emails), faturacaoEquipaBF(liderEmail), estatisticasEquipa(liderEmail),
      ]);
      return json({ nome, meta, config, reservas, faturacao, estatisticas, hoje: hojeBF() });
    }
    if (corpo?.acao === "comprovativo" && typeof corpo.id === "string") return await comprovativoEquipaBF(emails, corpo.id);
    if (corpo?.acao === "rever") {
      await reverReservaEquipaBF(emails, corpo.id, corpo.estado, corpo.motivo);
      const [config, reservas, faturacao] = await Promise.all([configuracaoBF(), listarReservasEquipaBF(emails), faturacaoEquipaBF(liderEmail)]);
      return json({ nome, meta, config, reservas, faturacao, hoje: hojeBF() });
    }
    return json({ erro: "Pedido inválido." }, 400);
  } catch (e) {
    if (e instanceof ErroBF) return json({ erro: e.message }, e.status);
    console.error("Equipa (bingo): pedido não concluído", e instanceof Error ? e.message : "erro");
    return json({ erro: "Não foi possível concluir o pedido. Tenta novamente." }, 500);
  }
}
