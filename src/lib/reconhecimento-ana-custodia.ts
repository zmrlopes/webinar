import { db } from "./db";

/** Apenas dados do admin; os valores pessoais nunca ficam escritos no código. */
export async function reconhecimentoAnaCustodia() {
  const email = "apensarnaproxima@gmail.com";
  const [perfil, configs, reservas, equipa] = await Promise.all([
    db().query("select nome,nivel,data_registo,atualizado_em from equipa_afiliados where lower(trim(email))=$1", [email]),
    db().query("select valor,atualizado_em from dashboard_config where chave='mapas'"),
    db().query("select corpo,recebido_em from dashboard_bruto where chave='reservas-2026'"),
    db().query(`with recursive arvore as (
      select email from equipa_afiliados where lower(trim(email))=$1
      union
      select e.email from equipa_afiliados e join arvore a on lower(trim(e.upline_email))=lower(trim(a.email))
    ) select count(*) filter(where lower(trim(e.email))<>$1) as total,
      count(*) filter(where lower(trim(e.email))<>$1 and e.estado='ACTIVE') as ativos,
      count(*) filter(where extract(year from e.data_registo)=2026 and lower(trim(e.email))<>$1) as entradas_2026,
      max(e.atualizado_em) as atualizado_em
      from equipa_afiliados e join arvore a on a.email=e.email`, [email]),
  ]);
  const mapas = configs.rows[0]?.valor;
  const linha = mapas?.years_recent?.at(-1) === 2026
    ? mapas.pat_linhas?.find((l: {u: string}) => l.u.toLowerCase() === "anaaritz") : null;
  const p = linha?.p, a = linha?.a;
  const validos = typeof p === "number" && typeof a === "number" && Number.isFinite(p) && Number.isFinite(a) && p >= a && a >= 0;
  const atuais = validos ? p as number : null, ano = validos ? a as number : null;
  const base = atuais !== null && ano !== null ? Math.round((atuais - ano) * 100) / 100 : null;
  const arvore = reservas.rows[0]?.corpo;
  const no = typeof arvore?.ate === "string" && arvore.ate.startsWith("2026-") ? arvore.nos?.find((n: {n: string}) =>
    n.n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() === "ana custodia") : null;
  return {
    perfil: perfil.rows[0] ?? null,
    pontos: {atuais, ano, base, crescimento: base !== null && base > 0 && ano !== null ? ano / base * 100 : null,
      pesoAno: atuais !== null && atuais > 0 && ano !== null ? ano / atuais * 100 : null,
      ate: mapas?.pat_ate ?? null},
    organizacao: {volume: typeof no?.v === "number" && Number.isFinite(no.v) ? no.v as number : null, ate: no ? arvore.ate as string : null,
      ativos: Number(equipa.rows[0]?.ativos ?? 0), total: Number(equipa.rows[0]?.total ?? 0),
      entradas2026: Number(equipa.rows[0]?.entradas_2026 ?? 0), atualizadoEm: equipa.rows[0]?.atualizado_em ?? null},
  };
}
