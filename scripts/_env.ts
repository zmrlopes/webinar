/**
 * Primeira linha de cada script: carrega .env para process.env, se o
 * ficheiro existir. Os scripts (ao contrário de `next dev`/`next start`,
 * que fazem isto sozinhos) não liam .env nenhum — cada sessão nova do
 * terminal exigia definir as variáveis à mão outra vez. `loadEnvFile` é
 * nativo do Node (estável desde a 22), não precisa de nenhuma dependência
 * nova. Silencioso quando o ficheiro não existe — variáveis já definidas
 * no ambiente continuam a funcionar na mesma.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const caminho = resolve(process.cwd(), ".env");
if (existsSync(caminho)) {
  process.loadEnvFile(caminho);
}
