import { db } from "./db";

export interface DestinatarioFormacao {
  email: string;
  nome: string;
  telemovel: string | null;
}

// Só quem já tem painel pode ver e entrar nas formações internas.
const CONSULTOR_INSCRITO = `exists (
  select 1 from links_consultor lc
  where lower(trim(lc.referencia_email)) = lower(trim(ea.email))
)`;

// Um consultor pode ter várias inscrições. Usa o último telefone preenchido.
const LISTA_DESTINATARIOS = `select lower(trim(ea.email)) as email, ea.nome,
  (select contactos.telemovel from (
     select r.telemovel, r.criado_em from registrations r
     where lower(trim(r.email)) = lower(trim(ea.email)) and r.cancelada_em is null
     union all
     select ei.telemovel, ei.criado_em from evento_inscricoes ei
     where lower(trim(ei.email)) = lower(trim(ea.email))
   ) contactos where nullif(trim(contactos.telemovel), '') is not null
   order by contactos.criado_em desc limit 1) as telemovel
  from equipa_afiliados ea where ${CONSULTOR_INSCRITO}`;

export async function pesquisarDestinatariosFormacao(pesquisa: string, pagina: number) {
  const termo = pesquisa.trim().slice(0, 100);
  const texto = termo.replace(/[\\%_]/g, "\\$&");
  const digitos = termo.replace(/\D/g, "");
  const { rows } = await db().query<DestinatarioFormacao>(
    `with pessoas as (${LISTA_DESTINATARIOS})
     select email, nome, telemovel from pessoas
     where $1 = '' or translate(lower(nome), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
       like '%' || translate(lower($1), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') || '%'
       or email ilike '%' || $1 || '%'
       or ($2 <> '' and regexp_replace(coalesce(telemovel, ''), '[^0-9]', '', 'g') like '%' || $2 || '%')
     order by lower(nome), email limit 51 offset $3`,
    [texto, digitos, (pagina - 1) * 50],
  );
  return { pessoas: rows.slice(0, 50), temMais: rows.length > 50, pagina };
}

export async function obterDestinatariosFormacao(emails: string[]): Promise<DestinatarioFormacao[]> {
  if (!emails.length) return [];
  const { rows } = await db().query<DestinatarioFormacao>(
    `with pessoas as (${LISTA_DESTINATARIOS})
     select email, nome, telemovel from pessoas where email = any($1::text[]) order by lower(nome), email`,
    [emails],
  );
  return rows;
}

export class DestinatariosInvalidos extends Error {}

export async function validarDestinatariosFormacao(
  valor: unknown, publicoParaLeads: boolean,
): Promise<string[] | null | undefined> {
  if (valor === undefined || valor === null) return valor;
  if (publicoParaLeads) throw new DestinatariosInvalidos("A seleção de pessoas só está disponível nas formações internas da equipa.");
  if (!Array.isArray(valor) || !valor.length || valor.length > 5000 ||
      valor.some(email => typeof email !== "string" || email.length > 254 || !email.includes("@"))) {
    throw new DestinatariosInvalidos("Seleciona pelo menos uma pessoa da lista.");
  }
  const emails = [...new Set((valor as string[]).map(email => email.trim().toLowerCase()))];
  const pessoas = await obterDestinatariosFormacao(emails);
  if (pessoas.length !== emails.length) {
    throw new DestinatariosInvalidos("Uma das pessoas selecionadas já não tem acesso ao painel. Revê a seleção.");
  }
  return emails;
}
