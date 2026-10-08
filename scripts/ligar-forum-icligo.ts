import "./_env";
import { fecharDb } from "../src/lib/db";
import { ligarForumIcligo, sincronizarForumIcligo } from "../src/lib/forum-icligo";

/** Lê apenas a sessão do fórum num perfil dedicado do Chrome, sem pedir a palavra-passe. */
async function main() {
  const porta = Number(process.argv[2] ?? 9341);
  if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error("Porta do navegador inválida.");
  const tabs = await fetch(`http://127.0.0.1:${porta}/json/list`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()) as { type: string; url: string; webSocketDebuggerUrl: string }[];
  const tab = tabs.find(t => t.type === "page" && t.url.startsWith("https://forum.icligo.com/c/eventos-online"));
  if (!tab) throw new Error("Abre o calendário do fórum e faz login na janela dedicada do Chrome.");
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(new Error("Não foi possível ligar ao navegador.")); });
  let cookies: { name: string; value: string }[];
  try {
    cookies = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("O navegador não respondeu.")), 5000);
      ws.onmessage = e => { const m = JSON.parse(String(e.data)); if (m.id !== 1) return; clearTimeout(timer); m.error ? reject(new Error("Não foi possível ler a sessão do fórum.")) : resolve(m.result.cookies); };
      ws.send(JSON.stringify({ id: 1, method: "Network.getCookies", params: { urls: ["https://forum.icligo.com/c/eventos-online"] } }));
    });
  } finally { ws.close(); }
  const cookie = cookies.filter(c => /^(_circle_session|remember_user_token|user_session_identifier|cf_clearance|__cf_bm|cookies_enabled)$/.test(c.name)).map(c => `${c.name}=${c.value}`).join("; ");
  const r = await fetch("https://forum.icligo.com/internal_api/spaces/1399882/posts?per_page=1&used_on=calendar", {
    headers: { Cookie: cookie, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, redirect: "manual", signal: AbortSignal.timeout(10000),
  });
  if (!r.ok || !r.headers.get("content-type")?.includes("application/json")) throw new Error("A sessão não permite ler o calendário. Faz login no fórum antes de continuar.");
  const corpo = await r.json();
  if (!Array.isArray(corpo.records)) throw new Error("O calendário do fórum não foi reconhecido.");
  await ligarForumIcligo(cookie);
  console.log("Sessão ligada. Credencial guardada apenas na base de dados.");
  console.log(JSON.stringify(await sincronizarForumIcligo(true)));
}
main().catch(erro => { console.error(erro instanceof Error ? erro.message : "Falha ao ligar o fórum."); process.exitCode = 1; }).finally(fecharDb);
