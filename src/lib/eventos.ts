import { db } from "./db";

/** Detalhes do evento "Teambuilding Tropa de Elite" — só existe este por agora, sem tabela própria. */
export const EVENTO_TITULO = "Teambuilding Tropa de Elite";
export const EVENTO_DATA_TEXTO = "14 de novembro de 2026";
export const EVENTO_LOCAL = "Fátima";
export const EVENTO_PRECO_ADULTO = 35;
export const EVENTO_PRECO_CRIANCA_MAIS10 = 17;

export function calcularTotalEvento(adultos: number, criancasMais10: number): number {
  return adultos * EVENTO_PRECO_ADULTO + criancasMais10 * EVENTO_PRECO_CRIANCA_MAIS10;
}

interface DadosInscricaoEvento {
  nome: string;
  telemovel: string;
  email: string;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  comprovativoBytes: Buffer;
  comprovativoNome: string;
  comprovativoTipo: string;
}

export async function registarInscricaoEvento(dados: DadosInscricaoEvento): Promise<string> {
  const total = calcularTotalEvento(dados.adultos, dados.criancasMais10);
  const { rows } = await db().query<{ id: string }>(
    `insert into evento_inscricoes
       (nome, telemovel, email, adultos, criancas_mais10, criancas_menos10,
        total_pagar, comprovativo, comprovativo_nome, comprovativo_tipo)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id`,
    [
      dados.nome,
      dados.telemovel,
      dados.email,
      dados.adultos,
      dados.criancasMais10,
      dados.criancasMenos10,
      total,
      dados.comprovativoBytes,
      dados.comprovativoNome,
      dados.comprovativoTipo,
    ],
  );
  return rows[0]!.id;
}

export interface InscricaoEvento {
  id: string;
  nome: string;
  telemovel: string;
  email: string;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  totalPagar: number;
  comprovativoNome: string | null;
  presente: boolean;
  presenteEm: Date | null;
  criadoEm: Date;
}

/** Sem os bytes do comprovativo — só o essencial para a tabela do admin. */
export async function listarInscricoesEvento(): Promise<InscricaoEvento[]> {
  const { rows } = await db().query<{
    id: string;
    nome: string;
    telemovel: string;
    email: string;
    adultos: number;
    criancas_mais10: number;
    criancas_menos10: number;
    total_pagar: string;
    comprovativo_nome: string | null;
    presente: boolean;
    presente_em: Date | null;
    criado_em: Date;
  }>(
    `select id, nome, telemovel, email, adultos, criancas_mais10, criancas_menos10,
            total_pagar, comprovativo_nome, presente, presente_em, criado_em
     from evento_inscricoes
     order by criado_em desc`,
  );
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    telemovel: r.telemovel,
    email: r.email,
    adultos: r.adultos,
    criancasMais10: r.criancas_mais10,
    criancasMenos10: r.criancas_menos10,
    totalPagar: Number(r.total_pagar),
    comprovativoNome: r.comprovativo_nome,
    presente: r.presente,
    presenteEm: r.presente_em,
    criadoEm: r.criado_em,
  }));
}

/**
 * Marca a presença ao ler o QR code do email de confirmação (ver
 * /api/eventos/checkin/[id]) — idempotente, para ler o mesmo código duas
 * vezes não ser um erro. Devolve o nome (para a página de confirmação) e se
 * já estava marcado antes desta chamada.
 */
export async function marcarPresencaEvento(
  id: string,
): Promise<{ nome: string; jaEstavaPresente: boolean } | undefined> {
  const { rows: antes } = await db().query<{ nome: string; presente: boolean }>(
    `select nome, presente from evento_inscricoes where id = $1`,
    [id],
  );
  const inscricao = antes[0];
  if (!inscricao) return undefined;

  if (!inscricao.presente) {
    await db().query(
      `update evento_inscricoes set presente = true, presente_em = now() where id = $1`,
      [id],
    );
  }
  return { nome: inscricao.nome, jaEstavaPresente: inscricao.presente };
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
