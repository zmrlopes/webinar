import { createHash } from "node:crypto";
import { db } from "./db";
import { analisarJornadaEquipa, type DetalheJornada, type PessoaJornada } from "./consultor-jornada-equipa";

/** A consulta percorre apenas a própria conta e a sua descendência atual, sem ciclos. */
export async function obterJornadaEquipa(email: string, detalhe: boolean): Promise<DetalheJornada | null> {
  const {rows} = await db().query<{email: string; upline_email: string | null; nome: string; nivel: string | null; pontos: string | null; estado: string; atualizado_em: Date | string | null; profundidade: number}>(
    `with recursive jornada_equipa as (
      select email, upline_email, nome, nivel, pontos, estado, atualizado_em, 0 as profundidade, array[email] as caminho
      from equipa_afiliados where email = $1
      union all
      select e.email, e.upline_email, e.nome, e.nivel, e.pontos, e.estado, e.atualizado_em, j.profundidade + 1, j.caminho || e.email
      from equipa_afiliados e join jornada_equipa j on e.upline_email = j.email
      where not (e.email = any(j.caminho))
    ) select email, upline_email, nome, nivel, pontos, estado, atualizado_em, profundidade from jornada_equipa`, [email],
  );
  const id = (conta: string) => createHash("sha256").update(conta).digest("hex").slice(0, 24);
  const pessoas: PessoaJornada[] = rows.map(r => {
    const p = r.pontos === null || String(r.pontos).trim() === "" ? NaN : Number(r.pontos);
    const instante = r.atualizado_em == null ? NaN : new Date(r.atualizado_em).getTime();
    return {id: id(r.email), pai: r.profundidade === 0 || !r.upline_email ? null : id(r.upline_email), nome: r.nome, nivel: r.nivel,
      pontos: Number.isFinite(p) && p >= 0 ? p : null, estado: r.estado, atualizadoEm: Number.isFinite(instante) ? new Date(instante).toISOString() : null};
  });
  const raiz = pessoas.find(p => p.id === id(email));
  return raiz ? analisarJornadaEquipa(raiz, pessoas, detalhe) : null;
}
