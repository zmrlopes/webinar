import { db } from "./db";

export interface LinhaEquipa {
  email: string;
  nome: string;
  uplineEmail: string | null;
  nivel: string | null;
  estado: string;
  vendas: number | null;
  dataRegisto: Date | null;
}

export interface ResultadoParseCsvEquipa {
  linhas: LinhaEquipa[];
  totalLinhasCru: number;
  semEmail: string[];
  /** Diagnóstico da importação — ver app/admin/equipa/importar: sem isto não há forma de perceber, a partir do site, porque é que uma coluna do CSV não foi lida. */
  colunas: string[];
  colunaDataRegisto: string | null;
  comDataRegisto: number;
  exemploDataRegisto: string | null;
}

/**
 * O nome exato da coluna da data de registo varia conforme a exportação, por
 * isso não se exige um nome fixo: procura-se sem distinguir maiúsculas nem
 * separadores, e depois por palavras parecidas.
 */
function encontrarColunaData(colunas: string[]): string | null {
  const normalizar = (c: string) => c.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const exata = colunas.find((c) => normalizar(c) === "user_creation_date");
  if (exata) return exata;
  return (
    colunas.find((c) => /creation|created|registo|register|signup|sign_up|join/.test(normalizar(c))) ??
    null
  );
}

/** Aceita ISO (2026-09-07) e o formato europeu (07/09/2026), que o `new Date` leria ao contrário. */
function parseDataRegisto(valor: string): Date | null {
  const texto = valor.trim();
  if (!texto) return null;

  const europeu = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (europeu) {
    const data = new Date(Number(europeu[3]), Number(europeu[2]) - 1, Number(europeu[1]));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Parser CSV mínimo (RFC4180: campos entre aspas, aspas escapadas como ""). */
function parseCsv(texto: string): Record<string, string>[] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        dentroDeAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\r") {
      // ignora, o \n a seguir fecha a linha
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  const [cabecalho, ...resto] = linhas.filter((l) => l.length > 1 || l[0] !== "");
  if (!cabecalho) return [];
  return resto.map((valores) => {
    const objeto: Record<string, string> = {};
    cabecalho.forEach((coluna, indice) => {
      objeto[coluna] = valores[indice] ?? "";
    });
    return objeto;
  });
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Lê o CSV exportado da plataforma de afiliados (colunas user_email,
 * user_name, upline_email, user_level, subscription_status, sales) e
 * devolve as linhas válidas (com email) prontas para upsert em
 * equipa_afiliados — mesma lógica de scripts/importar-equipa.ts,
 * partilhada com a página de importação no admin (app/admin/equipa/importar).
 * `sales` é o volume de faturação própria do consultor — usado na tabela
 * de patamar/faturação dos inscritos no Teambuilding.
 */
export function parseCsvEquipa(texto: string): ResultadoParseCsvEquipa {
  const linhasCru = parseCsv(texto);
  const linhas: LinhaEquipa[] = [];
  const semEmail: string[] = [];
  const colunas = linhasCru[0] ? Object.keys(linhasCru[0]) : [];
  const colunaDataRegisto = encontrarColunaData(colunas);
  let exemploDataRegisto: string | null = null;

  for (const l of linhasCru) {
    const email = normalizarEmail(l.user_email ?? "");
    if (!email || !email.includes("@")) {
      semEmail.push(l.user_name ?? "(sem nome)");
      continue;
    }
    const vendas = Number(l.sales);
    const dataRegistoBruta = colunaDataRegisto ? (l[colunaDataRegisto] ?? "") : "";
    if (dataRegistoBruta.trim() && exemploDataRegisto === null) {
      exemploDataRegisto = dataRegistoBruta.trim();
    }
    linhas.push({
      email,
      nome: (l.user_name ?? "").trim(),
      uplineEmail: l.upline_email ? normalizarEmail(l.upline_email) : null,
      nivel: l.user_level ? l.user_level.trim() : null,
      estado: (l.subscription_status ?? "ACTIVE").trim() || "ACTIVE",
      vendas: Number.isFinite(vendas) ? vendas : null,
      dataRegisto: parseDataRegisto(dataRegistoBruta),
    });
  }

  return {
    linhas,
    totalLinhasCru: linhasCru.length,
    semEmail,
    colunas,
    colunaDataRegisto,
    comDataRegisto: linhas.filter((l) => l.dataRegisto !== null).length,
    exemploDataRegisto,
  };
}

/**
 * Upsert de cada linha em equipa_afiliados, pelo email — quem já existe só é
 * atualizado (nome, upline, nível, estado), ninguém é apagado daqui (uma
 * pessoa que saiu da plataforma de afiliados simplesmente deixa de aparecer
 * no CSV seguinte, mas fica com o estado antigo até o CSV trazer o estado
 * novo dela).
 */
export async function importarLinhasEquipa(linhas: LinhaEquipa[]): Promise<void> {
  for (const l of linhas) {
    await db().query(
      `insert into equipa_afiliados (email, nome, upline_email, nivel, estado, vendas, data_registo, atualizado_em)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (email) do update
         set nome = excluded.nome,
             upline_email = excluded.upline_email,
             nivel = excluded.nivel,
             estado = excluded.estado,
             vendas = excluded.vendas,
             data_registo = excluded.data_registo,
             atualizado_em = now()`,
      [l.email, l.nome, l.uplineEmail, l.nivel, l.estado, l.vendas, l.dataRegisto],
    );
  }
}
