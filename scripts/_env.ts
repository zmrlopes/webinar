/**
 * Primeira linha de cada script: carrega .env para process.env, se o
 * ficheiro existir. Os scripts (ao contrário de `next dev`/`next start`,
 * que fazem isto sozinhos) não liam .env nenhum — cada sessão nova do
 * terminal exigia definir as variáveis à mão outra vez.
 *
 * Parser manual em vez de `process.loadEnvFile` — o Bloco de Notas do
 * Windows costuma gravar .env com um BOM (marca de bytes no início do
 * ficheiro) ou terminações CRLF, e isso pode fazer com que a primeira
 * variável do ficheiro (tipicamente DATABASE_URL) nunca seja encontrada.
 * Isto lê o ficheiro nós próprios, tira o BOM se existir, e ignora \r.
 * Variáveis já definidas no ambiente nunca são substituídas.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const caminho = resolve(process.cwd(), ".env");

if (existsSync(caminho)) {
  let conteudo = readFileSync(caminho, "utf8");
  if (conteudo.charCodeAt(0) === 0xfeff) conteudo = conteudo.slice(1); // BOM

  for (const linhaCrua of conteudo.split("\n")) {
    const linha = linhaCrua.trim();
    if (!linha || linha.startsWith("#")) continue;

    const igual = linha.indexOf("=");
    if (igual === -1) continue;

    const chave = linha.slice(0, igual).trim();
    let valor = linha.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (chave && process.env[chave] === undefined) {
      process.env[chave] = valor;
    }
  }
}
