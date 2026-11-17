import { calcularJornadaConsultor, type CriterioJornada, type EstruturaJornada, type JornadaConsultor } from "./consultor-jornada";
import { CRITERIOS_LINHAS, ESCADA_PATAMARES, indicePatamar } from "./patamares-carreira";

export interface PessoaJornada {
  id: string; pai: string | null; nome: string; nivel: string | null;
  pontos: number | null; estado: string; atualizadoEm: string | null;
}
export interface LinhaJornada {
  id: string; nome: string; contaPara: string | null;
  representante: {nome: string; patamar: string} | null;
}
export interface CandidatoJornada {
  id: string; nome: string; patamarAtual: string; linhaId: string; linhaNome: string;
  objetivo: string; pontos: number; metaPontos: number; faltamPontos: number;
  criteriosEmFalta: {patamar: string; quantidade: number}[];
  perto: boolean; distancia: number; estado: string; atualizadoEm: string | null;
}
export interface DetalheJornada {
  jornada: JornadaConsultor;
  linhas: LinhaJornada[];
  plano: CandidatoJornada[];
  proximos: CandidatoJornada[];
  linhasPorCriar: number;
  semPontos: number;
  semPatamar: number;
}

function arvore(pessoas: PessoaJornada[]) {
  const filhos = new Map<string, PessoaJornada[]>();
  for (const pessoa of pessoas) if (pessoa.pai !== null && pessoa.id !== pessoa.pai) filhos.set(pessoa.pai, [...(filhos.get(pessoa.pai) ?? []), pessoa]);
  const linhas = (raiz: string) => (filhos.get(raiz) ?? []).filter(p => p.id !== raiz).map(p => {
    const visitados = new Set([raiz]), membros: PessoaJornada[] = [], fila = [p];
    for (let i = 0; i < fila.length; i++) {
      const atual = fila[i]!;
      if (visitados.has(atual.id)) continue;
      visitados.add(atual.id); membros.push(atual); fila.push(...(filhos.get(atual.id) ?? []));
    }
    return {pessoa: p, membros};
  });
  return {linhas};
}

/** Qualificações superiores incluem as anteriores. Uma linha ocupa apenas uma vaga. */
function distribuir(raiz: string, objetivo: string, arv: ReturnType<typeof arvore>) {
  const regras = CRITERIOS_LINHAS[objetivo] ?? [], linhas = arv.linhas(raiz);
  const utilizadas = new Map<string, {patamar: string; pessoa: PessoaJornada}>();
  const requisitos: CriterioJornada[] = [];
  for (const regra of regras) {
    const indice = indicePatamar(regra.patamar);
    const aptas = linhas.filter(l => !utilizadas.has(l.pessoa.id)).map(l => ({linha: l, pessoa: l.membros
      .filter(p => indicePatamar(p.nivel) >= indice)
      .sort((a, b) => indicePatamar(b.nivel) - indicePatamar(a.nivel) || (b.pontos ?? -1) - (a.pontos ?? -1) || a.nome.localeCompare(b.nome, "pt-PT"))[0]}))
      .filter((l): l is typeof l & {pessoa: PessoaJornada} => !!l.pessoa)
      .sort((a, b) => indicePatamar(b.pessoa.nivel) - indicePatamar(a.pessoa.nivel) || (a.pessoa.pontos ?? -1) - (b.pessoa.pontos ?? -1) || a.linha.pessoa.nome.localeCompare(b.linha.pessoa.nome, "pt-PT"));
    for (const apta of aptas.slice(0, regra.quantidade)) utilizadas.set(apta.linha.pessoa.id, {patamar: regra.patamar, pessoa: apta.pessoa});
    const cumpridos = Math.min(regra.quantidade, aptas.length);
    requisitos.push({patamar: regra.patamar, necessarios: regra.quantidade, cumpridos, faltam: regra.quantidade - cumpridos});
  }
  return {linhas, utilizadas, requisitos};
}

export function analisarJornadaEquipa(raiz: PessoaJornada, pessoas: PessoaJornada[], incluirCandidatos = true): DetalheJornada {
  const jornada = calcularJornadaConsultor(raiz.nivel, raiz.pontos, raiz.atualizadoEm);
  const vazio: DetalheJornada = {jornada, linhas: [], plano: [], proximos: [], linhasPorCriar: 0, semPontos: 0, semPatamar: 0};
  if (!jornada.proximoPatamar || !CRITERIOS_LINHAS[jornada.proximoPatamar]) return vazio;
  const arv = arvore(pessoas), {linhas, utilizadas, requisitos} = distribuir(raiz.id, jornada.proximoPatamar, arv);
  const membros = [...new Map(linhas.flatMap(l => l.membros).map(p => [p.id, p])).values()];
  const datas = [raiz, ...membros].map(p => p.atualizadoEm).filter((d): d is string => !!d && Number.isFinite(Date.parse(d))).sort();
  const total = requisitos.reduce((s, r) => s + r.necessarios, 0), cumpridos = utilizadas.size;
  const estrutura: EstruturaJornada = {estado: "pronto", requisitos, linhasNecessarias: total, linhasCumpridas: cumpridos,
    faltamLinhas: total - cumpridos, semPatamar: membros.filter(p => indicePatamar(p.nivel) < 0).length, atualizadoEm: datas[0] ?? null};
  jornada.estrutura = estrutura;
  const resultado: DetalheJornada = {...vazio, jornada, semPontos: membros.filter(p => p.pontos === null).length, semPatamar: estrutura.semPatamar,
    linhas: linhas.map(l => {
      const usada = utilizadas.get(l.pessoa.id);
      return {id: l.pessoa.id, nome: l.pessoa.nome, contaPara: usada?.patamar ?? null,
        representante: usada ? {nome: usada.pessoa.nome, patamar: ESCADA_PATAMARES[indicePatamar(usada.pessoa.nivel)]!.nome} : null};
    })};
  if (!incluirCandidatos || !estrutura.faltamLinhas) return resultado;
  const candidatos: CandidatoJornada[] = [];
  for (const requisito of requisitos.filter(r => r.faltam! > 0)) {
    const alvo = indicePatamar(requisito.patamar), meta = ESCADA_PATAMARES[alvo]!.pontos;
    for (const linha of linhas.filter(l => !utilizadas.has(l.pessoa.id))) for (const pessoa of linha.membros) {
      const atual = indicePatamar(pessoa.nivel);
      if (atual < 0 || atual >= alvo || pessoa.pontos === null || !Number.isFinite(pessoa.pontos) || pessoa.pontos < 0) continue;
      const faltamPontos = Math.max(0, Math.round((meta - pessoa.pontos) * 100) / 100);
      const apoio = distribuir(pessoa.id, requisito.patamar, arv).requisitos;
      const criteriosEmFalta = apoio.filter(r => r.faltam! > 0).map(r => ({patamar: r.patamar, quantidade: r.faltam!}));
      const distancia = faltamPontos / meta + apoio.reduce((s, r) => s + r.faltam!, 0) / Math.max(1, apoio.reduce((s, r) => s + r.necessarios, 0));
      candidatos.push({id: pessoa.id, nome: pessoa.nome, patamarAtual: ESCADA_PATAMARES[atual]!.nome, linhaId: linha.pessoa.id, linhaNome: linha.pessoa.nome,
        objetivo: requisito.patamar, pontos: pessoa.pontos, metaPontos: meta, faltamPontos, criteriosEmFalta,
        perto: faltamPontos / (meta - ESCADA_PATAMARES[atual]!.pontos) <= .15 || (alvo === 2 && faltamPontos <= 3),
        distancia, estado: pessoa.estado, atualizadoEm: pessoa.atualizadoEm});
    }
  }
  candidatos.sort((a, b) => a.distancia - b.distancia || a.faltamPontos - b.faltamPontos || a.nome.localeCompare(b.nome, "pt-PT"));
  const escolhidas = new Set<string>();
  for (const requisito of requisitos) {
    const opcoes = candidatos.filter(c => c.objetivo === requisito.patamar && !escolhidas.has(c.linhaId));
    let vagas = requisito.faltam!;
    for (const candidato of opcoes) if (vagas && !escolhidas.has(candidato.linhaId)) {
      resultado.plano.push(candidato); escolhidas.add(candidato.linhaId); vagas--;
    }
  }
  resultado.proximos = candidatos.filter(c => c.perto);
  resultado.linhasPorCriar = Math.max(0, total - linhas.length);
  return resultado;
}
