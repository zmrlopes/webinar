/**
 * Testes de aceitação 1-5 da secção 11 do guia. Não precisam de sessão marcada.
 *
 * Corre com: npm run test:fase1
 * Requer SALA_BASE_URL e SALA_API_KEY no ambiente (ver .env.example).
 * Usa apenas dados fictícios — não inscreve ninguém real.
 */

import "./_env";

const BASE = process.env.SALA_BASE_URL;
const CHAVE = process.env.SALA_API_KEY;

if (!BASE || !CHAVE) {
  console.error("Faltam SALA_BASE_URL e/ou SALA_API_KEY no ambiente.");
  process.exit(1);
}

let falhas = 0;

async function teste(
  numero: number,
  descricao: string,
  corre: () => Promise<boolean>,
): Promise<void> {
  try {
    const ok = await corre();
    console.log(`${ok ? "OK  " : "FAIL"} #${numero} — ${descricao}`);
    if (!ok) falhas += 1;
  } catch (erro) {
    console.log(`FAIL #${numero} — ${descricao} (erro: ${(erro as Error).message})`);
    falhas += 1;
  }
}

async function main(): Promise<void> {
  // 1 — pedido sem cabeçalho Authorization → 401
  await teste(1, "sem Authorization → 401", async () => {
    const r = await fetch(`${BASE}/api/parceiros/sessoes`);
    return r.status === 401;
  });

  // 2 — chave alterada num carácter → 401
  await teste(2, "chave alterada → 401", async () => {
    const chaveErrada = CHAVE!.slice(0, -1) + (CHAVE!.at(-1) === "a" ? "b" : "a");
    const r = await fetch(`${BASE}/api/parceiros/sessoes`, {
      headers: { Authorization: `Bearer ${chaveErrada}` },
    });
    return r.status === 401;
  });

  // 3 — GET /sessoes com a chave certa → 200, lista
  await teste(3, "GET /sessoes com chave certa → 200 e lista", async () => {
    const r = await fetch(`${BASE}/api/parceiros/sessoes`, {
      headers: { Authorization: `Bearer ${CHAVE}` },
    });
    if (r.status !== 200) return false;
    const dados = (await r.json()) as { sessoes?: unknown };
    return Array.isArray(dados.sessoes);
  });

  // 4 — POST /inscricoes com sessao inventada → 404
  await teste(4, "POST /inscricoes com sessão inventada → 404", async () => {
    const r = await fetch(`${BASE}/api/parceiros/inscricoes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHAVE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessao: "00000000-0000-0000-0000-000000000000",
        nome: "Teste",
        apelido: "Aceitação",
        email: "teste-fase1@exemplo.pt",
      }),
    });
    return r.status === 404;
  });

  // 5 — POST /inscricoes sem email → 400
  await teste(5, "POST /inscricoes sem email → 400", async () => {
    const r = await fetch(`${BASE}/api/parceiros/inscricoes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHAVE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessao: "00000000-0000-0000-0000-000000000000",
        nome: "Teste",
        apelido: "Aceitação",
      }),
    });
    return r.status === 400;
  });

  console.log("");
  if (falhas > 0) {
    console.error(`${falhas} teste(s) falharam.`);
    process.exit(1);
  }
  console.log("Todos os testes da Fase 1 passaram.");
}

main();
