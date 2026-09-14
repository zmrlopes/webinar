import { db } from "./db";
import { CONDICAO_CONSULTOR_COM_PAINEL } from "./equipa";

/**
 * Configuração da conta ActiveCampaign. Sem as três variáveis obrigatórias
 * não há nada a fazer — quem chama decide se isso é um erro ou se
 * simplesmente cai noutro fornecedor (ver criarEmailSender em email.ts).
 */
export interface ConfigActiveCampaign {
  base: string;
  chave: string;
  automacaoId: string;
  listaConsultores: string;
}

/**
 * A lista "Consultores ativos" criada na conta AC. Existe porque na
 * ActiveCampaign o cancelamento de subscrição é *por lista*: quem se
 * descansou de uma lista antiga de leads (e são centenas) deixa
 * silenciosamente de receber os emails das automações. Ter os consultores
 * numa lista própria, onde nunca se descansaram, é o que faz os avisos
 * operacionais (nova sessão disponível) voltarem a chegar.
 */
const LISTA_CONSULTORES_POR_OMISSAO = "24";

export function configActiveCampaign(): ConfigActiveCampaign | null {
  const chave = process.env.ACTIVECAMPAIGN_API_KEY;
  const base = process.env.ACTIVECAMPAIGN_API_URL;
  const automacaoId = process.env.ACTIVECAMPAIGN_AUTOMATION_ID;
  if (!chave || !base || !automacaoId) return null;
  return {
    base,
    chave,
    automacaoId,
    listaConsultores: process.env.ACTIVECAMPAIGN_LISTA_CONSULTORES ?? LISTA_CONSULTORES_POR_OMISSAO,
  };
}

export function cabecalhosActiveCampaign(chave: string): Record<string, string> {
  return { "Api-Token": chave, "Content-Type": "application/json", Accept: "application/json" };
}

export interface ResultadoSincronizacaoLista {
  lista: string;
  consultoresComPainel: number;
  enviados: number;
  lotes: number;
  removidos: number;
  erros: string[];
}

/** A AC aceita até 250 contactos por chamada ao bulk_import. */
const TAMANHO_LOTE = 200;

/**
 * Põe na lista "Consultores ativos" da ActiveCampaign exatamente os
 * consultores que têm painel — o mesmo critério de quem recebe os avisos
 * (ver CONDICAO_CONSULTOR_COM_PAINEL em email.ts). Usa o bulk_import, que
 * leva 200 de cada vez em vez de um pedido por pessoa.
 *
 * Também limpa: quem estiver na lista e já não pertencer a este conjunto é
 * retirado. Sem isso, a lista ia acumulando gente do CSV da equipa que
 * nunca se registou na plataforma, e uma campanha enviada à lista acabava
 * por lhes chegar.
 *
 * Nota honesta sobre o que isto não faz: quem está marcado como "bounced"
 * na AC continua bloqueado globalmente e não recebe nada, esteja em que
 * lista estiver. Só uma morada que volte a aceitar email resolve esses.
 */
export async function sincronizarConsultoresAtivosNaLista(): Promise<ResultadoSincronizacaoLista> {
  const config = configActiveCampaign();
  if (!config) {
    throw new Error(
      "variáveis de ambiente em falta: ACTIVECAMPAIGN_API_KEY / ACTIVECAMPAIGN_API_URL / ACTIVECAMPAIGN_AUTOMATION_ID",
    );
  }

  const { rows } = await db().query<{ email: string; nome: string }>(
    `select email, nome from equipa_afiliados
     where ${CONDICAO_CONSULTOR_COM_PAINEL}
     order by email`,
  );

  const erros: string[] = [];
  let enviados = 0;
  let lotes = 0;

  for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
    const lote = rows.slice(i, i + TAMANHO_LOTE);
    lotes += 1;
    const resposta = await fetch(`${config.base}/api/3/import/bulk_import`, {
      method: "POST",
      headers: cabecalhosActiveCampaign(config.chave),
      body: JSON.stringify({
        contacts: lote.map((c) => ({
          email: c.email,
          first_name: c.nome,
          subscribe: [{ listid: Number(config.listaConsultores) }],
        })),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      erros.push(`lote ${lotes}: a ActiveCampaign devolveu ${resposta.status} — ${corpo.slice(0, 300)}`);
      continue;
    }
    enviados += lote.length;
  }

  let removidos = 0;
  try {
    removidos = await retirarDaListaQuemJaNaoPertence(
      config,
      new Set(rows.map((r) => r.email.toLowerCase())),
    );
  } catch (erro) {
    erros.push(`limpeza da lista: ${erro instanceof Error ? erro.message : String(erro)}`);
  }

  return {
    lista: config.listaConsultores,
    consultoresComPainel: rows.length,
    enviados,
    lotes,
    removidos,
    erros,
  };
}

/**
 * Tira da lista quem lá está e não consta de `emailsQueFicam`. Na AC não se
 * apaga uma subscrição — põe-se o status a 2 (descansado), que é o que a
 * impede de receber seja campanha seja automação associada à lista.
 */
async function retirarDaListaQuemJaNaoPertence(
  config: ConfigActiveCampaign,
  emailsQueFicam: Set<string>,
): Promise<number> {
  const porPagina = 100;
  const aRetirar: { id: string; email: string }[] = [];

  for (let offset = 0; ; offset += porPagina) {
    const url = `${config.base}/api/3/contacts?listid=${config.listaConsultores}&status=1&limit=${porPagina}&offset=${offset}`;
    const resposta = await fetch(url, {
      headers: cabecalhosActiveCampaign(config.chave),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resposta.ok) {
      throw new Error(`a ActiveCampaign devolveu ${resposta.status} ao listar a lista`);
    }
    const dados = (await resposta.json()) as { contacts?: { id: string; email: string }[] };
    const pagina = dados.contacts ?? [];
    for (const c of pagina) {
      if (!emailsQueFicam.has(c.email.toLowerCase())) aRetirar.push({ id: c.id, email: c.email });
    }
    if (pagina.length < porPagina) break;
  }

  for (const c of aRetirar) {
    await fetch(`${config.base}/api/3/contactLists`, {
      method: "POST",
      headers: cabecalhosActiveCampaign(config.chave),
      body: JSON.stringify({
        contactList: { list: config.listaConsultores, contact: c.id, status: 2 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  }

  return aRetirar.length;
}

/**
 * Garante que este contacto está subscrito na lista indicada antes de lhe
 * enviarmos seja o que for. status 1 = subscrito.
 */
export async function subscreverContactoNaLista(
  config: ConfigActiveCampaign,
  contactoId: string,
  listaId: string,
): Promise<void> {
  const resposta = await fetch(`${config.base}/api/3/contactLists`, {
    method: "POST",
    headers: cabecalhosActiveCampaign(config.chave),
    body: JSON.stringify({ contactList: { list: listaId, contact: contactoId, status: 1 } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`ActiveCampaign devolveu ${resposta.status} ao subscrever na lista ${listaId}: ${corpo}`);
  }
}

/**
 * Mete um consultor acabado de registar na lista dos emails, sem esperar
 * pela sincronização em massa. Chamada quando alguém gera o seu link pela
 * primeira vez (ver guardarLinkConsultor em consultor.ts) — é esse o
 * momento em que a pessoa passa a ser "consultor com painel" e, portanto,
 * destinatário dos avisos.
 *
 * Não estoira se a ActiveCampaign não estiver configurada nem se a API
 * falhar: quem chama trata o erro como um aviso, porque não se deixa
 * alguém de fora do painel por causa de um problema no fornecedor de
 * email. A sincronização em massa em /admin/activecampaign apanha depois
 * quem tenha escapado.
 */
export async function garantirConsultorNaLista(email: string, nome: string | null): Promise<boolean> {
  const config = configActiveCampaign();
  if (!config) return false;

  const resposta = await fetch(`${config.base}/api/3/contact/sync`, {
    method: "POST",
    headers: cabecalhosActiveCampaign(config.chave),
    body: JSON.stringify({ contact: { email, ...(nome ? { firstName: nome } : {}) } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`ActiveCampaign devolveu ${resposta.status} ao criar/atualizar contacto: ${corpo}`);
  }
  const dados = (await resposta.json()) as { contact: { id: string } };

  await subscreverContactoNaLista(config, dados.contact.id, config.listaConsultores);
  return true;
}
