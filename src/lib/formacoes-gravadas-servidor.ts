import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";
import { CATEGORIAS_FORMACOES, formacoesGravadasPublicadas, type Categoria } from "./formacoes-gravadas";
import { normalizarLinkGravacao } from "./formacoes-links";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import { SQL_AVISO_GRAVACAO } from "./formacoes-gravadas-notificacoes";

const PREFIXO = "formacoes-gravadas:v1:";
export interface GravacaoAdmin {
  id: string; titulo: string; link: string; categoria: string; origem: "tropa-elite" | "icligo";
  curso: string; modulo: string; data: string; min: number | null; formador: string; visivel: boolean;
}
export class ErroGravacao extends Error {
  constructor(mensagem: string, public status = 400) {super(mensagem);}
}
function campo(valor: unknown, nome: string, max: number, obrigatorio = true): string {
  if (typeof valor !== "string" || valor.trim().length > max || (obrigatorio && !valor.trim())) throw new ErroGravacao(`Preenche ${nome} (máximo ${max} caracteres).`);
  return valor.trim();
}
function idValido(id: unknown): id is string {return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);}
export function validarGravacao(valor: unknown): Omit<GravacaoAdmin, "id"> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErroGravacao("Dados inválidos.");
  const v = valor as Record<string, unknown>;
  const categoria = CATEGORIAS_FORMACOES.find(c => c.id === v.categoria && c.disponivel);
  if (!categoria) throw new ErroGravacao("Escolhe uma categoria disponível.");
  if (v.origem !== "tropa-elite" && v.origem !== "icligo") throw new ErroGravacao("Escolhe Tropa de Elite ou iCliGo.");
  let link: string;
  try {link = normalizarLinkGravacao(v.link).url;} catch (erro) {throw new ErroGravacao((erro as Error).message);}
  const data = campo(v.data, "a data", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data)) || new Date(data).toISOString().slice(0, 10) !== data) throw new ErroGravacao("Indica uma data válida.");
  const min = v.min === undefined || v.min === null ? null : v.min;
  if (min !== null && (typeof min !== "number" || !Number.isInteger(min) || min < 1 || min > 1440)) throw new ErroGravacao("A duração deve ser um número inteiro entre 1 e 1440 minutos.");
  if (v.visivel !== undefined && typeof v.visivel !== "boolean") throw new ErroGravacao("Visibilidade inválida.");
  return {titulo: campo(v.titulo, "o título", 200), link, categoria: categoria.id, origem: v.origem,
    curso: campo(v.curso, "o curso", 160), modulo: campo(v.modulo, "o módulo", 160), data,
    min: min as number | null, formador: campo(v.formador ?? "", "o formador", 160, false), visivel: v.visivel !== false};
}
export async function listarGravacoesAdmin(): Promise<GravacaoAdmin[]> {
  const {rows} = await db().query<{valor: GravacaoAdmin}>(
    "select valor from dashboard_config where starts_with(chave, $1) order by valor->>'data' desc, atualizado_em desc", [PREFIXO],
  );
  return rows.map(r => r.valor);
}
export async function guardarGravacaoAdmin(valor: unknown): Promise<GravacaoAdmin> {
  const dados = validarGravacao(valor), idRecebido = (valor as Record<string, unknown>).id;
  if (idRecebido !== undefined && !idValido(idRecebido)) throw new ErroGravacao("Gravação inválida.");
  const id = (idRecebido as string | undefined) ?? randomUUID();
  const gravacao = {...dados, id};
  const parametros = [PREFIXO + id, JSON.stringify(gravacao), "gravacao-aviso:v1:" + id, EMAIL_PAINEL_DEMONSTRACAO, formacoesGravadasPublicadas()];
  if (idRecebido) {
    const {rows} = await db().query(`with anterior as materialized (
        select valor from dashboard_config where chave = $1 for update
      ), gravacao as (
        update dashboard_config d set valor = $2::jsonb, atualizado_em = now() from anterior a
        where d.chave = $1 returning d.valor,
          ((d.valor->>'visivel')::boolean and not (a.valor->>'visivel')::boolean) as avisar
      ) ${SQL_AVISO_GRAVACAO}`, parametros);
    if (!rows.length) throw new ErroGravacao("Esta gravação já não existe. Atualiza a página.", 404);
  } else {
    await db().query(`with gravacao as (
      insert into dashboard_config (chave, valor) values ($1, $2::jsonb)
      returning valor, (valor->>'visivel')::boolean as avisar
    ) ${SQL_AVISO_GRAVACAO}`, parametros);
  }
  return gravacao;
}
export async function apagarGravacaoAdmin(id: unknown): Promise<void> {
  if (!idValido(id)) throw new ErroGravacao("Gravação inválida.");
  const {rowCount} = await db().query("delete from dashboard_config where chave = $1", [PREFIXO + id]);
  if (!rowCount) throw new ErroGravacao("Esta gravação já não existe.", 404);
}

const comparar = (a: string, b: string) => a.localeCompare(b, "pt", {sensitivity: "base"}) === 0;
/** Acrescenta as gravações publicadas sem alterar o catálogo ou o progresso existentes. */
export function juntarGravacoes(catalogo: Categoria[], gravacoes: GravacaoAdmin[]): Categoria[] {
  const categorias = structuredClone(catalogo);
  for (const gravacao of gravacoes) {
    if (!gravacao.visivel) continue;
    const categoria = categorias.find(c => c.id === gravacao.categoria && c.disponivel);
    if (!categoria) continue;
    const cursos = gravacao.origem === "icligo" ? categoria.icligo.cursos : categoria.cursos;
    let curso = cursos.find(c => comparar(c.titulo, gravacao.curso));
    if (!curso) {
      const chave = [categoria.id, gravacao.origem, gravacao.curso.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()].join(":");
      curso = {id: "gravadas-" + createHash("sha256").update(chave).digest("hex").slice(0, 16), titulo: gravacao.curso, descricao: "Gravações adicionadas pela equipa.", modulos: []};
      cursos.push(curso);
    }
    let modulo = curso.modulos.find(m => comparar(m.titulo, gravacao.modulo));
    if (!modulo) {modulo = {titulo: gravacao.modulo, aulas: []}; curso.modulos.push(modulo);}
    modulo.aulas.push({id: `gravada-${gravacao.id}`, titulo: gravacao.titulo, youtube: normalizarLinkGravacao(gravacao.link).youtube,
      url: gravacao.link, min: gravacao.min, data: gravacao.data, ...(gravacao.formador ? {formador: gravacao.formador} : {})});
  }
  return categorias;
}
export async function carregarCategoriasGravadas(): Promise<Categoria[]> {
  return juntarGravacoes(CATEGORIAS_FORMACOES, await listarGravacoesAdmin());
}
