import {NextResponse} from "next/server";
import {podeVerNovaArea} from "@/lib/consultor-nova-area";
import {buscarMembroEquipa} from "@/lib/equipa";
import {dadosBF, enviarReservaBF, comprovativoBF, ErroBF} from "@/lib/blackfriday-servidor";

export const runtime = "nodejs";
const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {status, headers: {"Cache-Control": "private, no-store"}});
export async function POST(request: Request) {
  try {
    const multipart = request.headers.get("content-type")?.includes("multipart/form-data");
    const formulario = multipart ? await request.formData() : null;
    const campos: Record<string, unknown> = {};
    formulario?.forEach((valor, chave) => {campos[chave] = valor;});
    const corpo = formulario ? campos : await request.json().catch(() => null);
    const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
    if (!podeVerNovaArea(email)) return json({erro: "Este desafio está em preparação na conta de teste."}, 403);
    const membro = await buscarMembroEquipa(email);
    if (!membro) return json({erro: "Conta não encontrada na equipa."}, 403);
    if (corpo.acao === "consultar") return json(await dadosBF(email));
    if (corpo.acao === "comprovativo" && typeof corpo.id === "string") return await comprovativoBF(corpo.id, email);
    if (corpo.acao !== "enviar" || !formulario || !(formulario.get("ficheiro") instanceof File)) return json({erro: "Pedido inválido."}, 400);
    await enviarReservaBF(email, membro.nome, corpo, formulario.get("ficheiro") as File);
    return json(await dadosBF(email));
  } catch (e) {
    if (e instanceof ErroBF) return json({erro: e.message}, e.status);
    console.error("Black Friday: falha no pedido", e instanceof Error ? e.name : "erro");
    return json({erro: "Não foi possível concluir o pedido. Tenta novamente."}, 500);
  }
}
