export const MAX_PERGUNTA_ASSISTENTE = 1600;
export const MAX_HISTORICO_ASSISTENTE = 6;

export interface MensagemAssistente { papel: "utilizador" | "assistente"; texto: string }
export interface FonteAssistente {
  id: string;
  titulo: string;
  curso: string;
  tipo: "formacao" | "documento" | "orientacao";
  url: string | null;
}
export interface ConhecimentoAssistente extends FonteAssistente { conteudo: string }
export interface RespostaAssistente {
  resposta: string;
  passos: string[];
  exemplo: string | null;
  fontes: FonteAssistente[];
  semBase: boolean;
}

const IGNORAR = new Set("como para uma umas uns que quem qual quais quando onde porque por nao sim com sem dos das aos nas nos pelo pela pelos pelas isto isso esta este estas estes tenho tem temos quero queria posso pode podes podemos fazer faz mais menos muito minha meu meus minhas sua seu seus suas esse essa ser estar foi sao era sou estou depois antes sobre favor ajuda ajudar responde resposta explica explicar melhor ola obrigado obrigada tambem ainda agora hoje dia dias coisa coisas".split(" "));

export function termosAssistente(texto: string): string[] {
  const normal = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const originais = (texto.toLowerCase().match(/[\p{L}\p{N}]{3,}|\btps?\b/gu) ?? []).flatMap(p => {
    const semAcento = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return IGNORAR.has(semAcento) ? [] : [p, semAcento];
  });
  const grupos: [RegExp, string][] = [
    [/\btps?\b|primeir|comec|iniciante|novo consultor/, "arranque onboarding welcome partner primeiros"],
    [/contact|convid|convite|prospec/, "contactos convite prospeccao invitation prospect"],
    [/acompanh|responder|resposta|seguimento|follow/, "acompanhamento follow seguimento conversa"],
    [/orcament|cliente|vend|reserva/, "vendas cliente orcamento viagem"],
    [/equip|lider|duplic/, "lideranca equipa duplicacao team"],
    [/organiz|tempo|horario|rotina|objetiv/, "organizacao tempo objetivos planeamento"],
    [/cruzeir/, "cruzeiros cruzeiro cruise"],
    [/comiss|patamar|carreira|licenca/, "comissoes carreira negocio plano"],
  ];
  const extras = grupos.filter(([padrao]) => padrao.test(normal)).flatMap(([, termos]) => termos.split(" "));
  return [...new Set([...originais, ...extras])].slice(0, 36);
}

/** Dá prioridade aos termos específicos, em vez de deixar palavras genéricas dominar. */
export function ordenarConhecimentoAssistente(fontes: ConhecimentoAssistente[], consulta: string): ConhecimentoAssistente[] {
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const termos = [...new Set((normalizar(consulta).match(/[a-z0-9]{3,}/g) ?? []).filter(p => !IGNORAR.has(p)).map(p => p.length > 5 ? p.slice(0, -2) : p))].slice(0, 25);
  const preparados = fontes.map(f => ({ fonte: f, titulo: normalizar(f.titulo), corpo: normalizar(f.conteudo) }));
  const pesos = termos.map(t => ({ termo: t, peso: 1 + Math.log((fontes.length + 1) / (1 + preparados.filter(p => p.titulo.includes(t) || p.corpo.includes(t)).length)) }));
  return preparados.map((p, indice) => ({ fonte: p.fonte, indice, pontos: pesos.reduce((s, t) => s + t.peso * (p.titulo.includes(t.termo) ? 5 : p.corpo.includes(t.termo) ? 1 : 0), 0) }))
    .sort((a, b) => b.pontos - a.pontos || a.indice - b.indice).map(p => p.fonte);
}

export function validarPedidoAssistente(corpo: unknown): { pergunta: string; historico: MensagemAssistente[] } | null {
  if (!corpo || typeof corpo !== "object") return null;
  const valor = corpo as Record<string, unknown>;
  if (typeof valor.pergunta !== "string" || valor.pergunta.trim().length < 5 || valor.pergunta.length > MAX_PERGUNTA_ASSISTENTE) return null;
  const historico = valor.historico ?? [];
  if (!Array.isArray(historico) || historico.length > MAX_HISTORICO_ASSISTENTE) return null;
  if (!historico.every(m => m && typeof m === "object" && ["utilizador", "assistente"].includes(m.papel) && typeof m.texto === "string" && m.texto.length <= 4000)) return null;
  return { pergunta: valor.pergunta.trim(), historico: historico.map(m => ({ papel: m.papel, texto: m.texto.trim() })) };
}

export function respostaSemBase(): RespostaAssistente {
  return {
    resposta: "Não encontrei informação suficiente na base da equipa para responder a essa pergunta com segurança. Experimenta indicar o assunto com mais detalhe ou confirma-o com o teu upline.",
    passos: [], exemplo: null, fontes: [], semBase: true,
  };
}

function textoCurto(valor: unknown, max: number): string | null {
  return typeof valor === "string" && valor.trim() && valor.length <= max ? valor.trim() : null;
}

export function interpretarRespostaAssistente(texto: string, fontes: ConhecimentoAssistente[]): RespostaAssistente {
  const inicio = texto.indexOf("{"), fim = texto.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) throw new Error("Resposta do assistente inválida");
  const valor = JSON.parse(texto.slice(inicio, fim + 1)) as Record<string, unknown>;
  const resposta = textoCurto(valor.resposta, 3000);
  if (!resposta || typeof valor.semBase !== "boolean" || !Array.isArray(valor.fontes) || !Array.isArray(valor.passos)) throw new Error("Resposta do assistente incompleta");
  const usadas = [...new Set(valor.fontes.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= fontes.length))].slice(0, 6);
  if (valor.semBase || !usadas.length) return respostaSemBase();
  const passos = valor.passos.slice(0, 4).map(p => textoCurto(p, 600));
  if (passos.some(p => p === null)) throw new Error("Passos do assistente inválidos");
  const exemplo = valor.exemplo === null || valor.exemplo === undefined ? null : textoCurto(valor.exemplo, 1200);
  if (valor.exemplo && !exemplo) throw new Error("Exemplo do assistente inválido");
  return {
    resposta, passos: passos as string[], exemplo,
    fontes: usadas.map(n => { const { conteudo: _, ...fonte } = fontes[n - 1]!; return fonte; }), semBase: false,
  };
}

export function textoRespostaAssistente(resposta: RespostaAssistente): string {
  return [resposta.resposta, ...resposta.passos.map((p, i) => `${i + 1}. ${p}`), resposta.exemplo ? `Exemplo:\n${resposta.exemplo}` : ""].filter(Boolean).join("\n\n");
}
