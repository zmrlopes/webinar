import type { CandidatoJornada, LinhaJornada } from "./consultor-jornada-equipa";
import type { CriterioJornada } from "./consultor-jornada";

export interface LinhaCaminho extends LinhaJornada {
  aDesenvolver: boolean;
  contavaPara: string | null;
}
export interface CaminhoJornada {
  id: string;
  titulo: string;
  passos: CandidatoJornada[];
  linhas: LinhaCaminho[];
  pontosEmFalta: number;
  requisitosEmFalta: number;
  vagasSemCandidato: number;
}
interface Opcao {
  linha: LinhaJornada;
  objetivo: string;
  representante: NonNullable<LinhaJornada["representante"]>;
  candidato: CandidatoJornada | null;
}
const faltaEstrutura = (c: CandidatoJornada) => c.criteriosEmFalta.reduce((s, r) => s + r.quantidade, 0);
const compararCandidatos = (a: CandidatoJornada, b: CandidatoJornada) => faltaEstrutura(a) - faltaEstrutura(b) || a.faltamPontos - b.faltamPontos || a.nome.localeCompare(b.nome, "pt-PT") || a.id.localeCompare(b.id);
const assinatura = (c: CaminhoJornada) => c.linhas.map(l => `${l.id}:${l.contaPara}:${l.representante?.nome}`).sort().join("|");
const compararCaminhos = (a: CaminhoJornada, b: CaminhoJornada) => a.vagasSemCandidato - b.vagasSemCandidato || a.requisitosEmFalta - b.requisitosEmFalta || a.pontosEmFalta - b.pontosEmFalta || a.passos.length - b.passos.length || assinatura(a).localeCompare(assinatura(b));

/** Atribuição de custo mínimo: cada coluna (linha direta) ocupa uma só vaga.
 * Colunas vazias permitem representar faltas sem inventar pessoas ou pontos.
 * Algoritmo húngaro retangular, O(vagas² × linhas), no máximo 25 vagas. */
function atribuir(custos: number[][]): number[] {
  const n = custos.length, m = custos[0]?.length ?? 0;
  const u = Array<number>(n + 1).fill(0), v = Array<number>(m + 1).fill(0);
  const p = Array<number>(m + 1).fill(0), caminho = Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const min = Array<number>(m + 1).fill(Infinity), usada = Array<boolean>(m + 1).fill(false);
    do {
      usada[j0] = true;
      const i0 = p[j0]!;
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) if (!usada[j]) {
        const custo = custos[i0 - 1]![j - 1]! - u[i0]! - v[j]!;
        if (custo < min[j]!) {min[j] = custo; caminho[j] = j0;}
        if (min[j]! < delta) {delta = min[j]!; j1 = j;}
      }
      for (let j = 0; j <= m; j++) {
        if (usada[j]) {u[p[j]!] = u[p[j]!]! + delta; v[j] = v[j]! - delta;}
        else min[j] = min[j]! - delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {const j1 = caminho[j0]!; p[j0] = p[j1]!; j0 = j1;} while (j0 !== 0);
  }
  const colunas = Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]! > 0) colunas[p[j]! - 1] = j - 1;
  return colunas;
}

/** Compara preservar a distribuição atual com redistribuir as vagas entre linhas.
 * Os défices dos candidatos são estimativas independentes, não pontos do titular. */
export function compararCaminhosJornada(
  requisitos: CriterioJornada[], linhasAtuais: LinhaJornada[],
  qualificadas: {linhaId: string; objetivo: string; representante: NonNullable<LinhaJornada["representante"]>}[],
  candidatos: CandidatoJornada[], planoAtual: CandidatoJornada[],
): CaminhoJornada[] {
  const vagas = requisitos.flatMap(r => Array<string>(r.necessarios).fill(r.patamar));
  if (!vagas.length) return [];
  const linhas = [...linhasAtuais].sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT") || a.id.localeCompare(b.id));
  const opcoes = new Map<string, Opcao>();
  const chave = (id: string, objetivo: string) => `${id}:${objetivo}`;
  const porId = new Map(linhas.map(l => [l.id, l]));
  for (const q of qualificadas) {
    const linha = porId.get(q.linhaId);
    if (linha) opcoes.set(chave(linha.id, q.objetivo), {linha, objetivo: q.objetivo, representante: q.representante, candidato: null});
  }
  for (const candidato of [...candidatos].sort(compararCandidatos)) {
    const linha = porId.get(candidato.linhaId), k = chave(candidato.linhaId, candidato.objetivo);
    if (linha && !opcoes.has(k)) opcoes.set(k, {linha, objetivo: candidato.objetivo,
      representante: {nome: candidato.nome, patamar: candidato.objetivo}, candidato});
  }
  const resumir = (escolhidas: Opcao[], id: string, titulo: string): CaminhoJornada => {
    const passos = escolhidas.flatMap(o => o.candidato ? [o.candidato] : []);
    return {id, titulo, passos,
      linhas: escolhidas.map(o => ({...o.linha, contaPara: o.objetivo, representante: o.representante,
        aDesenvolver: !!o.candidato, contavaPara: o.linha.contaPara})),
      pontosEmFalta: Math.round(passos.reduce((s, c) => s + c.faltamPontos, 0) * 100) / 100,
      requisitosEmFalta: passos.reduce((s, c) => s + faltaEstrutura(c), 0),
      vagasSemCandidato: vagas.length - escolhidas.length};
  };
  const manter = resumir([
    ...linhas.filter(l => l.contaPara && l.representante).map(l => ({linha: l, objetivo: l.contaPara!, representante: l.representante!, candidato: null})),
    ...planoAtual.map(c => ({linha: porId.get(c.linhaId)!, objetivo: c.objetivo, representante: {nome: c.nome, patamar: c.objetivo}, candidato: c})),
  ], "manter", "Manter as linhas que já contam");
  // Custos inteiros: vagas preenchidas, menos requisitos de equipa por cumprir,
  // menos pontos individuais em falta, menos pessoas a desenvolver (por esta ordem).
  const fatorPontos = vagas.length + 1;
  const maxPontos = [...opcoes.values()].reduce((max, o) => Math.max(max, Math.round((o.candidato?.faltamPontos ?? 0) * 100)), 0);
  const fatorEstrutura = (vagas.length * maxPontos + 1) * fatorPontos;
  const custo = (o: Opcao) => o.candidato ? faltaEstrutura(o.candidato) * fatorEstrutura + Math.round(o.candidato.faltamPontos * 100) * fatorPontos + 1 : 0;
  const vazio = vagas.length * [...opcoes.values()].reduce((max, o) => Math.max(max, custo(o)), 1) + 1;
  const resolver = (excluir?: string) => {
    const custos = vagas.map(objetivo => [...linhas.map(l => {
      const k = chave(l.id, objetivo), opcao = opcoes.get(k);
      return opcao && k !== excluir ? custo(opcao) : vazio * 2;
    }), ...Array<number>(vagas.length).fill(vazio)]);
    const colunas = atribuir(custos);
    return resumir(colunas.flatMap((coluna, i) => {
      const linha = linhas[coluna];
      const opcao = linha ? opcoes.get(chave(linha.id, vagas[i]!)) : undefined;
      return opcao && chave(linha!.id, vagas[i]!) !== excluir ? [opcao] : [];
    }), "reorganizar", "Redistribuir as linhas");
  };
  const melhor = resolver();
  const opcoesComparacao = [manter, melhor];
  // Até três desvios do primeiro caminho produzem alternativas úteis sem enumerar
  // combinações exponenciais nem mudar a contagem de patamares registados.
  for (const passo of melhor.passos.slice(0, 3)) {
    const alternativa = resolver(chave(passo.linhaId, passo.objetivo));
    alternativa.id = `alternativa-${passo.linhaId}-${passo.objetivo}`;
    alternativa.titulo = "Outro caminho possível";
    opcoesComparacao.push(alternativa);
  }
  const unicas = new Map<string, CaminhoJornada>();
  for (const c of opcoesComparacao) if (!unicas.has(assinatura(c))) unicas.set(assinatura(c), c);
  const ordenadas = [...unicas.values()].sort(compararCaminhos);
  const selecionadas = ordenadas.slice(0, 3);
  if (!selecionadas.includes(manter) && unicas.get(assinatura(manter)) === manter) selecionadas[selecionadas.length - 1] = manter;
  return selecionadas;
}
