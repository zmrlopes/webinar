import { indexarMembrosCore, type DadosCoreDiretos, type MembroCoreDiretos } from "./core-rank-diretos";

export type GrupoCore = NonNullable<DadosCoreDiretos["grupo"]>;
const chave = (s: string) => s.trim().toLowerCase();

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
