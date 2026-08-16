import { db } from "./db.js";

export class DadosInvalidos extends Error {}

export interface DadosInscricao {
  webinarId: string;
  nome: string;
  apelido?: string;
  email: string;
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
  const email = dados.email.trim().toLowerCase();

  if (!nome) throw new DadosInvalidos("nome em falta");
  if (!validarEmail(email)) throw new DadosInvalidos("email inválido");

  const { rows } = await db().query<{ id: string }>(
    `insert into registrations (webinar_id, nome, apelido, email)
     values ($1, $2, $3, $4)
     returning id`,
    [dados.webinarId, nome, dados.apelido?.trim() ?? "", email],
  );

  const linha = rows[0];
  if (!linha) throw new Error("inscrição não gravada");
  return { registrationId: linha.id };
}
