import {NextResponse} from "next/server";
import {ehContaPilotoNovaArea} from "@/lib/consultor-nova-area";
import {EMAIL_PAINEL_DEMONSTRACAO} from "@/lib/demo";
import {buscarMembroEquipa} from "@/lib/equipa";
import {metaBfParaEmail} from "@/lib/lideres-equipa-servidor";
import {dadosBF, enviarReservaBF, comprovativoBF, faturacaoEquipaBF, limparSimulacaoBF, ErroBF} from "@/lib/blackfriday-servidor";
import type {DadosBF} from "@/lib/blackfriday";

export const runtime = "nodejs";
const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {status, headers: {"Cache-Control": "private, no-store"}});

/** A conta de teste vê sempre a meta geral; quem pertence à equipa de um líder configurado vê a meta própria dela. */
async function comMetaEquipa(dados: DadosBF, email: string, demonstracao: boolean) {
  if (demonstracao) return dados;
  const meta = await metaBfParaEmail(email);
  if (!meta) return dados;
  return {...dados, metaEquipa: {nome: meta.nome, meta: meta.meta, faturacao: await faturacaoEquipaBF(meta.liderEmail)}};
}

export async function POST(request: Request) {
  try {
    const multipart = request.headers.get("content-type")?.includes("multipart/form-data");
    const formulario = multipart ? await request.formData() : null;
    const campos: Record<string, unknown> = {};
    formulario?.forEach((valor, chave) => {campos[chave] = valor;});
    const corpo = formulario ? campos : await request.json().catch(() => null);
    const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
    const demonstracao = email === EMAIL_PAINEL_DEMONSTRACAO;
    if (!ehContaPilotoNovaArea(email) && !await metaBfParaEmail(email)) return json({erro: "Este desafio ainda não está disponível para esta conta."}, 403);
    if (corpo.simulacao !== undefined && ![true, false, "true", "false"].includes(corpo.simulacao)) return json({erro: "Modo de teste inválido."}, 400);
    const simulacao = corpo.simulacao === true || corpo.simulacao === "true";
    if (simulacao && !demonstracao) return json({erro: "A simulação está disponível apenas na conta de teste."}, 403);
    const membro = await buscarMembroEquipa(email);
    if (!membro) return json({erro: "Conta não encontrada na equipa."}, 403);
    if (corpo.acao === "consultar") return json(await comMetaEquipa(await dadosBF(email, simulacao), email, demonstracao));
    if (corpo.acao === "comprovativo" && typeof corpo.id === "string") return await comprovativoBF(corpo.id, email, simulacao);
    if (corpo.acao === "limpar-simulacao" && simulacao) {await limparSimulacaoBF(); return json(await dadosBF(email, true));}
    if (corpo.acao !== "enviar" || !formulario || !(formulario.get("ficheiro") instanceof File)) return json({erro: "Pedido inválido."}, 400);
    await enviarReservaBF(email, membro.nome, corpo, formulario.get("ficheiro") as File, simulacao);
    return json(await comMetaEquipa(await dadosBF(email, simulacao), email, demonstracao));
  } catch (e) {
    if (e instanceof ErroBF) return json({erro: e.message}, e.status);
    console.error("Black Friday: falha no pedido", e instanceof Error ? e.name : "erro");
    return json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, 500);
  }
}
