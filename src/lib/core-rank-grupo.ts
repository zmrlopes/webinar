import { indexarMembrosCore, type DadosCoreDiretos, type MembroCoreDiretos } from "./core-rank-diretos";

export type GrupoCore = NonNullable<DadosCoreDiretos["grupo"]>;
const chave = (s: string) => s.trim().toLowerCase();

export function associarMembroCoreEmail(dados: DadosCoreDiretos, membros: MembroCoreDiretos[], indice: number, nome: string, email: string): DadosCoreDiretos {
  indexarMembrosCore(membros, dados.desde, dados.ate);
  const encontrados = membros.filter(m => chave(m.email) === chave(email));
  if (encontrados.length !== 1) throw new Error("O email não identifica uma única conta nos dados guardados. Confirma o email ou usa Atualizar dados.");
  const membro = encontrados[0]!;
  const resultado = associarIdentidadeCoreGrupo(dados, indice, nome, membro.username);
  if (resultado.consultores.some(c => chave(c.username) === chave(membro.username))) return resultado;
  // Associar uma conta não recalcula os cartões nem as verificações dos outros membros.
  const nomes = resultado.grupo!.membros.filter(m => m.username && chave(m.username) === chave(membro.username));
  const novo = construirCoreGrupo(membros, { ...resultado.grupo!, membros: nomes }, dados.desde, dados.ate, dados.fonte, dados.atualizadoEm);
  return { ...resultado, consultores: [...resultado.consultores, ...novo.consultores],
    contas: [...resultado.contas, ...novo.contas.filter(c => !resultado.contas.some(a => chave(a.username) === chave(c.username)))] };
}

/** Também permite repetir o mesmo envio depois de uma falha de rede. */
export function associarIdentidadeCoreGrupo(dados: DadosCoreDiretos, indice: number, nome: string, username: string): DadosCoreDiretos {
  const participante = dados.grupo?.membros[indice];
  if (!participante || participante.nome !== nome || (participante.username && chave(participante.username) !== chave(username))) {
    throw new Error("Este membro já foi associado ou a lista mudou. Atualiza a página.");
  }
  const grupo = { ...dados.grupo!, membros: dados.grupo!.membros.map((m, i) => i === indice ? { nome: m.nome, username } : m) };
  return { ...dados, grupo, consultores: dados.consultores.map(c => chave(c.username) === chave(username)
    ? { ...c, nomesWhatsapp: grupo.membros.filter(m => m.username && chave(m.username) === chave(username)).map(m => m.nome) } : c) };
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
