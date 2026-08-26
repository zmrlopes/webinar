/**
 * Primeira linha de cada script: carrega .env para process.env, se o
 * ficheiro existir. Os scripts (ao contrário de `next dev`/`next start`,
 * que fazem isto sozinhos) não liam .env nenhum — cada sessão nova do
 * terminal exigia definir as variáveis à mão outra vez.
 *
 * Parser manual em vez de `process.loadEnvFile` — o Bloco de Notas do
 * Windows pode gravar .env como UTF-16 ("Unicode", com BOM FF FE) em vez
 * de UTF-8, e ler isso como utf8 dá lixo (a primeira variável, tipicamente
 * DATABASE_URL, nunca era encontrada). Lê os bytes crus primeiro, detecta
 * a codificação pelo BOM, só depois descodifica.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function descodificar(bytes: Buffer): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return bytes.subarray(2).toString("utf16le");
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return bytes.subarray(2).swap16().toString("utf16le");
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return bytes.subarray(3).toString("utf8");
  }
  return bytes.toString("utf8");
}

const caminho = resolve(process.cwd(), ".env");

if (existsSync(caminho)) {
  const conteudo = descodificar(readFileSync(caminho));

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
