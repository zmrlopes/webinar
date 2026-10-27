import {NextResponse} from "next/server";
import {podeVerNovaArea} from "@/lib/consultor-nova-area";
import {buscarMembroEquipa} from "@/lib/equipa";
import {ErroChecklistMentor, listarTPsMentorados, marcarTarefaMentor} from "@/lib/mentor-checklist-servidor";

export async function POST(request: Request): Promise<Response> {
  const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, {status, headers: {"Cache-Control": "private, no-store"}});
  const corpo = await request.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  if (!podeVerNovaArea(email)) return json({erro: "Esta página está disponível apenas na nova área da conta de teste."}, 403);
  if (!corpo || !["listar", "marcar"].includes(corpo.acao)) return json({erro: "Pedido inválido."}, 400);
  try {
    if (!await buscarMembroEquipa(email)) return json({erro: "Conta não encontrada na equipa."}, 403);
    return corpo.acao === "listar" ? json({membros: await listarTPsMentorados(email)})
      : json({feitos: await marcarTarefaMentor(email, corpo.tpEmail, corpo.tarefa, corpo.concluido)});
  } catch (erro) {
    if (erro instanceof ErroChecklistMentor) return json({erro: erro.message}, erro.status);
    console.error("Checklist do mentor: não foi possível concluir o pedido", erro instanceof Error ? erro.name : "erro");
    return json({erro: "Não foi possível concluir o pedido. O progresso já guardado mantém-se. Tenta novamente."}, 500);
  }
}
