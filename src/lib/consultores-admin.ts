import { db } from "./db";

export class ErroConsultorAdmin extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}

export interface NovoConsultor {
  nome: string;
  email: string;
}

export function validarNovoConsultor(valor: unknown): NovoConsultor {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErroConsultorAdmin("Indica o nome e o email do consultor.");
  const dados = valor as Record<string, unknown>;
  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
  if (!nome || nome.length > 200) throw new ErroConsultorAdmin("Indica um nome com até 200 caracteres.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) throw new ErroConsultorAdmin("Indica um email válido.");
  return {nome, email};
}

/** Liberta o acesso usado por todas as áreas do consultor, sem alterar membros existentes. */
export async function adicionarConsultorAdmin(valor: unknown): Promise<NovoConsultor> {
  const consultor = validarNovoConsultor(valor);
  const { rows } = await db().query<NovoConsultor>(
    `insert into equipa_afiliados (email, nome, estado)
     values ($1, $2, 'ACTIVE')
     on conflict (email) do nothing
     returning nome, email`,
    [consultor.email, consultor.nome],
  );
  if (!rows[0]) throw new ErroConsultorAdmin("Este email já está registado na equipa e já pode entrar na área de consultor.", 409);
  return rows[0];
}
