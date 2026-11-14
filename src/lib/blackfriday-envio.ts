import { referenciaBF, type DadosBF } from "./blackfriday";

const ENDPOINT = "/api/consultor/nova-area/blackfriday";
const FALHA_LIGACAO = "A ligação falhou durante o envio. Os campos e o comprovativo continuam neste formulário. Tenta enviar novamente; a mesma reserva não será duplicada.";

/** Lê o ficheiro localmente antes de enviar, incluindo anexos escolhidos no armazenamento do telemóvel. */
export async function enviarComprovativoBF(form: FormData, transporte: typeof fetch = fetch): Promise<DadosBF> {
  const ficheiro = form.get("ficheiro");
  if (!(ficheiro instanceof File) || !ficheiro.size || ficheiro.size > 3 * 1024 * 1024) throw new Error("Anexa um print ou PDF com até 3 MB.");
  let bytes: ArrayBuffer;
  try { bytes = await ficheiro.arrayBuffer(); }
  catch { throw new Error("Não foi possível ler o comprovativo. Guarda-o no telemóvel e volta a selecioná-lo neste formulário."); }
  // Envia uma cópia em memória: não depende de voltar a ler o ficheiro do seletor durante o pedido.
  form.set("ficheiro", new Blob([bytes], { type: ficheiro.type }), ficheiro.name);

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let resposta: Response | null = null;
    try { resposta = await transporte(ENDPOINT, { method: "POST", body: form }); }
    catch { /* Uma resposta perdida não significa que o servidor não gravou. */ }
    const corpo = resposta ? await resposta.json().catch(() => null) : null;
    if (resposta?.ok && corpo && Array.isArray(corpo.inscricoes)) return corpo as DadosBF;
    const conflito = resposta?.status === 409;
    if (resposta && !resposta.ok && !conflito) {
      throw new Error(typeof corpo?.erro === "string" ? corpo.erro : resposta.status === 413
        ? "O comprovativo é demasiado grande. Escolhe um print ou PDF com até 3 MB."
        : "O servidor não conseguiu receber o comprovativo. Os campos mantêm-se; tenta novamente.");
    }

    let consultaConfirmada = false;
    try {
      const consulta = await transporte(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), acao: "consultar", simulacao: form.get("simulacao") === "true" }),
      });
      const dados: DadosBF = await consulta.json();
      if (consulta.ok && Array.isArray(dados.inscricoes) && dados.simulacao === (form.get("simulacao") === "true")) {
        consultaConfirmada = true;
        const recebida = dados.inscricoes.some(i => i.estado !== "recusada"
          && i.email === String(form.get("email")).trim().toLowerCase()
          && i.casa === Number(form.get("casa"))
          && i.referencia === referenciaBF(String(form.get("referencia")))
          && i.dataReserva === form.get("dataReserva")
          && i.valorCentimos === Math.round(Number(String(form.get("valor")).replace(",", ".")) * 100));
        if (recebida) return dados;
      }
    } catch { /* Mantém o formulário quando nem a consulta permite confirmar a receção. */ }
    if (conflito) throw new Error(typeof corpo?.erro === "string" ? corpo.erro : "Esta casa já tem uma reserva enviada. Atualiza o cartão.");
    // Repete uma única vez e apenas depois de conseguir consultar o cartão.
    // A transação do servidor impede duplicados se o primeiro envio ainda estiver a concluir.
    if (tentativa === 1 || !consultaConfirmada) throw new Error(FALHA_LIGACAO);
  }
  throw new Error(FALHA_LIGACAO);
}
