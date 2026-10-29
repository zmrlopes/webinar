export interface MembroCoreDiretos {
  nome: string;
  username: string;
  email: string;
  upline: string;
  estado: string;
  entrada: string | null;
  reservas: number;
  subscricoes: number;
}

export interface DadosCoreDiretos {
  desde: string;
  ate: string;
  atualizadoEm: string;
  fonte: string;
  contas: { email: string; nome: string; username: string }[];
  consultores: (MembroCoreDiretos & { conta: string; novos: MembroCoreDiretos[] })[];
}

const chave = (s: string) => s.trim().toLowerCase();

/** Só relações imediatas. As próprias contas agregadoras não são consultores do relatório. */
export function construirCoreDiretos(
  membros: MembroCoreDiretos[], emails: string[], desde: string, ate: string,
  fonte: string, atualizadoEm = new Date().toISOString(),
): DadosCoreDiretos {
  const dataValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
    && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!dataValida(desde) || !dataValida(ate) || desde > ate) throw new Error("O período não é válido.");
  // A coluna de reservas da exportação respeita o filtro escolhido no MyOffice.
  // Não é possível repartir esse volume por datas depois de exportar.
  const procurados = new Set(emails.map(chave));
  const unicos = new Map<string, MembroCoreDiretos>();
  for (const m of membros) {
    if (unicos.has(chave(m.username))) throw new Error("A exportação contém usernames repetidos.");
    unicos.set(chave(m.username), m);
  }
  const contas = membros.filter(m => procurados.has(chave(m.email)));
  if (contas.length !== procurados.size || !contas.length) throw new Error("A exportação não contém todas as contas indicadas.");
  const porUsername = new Map(contas.map(c => [chave(c.username), c]));
  const consultores = membros.filter(m => porUsername.has(chave(m.upline)) && !procurados.has(chave(m.email)))
    .map(m => ({
      ...m,
      conta: porUsername.get(chave(m.upline))!.email,
      novos: membros.filter(n => chave(n.upline) === chave(m.username) && n.entrada !== null && n.entrada >= desde && n.entrada <= ate),
    }));
  return { desde, ate, atualizadoEm, fonte, contas: contas.map(({ email, nome, username }) => ({ email, nome, username })), consultores };
}

export function progressoCoreDireto(c: DadosCoreDiretos["consultores"][number]) {
  const ativos = c.novos.filter(n => n.reservas >= 1000).length;
  return { novos: c.novos.length, ativos, reservasOk: c.reservas >= 3000,
    concluido: c.reservas >= 3000 && ativos >= 3 && c.novos.length >= 3 };
}
