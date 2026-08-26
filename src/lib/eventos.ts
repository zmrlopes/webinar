import { db } from "./db";

/** Detalhes do evento "Teambuilding Tropa de Elite" — só existe este por agora, sem tabela própria. */
export const EVENTO_TITULO = "Teambuilding Tropa de Elite";
export const EVENTO_DATA_TEXTO = "14 de novembro de 2026";
export const EVENTO_LOCAL = "Fátima";
export const EVENTO_PRECO_ADULTO = 35;
export const EVENTO_PRECO_CRIANCA_MAIS10 = 17;

export const EVENTO_ORGANIZACOES = [
  "Sara e Zé",
  "Ana Custódia",
  "Lara Rodrigues",
  "Ludmila",
] as const;

export type OrganizacaoEvento = (typeof EVENTO_ORGANIZACOES)[number];

export function organizacaoEventoValida(valor: unknown): valor is OrganizacaoEvento {
  return typeof valor === "string" && (EVENTO_ORGANIZACOES as readonly string[]).includes(valor);
}

export function calcularTotalEvento(adultos: number, criancasMais10: number): number {
  return adultos * EVENTO_PRECO_ADULTO + criancasMais10 * EVENTO_PRECO_CRIANCA_MAIS10;
}

interface DadosInscricaoEvento {
  nome: string;
  telemovel: string;
  email: string;
  organizacao: OrganizacaoEvento;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  comprovativoBytes: Buffer;
  comprovativoNome: string;
  comprovativoTipo: string;
}

export async function registarInscricaoEvento(dados: DadosInscricaoEvento): Promise<void> {
  const total = calcularTotalEvento(dados.adultos, dados.criancasMais10);
  await db().query(
    `insert into evento_inscricoes
       (nome, telemovel, email, organizacao, adultos, criancas_mais10, criancas_menos10,
        total_pagar, comprovativo, comprovativo_nome, comprovativo_tipo)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      dados.nome,
      dados.telemovel,
      dados.email,
      dados.organizacao,
      dados.adultos,
      dados.criancasMais10,
      dados.criancasMenos10,
      total,
      dados.comprovativoBytes,
      dados.comprovativoNome,
      dados.comprovativoTipo,
    ],
  );
}

export interface InscricaoEvento {
  id: string;
  nome: string;
  telemovel: string;
  email: string;
  organizacao: string;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  totalPagar: number;
  comprovativoNome: string | null;
  criadoEm: Date;
}

/** Sem os bytes do comprovativo — só o essencial para a tabela do admin. */
export async function listarInscricoesEvento(): Promise<InscricaoEvento[]> {
  const { rows } = await db().query<{
    id: string;
    nome: string;
    telemovel: string;
    email: string;
    organizacao: string;
    adultos: number;
    criancas_mais10: number;
    criancas_menos10: number;
    total_pagar: string;
    comprovativo_nome: string | null;
    criado_em: Date;
  }>(
    `select id, nome, telemovel, email, organizacao, adultos, criancas_mais10, criancas_menos10,
            total_pagar, comprovativo_nome, criado_em
     from evento_inscricoes
     order by criado_em desc`,
  );
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    organizacao: r.organizacao,
    adultos: r.adultos,
    criancasMais10: r.criancas_mais10,
    criancasMenos10: r.criancas_menos10,
    totalPagar: Number(r.total_pagar),
    comprovativoNome: r.comprovativo_nome,
    criadoEm: r.criado_em,
  }));
}

export async function buscarComprovativoEvento(
  id: string,
): Promise<{ bytes: Buffer; nome: string; tipo: string } | undefined> {
  const { rows } = await db().query<{
    comprovativo: Buffer;
    comprovativo_nome: string | null;
    comprovativo_tipo: string | null;
  }>(
    `select comprovativo, comprovativo_nome, comprovativo_tipo from evento_inscricoes where id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    bytes: r.comprovativo,
    nome: r.comprovativo_nome ?? "comprovativo",
    tipo: r.comprovativo_tipo ?? "application/octet-stream",
  };
}
