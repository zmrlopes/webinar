const BASE = process.env.BREVO_API_BASE_URL ?? "https://api.brevo.com";

function chave(): string {
  const valor = process.env.BREVO_API_KEY;
  if (!valor) throw new Error("variável de ambiente em falta: BREVO_API_KEY");
  return valor;
}

export interface ContactoBrevo {
  email: string;
  nome: string | null;
  apelido: string | null;
}

/**
 * Procura um contacto pelo email. Devolve `null` se não existir — é o caso
 * normal de alguém que ainda não está na equipa, não um erro.
 */
export async function procurarContactoBrevo(email: string): Promise<ContactoBrevo | null> {
  const resposta = await fetch(`${BASE}/v3/contacts/${encodeURIComponent(email)}`, {
    headers: { "api-key": chave(), Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (resposta.status === 404) return null;
  if (!resposta.ok) {
    throw new Error(`Brevo devolveu ${resposta.status} ao procurar contacto: ${await resposta.text()}`);
  }

  const dados = (await resposta.json()) as {
    email: string;
    attributes?: Record<string, unknown>;
  };
  const atributos = dados.attributes ?? {};
  return {
    email: dados.email,
    nome: typeof atributos.NOME === "string" ? atributos.NOME : null,
    apelido: typeof atributos.SOBRENOME === "string" ? atributos.SOBRENOME : null,
  };
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
        ...(dados.telemovel ? { SMS: dados.telemovel } : {}),
        ...(dados.referencia ? { CONSULTOR: dados.referencia } : {}),
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!resposta.ok) {
    throw new Error(`Brevo devolveu ${resposta.status} ao sincronizar contacto: ${await resposta.text()}`);
  }
}
