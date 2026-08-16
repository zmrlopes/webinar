/**
 * Cliente da sala partilhada de Zoom.
 *
 * Três pedidos, e nenhum deles é do lado do visitante. A chave nunca sai do
 * servidor, e as mensagens de erro nunca levam o email de ninguém: os registos
 * são vistos por quem administra a infraestrutura.
 */

function env(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`variável de ambiente em falta: ${nome}`);
  }
  return valor;
}

/** Um pedido preso atrasa a fila toda e acaba cortado pelo tempo da função. */
const TEMPO_LIMITE_MS = 15_000;

export class SalaError extends Error {
  constructor(
    message: string,
    readonly estado: number,
    /** Um 503 volta à fila. Um 400 não melhora com repetição. */
    readonly recuperavel: boolean,
  ) {
    super(message);
    this.name = "SalaError";
  }
}

async function chamar<T>(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown } = {},
): Promise<T> {
  const resposta = await fetch(`${env("SALA_BASE_URL")}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers: {
      Authorization: `Bearer ${env("SALA_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    cache: "no-store",
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });

  const texto = await resposta.text();

  if (!resposta.ok) {
    // 429 e 5xx passam com o tempo. 400/401/404 não.
    const recuperavel = resposta.status === 429 || resposta.status >= 500;
    throw new SalaError(
      `sala devolveu ${resposta.status} em ${caminho}`,
      resposta.status,
      recuperavel,
    );
  }

  return texto ? (JSON.parse(texto) as T) : (undefined as T);
}

export interface SessaoPartilhada {
  id: string;
  titulo: string;
  comeca_em: string; // UTC
  duracao_minutos: number;
}

export async function listarSessoes(): Promise<SessaoPartilhada[]> {
  const dados = await chamar<{ sessoes: SessaoPartilhada[] }>(
    "/api/parceiros/sessoes",
  );
  return dados.sessoes ?? [];
}

/**
 * Inscreve uma pessoa e devolve o endereço de entrada só dela.
 *
 * Idempotente dos dois lados: a mesma pessoa na mesma sessão devolve sempre o
 * mesmo link, por isso repetir a seguir a um timeout é seguro.
 */
export async function pedirLinkPessoal(entrada: {
  sessao: string;
  nome: string;
  apelido: string;
  email: string;
}): Promise<string> {
  const dados = await chamar<{ link_pessoal: string }>(
    "/api/parceiros/inscricoes",
    {
      metodo: "POST",
      corpo: {
        sessao: entrada.sessao,
        nome: entrada.nome.slice(0, 64),
        apelido: entrada.apelido.slice(0, 64),
        email: entrada.email.trim().toLowerCase(),
      },
    },
  );
  return dados.link_pessoal;
}

export interface PresencaDevolvida {
  email: string;
  presenca: "attended" | "absent" | "unknown";
  minutos: number | null;
}

/**
 * A presença das nossas pessoas nessa sessão.
 *
 * A resposta pode trazer menos linhas do que a pergunta: um email que não
 * inscrevemos não vem, nem sequer como `absent`. Não é erro.
 */
export async function pedirPresencas(
  sessao: string,
  emails: readonly string[],
): Promise<PresencaDevolvida[]> {
  const resultado: PresencaDevolvida[] = [];

  for (let i = 0; i < emails.length; i += 1000) {
    const lote = emails.slice(i, i + 1000).map((e) => e.trim().toLowerCase());
    const dados = await chamar<{ presencas: PresencaDevolvida[] }>(
      "/api/parceiros/presencas",
      { metodo: "POST", corpo: { sessao, emails: lote } },
    );
    resultado.push(...(dados.presencas ?? []));
  }

  return resultado;
}

/** 5 min → 25 min → 2 h → 12 h. Depois disto, desiste e alerta. */
const RECUOS_MINUTOS = [5, 25, 120, 720];

export function proximaTentativa(tentativas: number, agora: Date): Date | null {
  const minutos = RECUOS_MINUTOS[tentativas];
  if (minutos === undefined) return null; // esgotou
  return new Date(agora.getTime() + minutos * 60_000);
}
