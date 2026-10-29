import { indexarMembrosCore, type DadosCoreDiretos, type MembroCoreDiretos } from "./core-rank-diretos";

export type GrupoCore = NonNullable<DadosCoreDiretos["grupo"]>;
const chave = (s: string) => s.trim().toLowerCase();

export function associarMembroCoreEmail(dados: DadosCoreDiretos, membros: MembroCoreDiretos[], indice: number, nome: string, email: string): DadosCoreDiretos {
  const participante = dados.grupo?.membros[indice];
  if (!participante || participante.nome !== nome || participante.username) throw new Error("Este membro já foi associado ou a lista mudou. Atualiza a página.");
  const encontrados = membros.filter(m => chave(m.email) === chave(email));
  if (encontrados.length !== 1) throw new Error("O email não identifica uma única conta na exportação. Confirma o email ou atualiza o Excel da árvore completa.");
  const grupo = { ...dados.grupo!, membros: dados.grupo!.membros.map((m, i) => i === indice ? { nome: m.nome, username: encontrados[0]!.username } : m) };
  const resultado = construirCoreGrupo(membros, grupo, dados.desde, dados.ate, dados.fonte, dados.atualizadoEm);
  resultado.consultores = resultado.consultores.map(c => ({ ...c, verificacaoCore: dados.consultores.find(a => chave(a.username) === chave(c.username))?.verificacaoCore }));
  return resultado;
}

/** A correspondência é confirmada por identidade, nunca inferida por semelhança de nomes. */
export function construirCoreGrupo(membros: MembroCoreDiretos[], grupo: GrupoCore, desde: string, ate: string, fonte: string, atualizadoEm = new Date().toISOString()): DadosCoreDiretos {
  const porUsername = indexarMembrosCore(membros, desde, ate);
  const associados = new Map<string, { membro: MembroCoreDiretos; nomes: string[] }>();
  const participantes = grupo.membros.map(p => {
    const membro = p.username ? porUsername.get(chave(p.username)) : undefined;
    if (p.username && !membro) throw new Error(`A exportação não contém a conta confirmada «${p.username}». Exporta a árvore completa para manter a lista do grupo.`);
    if (!membro) return { ...p, username: null, motivo: p.motivo ?? "Sem correspondência confirmada no MyOffice." };
    const u = chave(membro.username);
    const existente = associados.get(u);
    if (existente) existente.nomes.push(p.nome);
    else associados.set(u, { membro, nomes: [p.nome] });
    return { nome: p.nome, username: membro.username };
  });
  const consultores = [...associados.values()].map(({ membro: m, nomes }) => ({
    ...m, conta: porUsername.get(chave(m.upline))?.email ?? "", nomesWhatsapp: nomes,
    // Os novos diretos de um participante contam, mesmo sem estarem no grupo.
    novos: membros.filter(n => chave(n.upline) === chave(m.username) && n.entrada !== null && n.entrada >= desde && n.entrada <= ate),
  }));
  const pais = new Set(consultores.map(c => chave(c.upline)));
  const contas = membros.filter(m => pais.has(chave(m.username))).map(({ email, nome, username }) => ({ email, nome, username }));
  return { desde, ate, fonte, atualizadoEm, contas, consultores, grupo: { ...grupo, membros: participantes } };
}
