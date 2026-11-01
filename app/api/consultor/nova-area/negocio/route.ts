import {NextResponse} from "next/server";
import {podeVerNovaArea} from "@/lib/consultor-nova-area";
import {buscarMembroEquipa} from "@/lib/equipa";
import {atualizarNegocio, ErroNegocio, iniciarNegocio, lerNegocio} from "@/lib/consultor-negocio-servidor";

export async function POST(request: Request): Promise<Response> {
  const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {status, headers: {"Cache-Control": "private, no-store"}});
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin) return json({erro: "Origem não permitida."}, 403);
  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > 16_384) return json({erro: "Pedido demasiado grande."}, 413);
  const texto = await request.text();
  if (texto.length > 16_384) return json({erro: "Pedido demasiado grande."}, 413);
  const corpo = (() => {try {return JSON.parse(texto);} catch {return null;}})();
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) return json({erro: "O meu negócio está disponível apenas na nova área da conta de teste."}, 403);
  if (!["ler", "iniciar", "periodo", "concluir"].includes(corpo?.acao)) return json({erro: "Pedido inválido."}, 400);
  try {
    if (!await buscarMembroEquipa(email)) return json({erro: "Conta não encontrada na equipa."}, 403);
    if (corpo.acao === "ler") return json({dados: await lerNegocio(email)});
    if (corpo.acao === "iniciar") return json({plano: await iniciarNegocio(email, corpo.origemEmail)});
    const dados = await atualizarNegocio(email, corpo.id, corpo.periodo, corpo.totais, corpo.acao === "concluir");
    return json({ok: true, ...(dados ? {dados} : {})});
  } catch (erro) {
    if (erro instanceof ErroNegocio) return json({erro: erro.message}, erro.status);
    if (erro instanceof Error && /totais|indicadores válidos/.test(erro.message)) return json({erro: erro.message}, 400);
    console.error("Dashboard individual: falha no pedido", erro instanceof Error ? erro.name : "erro");
    return json({erro: "Não foi possível concluir a atualização. Os dados já guardados mantêm-se. Tenta novamente."}, 500);
  }
}
