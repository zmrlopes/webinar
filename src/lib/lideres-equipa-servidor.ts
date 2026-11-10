import { db } from "./db";
import { buscarDescendentesEmails } from "./equipa";
import { LIDERES_EQUIPA_BF } from "./lideres-equipa";

/** O líder e toda a sua descendência — o universo de participantes da sua variante do bingo. */
export async function equipaDoLider(liderEmail: string): Promise<string[]> {
  const email = liderEmail.trim().toLowerCase();
  return [email, ...await buscarDescendentesEmails(email)];
}

/** Para um TP qualquer: a quem deve a sua meta do bingo, se pertencer à equipa de algum líder configurado. */
export async function metaBfParaEmail(email: string): Promise<{ liderEmail: string; nome: string; meta: number } | null> {
  const alvo = email.trim().toLowerCase();
  for (const [liderEmail, config] of Object.entries(LIDERES_EQUIPA_BF)) {
    if ((await equipaDoLider(liderEmail)).includes(alvo)) return { liderEmail, nome: config.nome, meta: config.metaBingo };
  }
  return null;
}

export interface EstatisticasEquipa { total: number; ativos: number; entradasEsteAno: number }

/** Dimensão da equipa descendente de um líder, direto da tabela importada (sem pedir nada ao MyOffice). */
export async function estatisticasEquipa(liderEmail: string): Promise<EstatisticasEquipa> {
  const email = liderEmail.trim().toLowerCase();
  const ano = new Date().getFullYear();
  const { rows } = await db().query<{ total: string; ativos: string; entradas: string }>(
    `with recursive arvore as (
       select email from equipa_afiliados where lower(trim(email)) = $1
       union
       select e.email from equipa_afiliados e join arvore a on lower(trim(e.upline_email)) = lower(trim(a.email))
     )
     select count(*) filter(where lower(trim(e.email)) <> $1) as total,
       count(*) filter(where lower(trim(e.email)) <> $1 and e.estado = 'ACTIVE') as ativos,
       count(*) filter(where extract(year from e.data_registo) = $2 and lower(trim(e.email)) <> $1) as entradas
     from equipa_afiliados e join arvore a on a.email = e.email`,
    [email, ano],
  );
  return { total: Number(rows[0]?.total ?? 0), ativos: Number(rows[0]?.ativos ?? 0), entradasEsteAno: Number(rows[0]?.entradas ?? 0) };
}
