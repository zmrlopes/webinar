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
  grupo?: { nome: string; consultadoEm: string; membros: { nome: string; username: string | null; motivo?: string }[] };
  consultores: (MembroCoreDiretos & { conta: string; novos: MembroCoreDiretos[];
    nomesWhatsapp?: string[];
    verificacaoCore?: { mes: string; reservas: number; subscricoes: number; metaReservas: number; metaNovos: number; consultadoEm: string };
  })[];
}

const chave = (s: string) => s.trim().toLowerCase();

export function indexarMembrosCore(membros: MembroCoreDiretos[], desde: string, ate: string): Map<string, MembroCoreDiretos> {
  const dataValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
    && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!dataValida(desde) || !dataValida(ate) || desde > ate) throw new Error("O período não é válido.");
  const unicos = new Map<string, MembroCoreDiretos>();
  for (const m of membros) {
    if (unicos.has(chave(m.username))) throw new Error("A exportação contém usernames repetidos.");
    unicos.set(chave(m.username), m);
  }
  return unicos;
}

/** Só relações imediatas. As próprias contas agregadoras não são consultores do relatório. */
export function construirCoreDiretos(
  membros: MembroCoreDiretos[], emails: string[], desde: string, ate: string,
  fonte: string, atualizadoEm = new Date().toISOString(),
): DadosCoreDiretos {
  indexarMembrosCore(membros, desde, ate);
  // A coluna de reservas respeita o filtro escolhido no MyOffice.
  // Não é possível repartir esse volume por datas depois de exportar.
  const procurados = new Set(emails.map(chave));
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
  const reservas = c.verificacaoCore?.reservas ?? c.reservas;
  const novos = c.verificacaoCore?.subscricoes ?? c.novos.length;
  const metaReservas = c.verificacaoCore?.metaReservas ?? 3000;
  const metaNovos = c.verificacaoCore?.metaNovos ?? 3;
  // O cartão oficial tem dois critérios: reservas e subscrições.
  // A ativação dos novos TPs é um indicador de acompanhamento separado.
  return { reservas, novos, ativos, metaReservas, metaNovos, reservasOk: reservas >= metaReservas,
    concluido: reservas >= metaReservas && novos >= metaNovos };
}
