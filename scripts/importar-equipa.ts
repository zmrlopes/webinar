/**
 * Importa a hierarquia da equipa (quem está abaixo de quem) a partir do CSV
 * exportado da plataforma de afiliados, para a tabela `equipa_afiliados`.
 * Alimenta a secção "A minha equipa" no painel do consultor.
 *
 * A plataforma de afiliados não tem sincronização automática — sempre que a
 * equipa mudar (gente nova, mudanças de upline), exporta o CSV outra vez e
 * corre este script de novo. É seguro correr repetidamente: cada consultor
 * é upsert pelo email, os que já existem só são atualizados.
 *
 * Corre com: CONFIRMAR=sim npm run importar-equipa -- caminho/para/export.csv
 * Sem CONFIRMAR=sim, só mostra o que iria fazer (nada é gravado).
 */

import "./_env";
import { readFile } from "node:fs/promises";
import { db, fecharDb } from "../src/lib/db";

interface LinhaEquipa {
  email: string;
  nome: string;
  uplineEmail: string | null;
  nivel: string | null;
  estado: string;
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

async function main(): Promise<void> {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("Uso: npm run importar-equipa -- caminho/para/export.csv");
    process.exit(1);
  }

  const confirmar = process.env.CONFIRMAR === "sim";

  const texto = await readFile(caminho, "utf8");
  const linhasCru = parseCsv(texto);

  const linhas: LinhaEquipa[] = [];
  const semEmail: string[] = [];
  for (const l of linhasCru) {
    const email = normalizarEmail(l.user_email ?? "");
    if (!email || !email.includes("@")) {
      semEmail.push(l.user_name ?? "(sem nome)");
      continue;
    }
    linhas.push({
      email,
      nome: (l.user_name ?? "").trim(),
      uplineEmail: l.upline_email ? normalizarEmail(l.upline_email) : null,
      nivel: l.user_level ? l.user_level.trim() : null,
      estado: (l.subscription_status ?? "ACTIVE").trim() || "ACTIVE",
    });
  }

  const existentes = await db().query<{ total: string }>(
    "select count(*) as total from equipa_afiliados",
  );

  console.log(`Ficheiro: ${caminho}`);
  console.log(`Linhas no CSV: ${linhasCru.length}`);
  console.log(`Consultores válidos (com email): ${linhas.length}`);
  if (semEmail.length > 0) {
    console.log(`Ignorados por falta de email: ${semEmail.length} (${semEmail.slice(0, 5).join(", ")}${semEmail.length > 5 ? ", ..." : ""})`);
  }
  console.log(`Já existem em equipa_afiliados: ${existentes.rows[0]?.total ?? 0}`);

  if (!confirmar) {
    console.log("\nNada foi gravado. Corre com CONFIRMAR=sim npm run importar-equipa -- <ficheiro> para importar a sério.");
    return;
  }

  for (const l of linhas) {
    await db().query(
      `insert into equipa_afiliados (email, nome, upline_email, nivel, estado, atualizado_em)
       values ($1, $2, $3, $4, $5, now())
       on conflict (email) do update
         set nome = excluded.nome,
             upline_email = excluded.upline_email,
             nivel = excluded.nivel,
             estado = excluded.estado,
             atualizado_em = now()`,
      [l.email, l.nome, l.uplineEmail, l.nivel, l.estado],
    );
  }

  console.log(`\nImportado: ${linhas.length} consultores.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
