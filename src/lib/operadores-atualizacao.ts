import { CATALOGO_BASE, type CatalogoOperadores, type Operador, type Destino } from "./operadores-destinos";

export class ErroFAQ extends Error { constructor(message: string, public status = 400) { super(message); } }
const objeto = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ErroFAQ("Dados de FAQ inválidos.");
  return v as Record<string, unknown>;
};
function texto(v: unknown, max = 3000): string {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new ErroFAQ("Texto de FAQ vazio ou demasiado longo.");
  return v.trim();
}
function lista(v: unknown, max = 100): string[] {
  if (!Array.isArray(v) || v.length > max) throw new ErroFAQ("Lista de FAQ inválida.");
  return v.map(x => texto(x));
}
const temas = new Set(["fim-de-ano", "pascoa", "carnaval", "mercados-natal"]);
export function validarCatalogo(valor: unknown): CatalogoOperadores {
  const v = objeto(valor);
  if (!Array.isArray(v.destinos) || !v.destinos.length || v.destinos.length > 1000 || !Array.isArray(v.operadores)) throw new ErroFAQ("Catálogo incompleto.");
  const destinos: Destino[] = v.destinos.map(x => {
    const d = objeto(x), id = texto(d.id, 80);
    if (!/^[a-z0-9-]+$/.test(id) || (d.tema && !temas.has(String(d.tema)))) throw new ErroFAQ("Destino inválido.");
    return {id, nome: texto(d.nome, 180), pais: texto(d.pais, 180), grupos: lista(d.grupos),
      ...(d.termos ? {termos: lista(d.termos)} : {}), ...(d.abrange ? {abrange: texto(d.abrange, 180)} : {}), ...(d.tema ? {tema: d.tema as Destino["tema"]} : {})};
  });
  const ids = new Set(destinos.map(d => d.id));
  if (ids.size !== destinos.length) throw new ErroFAQ("Há destinos repetidos.");
  const operadores: Operador[] = v.operadores.map(x => {
    const o = objeto(x), base = CATALOGO_BASE.operadores.find(b => b.id === o.id);
    if (!base || o.nome !== base.nome || o.faq !== base.faq || typeof o.motor !== "boolean" || !Array.isArray(o.linhas) || o.linhas.length > 1000) throw new ErroFAQ("Operador inválido ou fonte alterada.");
    const linhas = o.linhas.map(x => {
      const l = objeto(x), destino = texto(l.destino, 80);
      if (!ids.has(destino)) throw new ErroFAQ("Uma linha refere um destino inexistente.");
      const linha: Operador["linhas"][number] = {destino};
      for (const c of ["bloco", "origem", "companhia", "dias", "periodo", "detalhe"] as const) if (l[c] != null && l[c] !== "") linha[c] = texto(l[c]);
      if (l.temas != null) {const t = lista(l.temas, 4); if (t.some(v => !temas.has(v))) throw new ErroFAQ("Tema inválido."); linha.temas = t as NonNullable<typeof linha.temas>;}
      return linha;
    });
    const todoOSite = o.todoOSite ? lista(o.todoOSite) : [];
    if (!linhas.length && !todoOSite.length) throw new ErroFAQ(`A FAQ de ${base.nome} não contém destinos utilizáveis. Mantém-se a versão anterior.`);
    return {id: base.id, nome: base.nome, faq: base.faq, motor: o.motor, sinal: texto(o.sinal, 200), atualizado: texto(o.atualizado, 80), resumo: texto(o.resumo), permitido: lista(o.permitido), proibido: lista(o.proibido), avisos: lista(o.avisos ?? []), todoOSite, linhas};
  });
  if (operadores.length !== CATALOGO_BASE.operadores.length || new Set(operadores.map(o => o.id)).size !== operadores.length) throw new ErroFAQ("É necessária uma recolha completa dos operadores.");
  const regras = lista(v.regras);
  if (!regras.length) throw new ErroFAQ("Faltam as regras gerais.");
  return {destinos, operadores, regras, revistoEm: texto(v.revistoEm, 80)};
}
export interface PaginaFAQ { url: string; texto: string; imagens: string[] }
export function validarPaginas(valor: unknown): PaginaFAQ[] {
  if (!Array.isArray(valor) || valor.length > 60) throw new ErroFAQ("Recolha inválida.");
  const paginas = valor.map(x => {
    const p = objeto(x), url = new URL(texto(p.url, 500));
    if (url.origin !== "https://help.icligo.com" || !url.pathname.startsWith("/suporte-operacional/operadores-turisticos") || url.search || url.hash) throw new ErroFAQ("Fonte não autorizada.");
    const t = texto(p.texto, 100000);
    if (t.length < 150 || /type=["']?password|iniciar sessão para|sign in to continue/i.test(t)) throw new ErroFAQ("Uma página não contém a FAQ. Confirma a sessão do Centro de Ajuda.");
    if (p.imagens !== undefined && (!Array.isArray(p.imagens) || p.imagens.length > 8)) throw new ErroFAQ("Demasiadas imagens na FAQ.");
    const imagens = ((p.imagens ?? []) as unknown[]).map(i => texto(i, 7000000));
    // Imagens são opcionais; só bytes são aceites, nunca URLs com sessões.
    if (imagens.some(i => !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(i))) throw new ErroFAQ("Imagem de FAQ inválida.");
    return {url: url.href.replace(/\/$/, ""), texto: t, imagens};
  });
  if (new Set(paginas.map(p => p.url)).size !== paginas.length || CATALOGO_BASE.operadores.some(o => !paginas.some(p => p.url === o.faq))) throw new ErroFAQ("Faltam FAQs de operadores. Nenhum dado foi publicado.");
  return paginas;
}
export function diferencasCatalogo(antes: CatalogoOperadores, depois: CatalogoOperadores) {
  const diferencas: {nome: string; antes: unknown; depois: unknown}[] = [];
  for (const o of depois.operadores) {
    const a = antes.operadores.find(x => x.id === o.id)!;
    for (const campo of ["motor", "sinal", "atualizado", "resumo", "permitido", "proibido", "avisos", "todoOSite", "linhas"] as const)
      if (JSON.stringify(a[campo] ?? []) !== JSON.stringify(o[campo] ?? [])) diferencas.push({nome: `${o.nome} · ${campo}`, antes: a[campo] ?? [], depois: o[campo] ?? []});
  }
  for (const campo of ["destinos", "regras"] as const) if (JSON.stringify(antes[campo]) !== JSON.stringify(depois[campo])) diferencas.push({nome: campo, antes: antes[campo], depois: depois[campo]});
  return diferencas;
}
