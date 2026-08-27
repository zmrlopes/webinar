const BASE = process.env.BREVO_API_BASE_URL ?? "https://api.brevo.com";

function chave(): string {
  const valor = process.env.BREVO_API_KEY;
  if (!valor) throw new Error("variável de ambiente em falta: BREVO_API_KEY");
  return valor;
}

/**
 * O campo SMS da Brevo exige formato E.164 (+<indicativo><número>) — os
 * telemóveis que recolhemos vêm em formato local português (9 dígitos,
 * sem indicativo), o que a Brevo rejeitava com "Invalid phone number".
 * Assume Portugal quando não há indicativo próprio.
 */
function paraE164(telemovel: string): string {
  const limpo = telemovel.replace(/[^\d+]/g, "");
  return limpo.startsWith("+") ? limpo : `+351${limpo}`;
}

/**
 * Cria/atualiza (upsert) o contacto de quem se inscreveu, na lista de
 * inscritos, com o consultor de origem gravado no campo CONSULTOR.
 */
export async function sincronizarContactoInscrito(dados: {
  email: string;
  nome: string;
  telemovel: string | null;
  referencia: string | null;
}): Promise<void> {
  const listaId = Number(process.env.BREVO_LISTA_INSCRITOS_ID ?? "0");
  if (!listaId) throw new Error("variável de ambiente em falta: BREVO_LISTA_INSCRITOS_ID");

  const resposta = await fetch(`${BASE}/v3/contacts`, {
    method: "POST",
    headers: {
      "api-key": chave(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: dados.email,
      updateEnabled: true,
      listIds: [listaId],
      attributes: {
        NOME: dados.nome,
        ...(dados.telemovel ? { SMS: paraE164(dados.telemovel) } : {}),
        ...(dados.referencia ? { CONSULTOR: dados.referencia } : {}),
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!resposta.ok) {
    throw new Error(`Brevo devolveu ${resposta.status} ao sincronizar contacto: ${await resposta.text()}`);
  }
}
