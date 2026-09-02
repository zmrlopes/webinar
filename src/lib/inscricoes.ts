import { db } from "./db";
import { TITULO_WEBINAR_PUBLICO } from "./webinars";

export class DadosInvalidos extends Error {}

export interface DadosInscricao {
  webinarId: string;
  nome: string;
  apelido: string;
  telemovel?: string;
  email: string;
  referencia?: string;
  referenciaEmail?: string;
  consentimentoPrivacidade: boolean;
}

function validarEmail(email: string): boolean {
  const arroba = email.indexOf("@");
  if (arroba <= 0) return false;
  if (email.includes(" ")) return false;
  const dominio = email.slice(arroba + 1);
  return dominio.includes(".") && !dominio.startsWith(".") && !dominio.endsWith(".");
}

/**
 * Secção 7-B do guia.
 *
 * Nenhuma chamada externa aqui dentro — só grava. O link é pedido à parte,
 * pela fila (secção 7-C). Se a API do Zoom estiver em baixo, esta função
 * continua a funcionar sem que a pessoa note: o que atrasa é o email, nunca
 * a inscrição.
 */
export async function inscrever(dados: DadosInscricao): Promise<{ registrationId: string }> {
  const nome = dados.nome.trim();
  const apelido = dados.apelido.trim();
  const email = dados.email.trim().toLowerCase();

  if (!nome) throw new DadosInvalidos("nome em falta");
  if (!apelido) throw new DadosInvalidos("apelido em falta");
  if (!validarEmail(email)) throw new DadosInvalidos("email inválido");
  if (!dados.consentimentoPrivacidade) {
    throw new DadosInvalidos("é preciso aceitar a política de privacidade");
  }

  const referencia = dados.referencia?.trim().slice(0, 64) || null;
  const telemovel = dados.telemovel?.trim().slice(0, 32) || null;
  const referenciaEmail = dados.referenciaEmail?.trim().toLowerCase().slice(0, 254) || null;

  const { rows: webinarRows } = await db().query<{
    titulo: string;
    tipo: string;
    publico_para_leads: boolean;
  }>(`select titulo, tipo, publico_para_leads from webinars where id = $1`, [dados.webinarId]);
  const webinar = webinarRows[0];
  if (!webinar) throw new DadosInvalidos("sessão não encontrada");

  // Só o webinar público (recrutamento) e as formações ad-hoc marcadas
  // como publico_para_leads aceitam leads — tudo o resto (a formação
  // recorrente do Patrick, e as ad-hoc só-para-equipa) é só para quem já
  // é consultor. Isto trava o /api/inscricoes público (usado por
  // formulários/widgets externos); o auto-registo do consultor no seu
  // painel tem o seu próprio insert, não passa por aqui.
  const abertaALeads =
    webinar.titulo === TITULO_WEBINAR_PUBLICO || (webinar.tipo === "formacao" && webinar.publico_para_leads);
  if (!abertaALeads) {
    const { rows: equipaRows } = await db().query<{ existe: boolean }>(
      `select exists(select 1 from equipa_afiliados where email = $1) as existe`,
      [email],
    );
    if (!equipaRows[0]?.existe) {
      throw new DadosInvalidos("esta sessão é só para a equipa");
    }
  }

  const { rows } = await db().query<{ id: string }>(
    `insert into registrations
       (webinar_id, nome, apelido, email, referencia, telemovel, referencia_email, consentimento_privacidade_em)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     returning id`,
    [dados.webinarId, nome, apelido.slice(0, 64), email, referencia, telemovel, referenciaEmail],
  );

  const linha = rows[0];
  if (!linha) throw new Error("inscrição não gravada");
  return { registrationId: linha.id };
}
