"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Corre a atualização do Dashboard Negócio. Esta página é aberta pelo botão
 * «Atualizar dashboard» a partir do separador do MyOffice (window.opener):
 * cada pedido à API da iCliGo é feito lá, com a sessão de quem está ligado, e
 * só a resposta chega aqui. Ver src/lib/dashboard-sincronizar.ts.
 */

const SITE = "https://webinar.viajareviver.net";
const API = "https://api.icligo.com/legacy-system/v1";
const MYOFFICE = "https://myoffice.icligo.com";
/** Contas confirmadas com os dados reais a 2026-10-19; com false só se calcula, sem gravar. */
const GRAVAR = true;

/** O código do favorito: corre no MyOffice e serve de ponte para os pedidos desta página. */
const FAVORITO = `javascript:(async()=>{const S='${SITE}';if(!/(^|\\.)icligo\\.com$/.test(location.hostname)){alert('Abre primeiro o MyOffice da iCliGo, entra na tua conta e carrega outra vez neste botão.');return}let t=null;try{t=(await(await fetch('/api/auth/session')).json())?.token?.accessToken||null}catch(e){}const w=window.open(S+'/admin/dashboard-negocio/atualizar?ponte=2','dn-atualizar');if(!w){alert('O browser bloqueou a janela. Permite janelas do MyOffice e carrega outra vez.');return}window.addEventListener('message',async e=>{if(e.origin!==S||e.source!==w)return;const{id,url}=e.data||{};let u;try{u=new URL(url)}catch(x){return}if(u.protocol!=='https:'||!/^(api|myoffice)\\.icligo\\.com$/.test(u.hostname)){w.postMessage({id,erro:'endereço não permitido'},S);return}try{const r=await fetch(u.href,{credentials:'include',headers:t?{Authorization:'Bearer '+t}:{}});w.postMessage({id,status:r.status,corpo:await r.text()},S)}catch(x){w.postMessage({id,erro:String(x)},S)}})})();`;

/**
 * A função do servidor do MyOffice por trás do Analisador de Organização
 * (filhos diretos de uma pessoa, com volume e reserva média da subárvore).
 * Se o MyOffice mudar de versão, este endereço pode mudar também.
 */
const ANALISADOR = `${MYOFFICE}/_serverFn/4b457b9f58baf866962a4eb026255982ff0e9deb00bd1b341b16408098b7584a`;

interface Periodo { chave: string; inicio: string; fim: string }
interface NoAnalisador { consultantId: string; name: string; hasDownline: boolean; bookingVolume: number; avgBooking: number }

/** O pedido no formato do MyOffice (seroval): só strings, números e «undefined». */
function pedidoAnalisador(inicio: string, fim: string, pagina: number, pai?: string): string {
  const v = (x: string | number | undefined) => x === undefined ? { t: 2, s: 1 } : typeof x === "number" ? { t: 0, s: x } : { t: 1, s: x };
  const corpo = { t: { t: 10, i: 0, p: { k: ["data"], v: [{ t: 10, i: 1, p: { k: ["parent", "page", "size", "startDate", "endDate", "country", "user"], v: [v(pai), v(pagina), v(100), v(inicio), v(fim), v(undefined), v(undefined)] }, o: 0 }] }, o: 0 }, f: 127, m: [] };
  return `${ANALISADOR}?payload=${encodeURIComponent(JSON.stringify(corpo))}`;
}

/** Converte a resposta seroval do MyOffice num objeto normal. */
function deSeroval(raiz: unknown): unknown {
  const refs: Record<number, unknown> = {};
  const ler = (n: unknown): unknown => {
    if (!n || typeof n !== "object") return n;
    const no = n as { t: number; s?: unknown; i?: number; a?: unknown[]; p?: { k: string[]; v: unknown[] } };
    let r: unknown;
    if (no.t === 0 || no.t === 1) r = no.s;
    else if (no.t === 2) r = ({ 0: null, 1: undefined, 2: true, 3: false } as Record<number, unknown>)[no.s as number];
    else if (no.t === 4) r = refs[no.i!];
    else if (no.t === 9) r = (no.a ?? []).map(ler);
    else if (no.t === 10 || no.t === 11) { const o: Record<string, unknown> = {}; no.p?.k.forEach((k, i) => { o[k] = ler(no.p!.v[i]); }); r = o; }
    if (no.i !== undefined && no.t !== 4) refs[no.i] = r;
    return r;
  };
  return ler(raiz);
}
type Linha = { texto: string; estado: "a-decorrer" | "feito" | "erro" };

function itensDaPagina(corpo: unknown): unknown[] {
  if (Array.isArray(corpo)) return corpo;
  const o = corpo as Record<string, unknown> | null;
  for (const caminho of [o?.content, (o?.list as Record<string, unknown>)?.content, (o?.data as Record<string, unknown>)?.content, (o?.page as Record<string, unknown>)?.content, o?.data, o?.items]) {
    if (Array.isArray(caminho)) return caminho;
  }
  return [];
}

function totalPaginas(corpo: unknown): number | null {
  const o = corpo as Record<string, unknown> | null;
  const n = o?.totalPages ?? (o?.list as Record<string, unknown>)?.totalPages ?? (o?.page as Record<string, unknown>)?.totalPages ?? (o?.data as Record<string, unknown>)?.totalPages;
  return typeof n === "number" ? n : null;
}


export function AtualizarCliente() {
  const [modo, setModo] = useState<"instrucoes" | "a-correr" | "feito" | "erro">("instrucoes");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [erro, setErro] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [gravado, setGravado] = useState(false);
  const favorito = useRef<HTMLAnchorElement>(null);
  const pendentes = useRef(new Map<number, (r: { status?: number; corpo?: string; erro?: string }) => void>());
  const proximoId = useRef(1);
  const totalLinhas = useRef(0);

  useEffect(() => {
    // O React não deixa escrever um link javascript: no href; põe-se à mão.
    favorito.current?.setAttribute("href", FAVORITO);
  }, []);

  useEffect(() => {
    function aoReceber(e: MessageEvent) {
      if (!/^https:\/\/([a-z0-9-]+\.)*icligo\.com$/.test(e.origin) || e.source !== window.opener) return;
      const { id } = (e.data ?? {}) as { id?: number };
      const resolver = typeof id === "number" ? pendentes.current.get(id) : undefined;
      if (!resolver) return;
      pendentes.current.delete(id!);
      resolver(e.data);
    }
    window.addEventListener("message", aoReceber);
    const ponte = new URLSearchParams(window.location.search).get("ponte") && window.opener;
    if (ponte) void correr();
    return () => window.removeEventListener("message", aoReceber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function registar(texto: string): (estado: Linha["estado"], novo?: string) => void {
    const indice = totalLinhas.current++;
    setLinhas(atual => [...atual, { texto, estado: "a-decorrer" }]);
    return (estado, novo) => setLinhas(atual => atual.map((l, i) => i === indice ? { texto: novo ?? l.texto, estado } : l));
  }

  /** Pede um endereço da iCliGo ao separador do MyOffice. */
  function pedir(url: string): Promise<unknown> {
    const id = proximoId.current++;
    return new Promise((resolve, reject) => {
      pendentes.current.set(id, r => {
        if (r.erro) return reject(new Error(r.erro));
        if (r.status === 401 || r.status === 403) return reject(new Error("a sessão do MyOffice terminou — entra outra vez no MyOffice e repete"));
        if (!r.status || r.status >= 400) return reject(new Error(`o MyOffice respondeu ${r.status} em ${new URL(url).pathname}`));
        try { resolve(JSON.parse(r.corpo ?? "null")); } catch { reject(new Error("resposta do MyOffice ilegível")); }
      });
      (window.opener as Window).postMessage({ id, url }, "*");
    });
  }

  async function enviar(corpo: object): Promise<Record<string, unknown>> {
    const resposta = await fetch("/api/admin/dashboard-negocio/sincronizar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro ?? `o site respondeu ${resposta.status}`);
    return dados;
  }

  /** Todas as páginas de uma lista da API, guardando cada uma tal como veio. */
  async function paginas(nome: string, base: string, tamanho: number): Promise<number> {
    const passo = registar(`${nome}…`);
    let total = 0;
    let primeiroAnterior = "";
    for (let pagina = 0; pagina < 60; pagina++) {
      const sep = base.includes("?") ? "&" : "?";
      const corpo = await pedir(`${base}${sep}page=${pagina}&size=${tamanho}`);
      const itens = itensDaPagina(corpo);
      const primeiro = JSON.stringify(itens[0] ?? null);
      if (pagina > 0 && (itens.length === 0 || primeiro === primeiroAnterior)) break;
      await enviar({ acao: "parte", chave: `${nome}:p${pagina}`, corpo });
      total += itens.length;
      primeiroAnterior = primeiro;
      passo("a-decorrer", `${nome}: ${total}…`);
      const paginasTotal = totalPaginas(corpo);
      if (itens.length < tamanho || (paginasTotal !== null && pagina + 1 >= paginasTotal)) break;
    }
    passo("feito", `${nome}: ${total}`);
    return total;
  }

  /** Toda a árvore da equipa num ano, a partir do Analisador de Organização. */
  async function arvoreReservas(ano: number, hoje: string): Promise<void> {
    const passo = registar(`Reservas ${ano}…`);
    const inicio = `${ano}-01-01`;
    const fim = hoje < `${ano}-12-31` ? hoje : `${ano}-12-31`;
    const filhosDe = async (pai?: string) => {
      const lista: NoAnalisador[] = [];
      let raiz: NoAnalisador | undefined;
      for (let pagina = 0, total = 1; pagina < total && pagina < 60; pagina++) {
        const resposta = deSeroval(await pedir(pedidoAnalisador(inicio, fim, pagina, pai))) as { result?: { parent?: NoAnalisador; content?: NoAnalisador[]; totalPages?: number }; error?: unknown };
        if (!resposta?.result) throw new Error("o Analisador de Organização não respondeu como esperado (o MyOffice pode ter mudado)");
        raiz ??= resposta.result.parent;
        lista.push(...(resposta.result.content ?? []));
        total = resposta.result.totalPages ?? 1;
      }
      return { raiz, lista };
    };
    const primeiro = await filhosDe();
    if (!primeiro.raiz) throw new Error("o Analisador de Organização não devolveu o total da equipa");
    const nos = new Map<string, { id: string; n: string; v: number; a: number; f: string[] }>();
    const fila: string[] = [];
    const juntar = (lista: NoAnalisador[]) => lista.map(c => {
      nos.set(c.consultantId, { id: c.consultantId, n: c.name.trim(), v: c.bookingVolume, a: c.avgBooking, f: [] });
      return c.consultantId;
    });
    const raiz = { v: primeiro.raiz.bookingVolume, a: primeiro.raiz.avgBooking, f: juntar(primeiro.lista) };
    fila.push(...primeiro.lista.filter(c => c.hasDownline).map(c => c.consultantId));
    // Quatro pedidos de cada vez; cada pessoa com equipa abre a sua lista de filhos
    // (um ramo que acaba deixa os restantes continuar até a fila esvaziar).
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (fila.length) {
        const id = fila.shift()!;
        const { lista } = await filhosDe(id);
        nos.get(id)!.f = juntar(lista);
        fila.push(...lista.filter(c => c.hasDownline).map(c => c.consultantId));
        passo("a-decorrer", `Reservas ${ano}: ${nos.size} pessoas…`);
      }
    }));
    await enviar({ acao: "parte", chave: `reservas-${ano}`, corpo: { raiz, nos: [...nos.values()], ate: fim } });
    passo("feito", `Reservas ${ano}: ${nos.size} pessoas`);
  }

  async function correr() {
    setModo("a-correr");
    try {
      const plano = await enviar({ acao: "inicio" }) as unknown as { hoje: string; periodos: Periodo[]; anosReservas?: number[] };

      // A faturação vem do total de vendas da equipa em cada período: o novo
      // MyOffice deixou de ter os Indicadores no Metabase.
      const tarefas: [string, () => Promise<unknown>][] = [
        ["Equipa", () => paginas("equipa", `${API}/team/affiliates`, 100)],
        ...plano.periodos.flatMap(p => [
          [`Equipa ${p.chave}`, () => paginas(`equipa-${p.chave}`, `${API}/team/affiliates?startDate=${p.inicio}&endDate=${p.fim}`, 100)],
          ...(p.chave.startsWith("ano-") || p.chave.startsWith("blackfriday-") ? [] : [
            [`Movimentos ${p.chave}`, () => paginas(`movimentos-${p.chave}`, `${API}/account/movements?startDate=${p.inicio}&endDate=${p.fim}`, 1000)],
          ]),
        ] as [string, () => Promise<unknown>][]),
        // Reserva média (Analisador de Organização): o ano em curso e os que ainda faltam.
        ...(plano.anosReservas ?? []).map(ano => [`Reservas ${ano}`, () => arvoreReservas(ano, plano.hoje)] as [string, () => Promise<unknown>]),
      ];
      // Três pedidos de cada vez: o MyOffice às vezes demora minutos a responder.
      // Um passo que falhe não impede os outros; no fim diz-se quais falharam.
      const falhas: string[] = [];
      let proxima = 0;
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (proxima < tarefas.length) {
          const [nome, tarefa] = tarefas[proxima++]!;
          try { await tarefa(); } catch (falha) {
            const motivo = falha instanceof Error ? falha.message : String(falha);
            falhas.push(`${nome}: ${motivo}`);
            registar(`${nome}: ${motivo}`)("erro");
          }
        }
      }));
      await enviar({ acao: "parte", chave: "falhas", corpo: falhas });

      const contas = registar("Contas do dashboard…");
      const resultado = await enviar({ acao: "calcular", gravar: GRAVAR }) as { avisos: string[]; gravado: boolean };
      contas("feito", "Contas do dashboard");
      setAvisos(resultado.avisos);
      setGravado(resultado.gravado);
      if (falhas.length) throw new Error(`${falhas.length} passo(s) falharam — ver a lista acima`);
      setModo("feito");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : String(falha));
      setModo("erro");
    }
  }

  return <div>
    {modo === "instrucoes" && <>
      <h2 className="at-titulo">Instalar o botão (só uma vez)</h2>
      <ol className="at-passos">
        <li>Mostra a barra de favoritos do Chrome: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd>.</li>
        <li>Arrasta este botão para a barra de favoritos: <a ref={favorito} className="at-favorito" onClick={e => e.preventDefault()} draggable>Atualizar dashboard</a></li>
      </ol>
      <h2 className="at-titulo">Atualizar os dados</h2>
      <ol className="at-passos">
        <li>Abre o <a href={MYOFFICE} target="_blank" rel="noopener noreferrer">MyOffice</a> e entra na tua conta.</li>
        <li>Nesse separador, carrega no favorito <strong>Atualizar dashboard</strong>.</li>
        <li>Abre-se uma janela que vai buscar os dados. Deixa as duas abertas até aparecer «Dashboard atualizado».</li>
      </ol>
    </>}
    {modo !== "instrucoes" && <ul className="at-lista" aria-live="polite">
      {linhas.map((l, i) => <li key={i} data-estado={l.estado}>{l.estado === "feito" ? "✓" : l.estado === "erro" ? "✕" : "…"} {l.texto}</li>)}
    </ul>}
    {modo === "a-correr" && <p className="at-nota">O MyOffice às vezes demora alguns minutos a responder. Não feches esta janela nem o MyOffice.</p>}
    {modo === "feito" && (gravado
      ? <p className="at-ok">Dashboard atualizado. <a href="/admin/dashboard-negocio">Ver o dashboard →</a></p>
      : <p className="at-ok">Dados recolhidos do MyOffice. As contas estão a ser confirmadas pelo Claude antes de passarem a gravar sozinhas.</p>)}
    {avisos.length > 0 && <ul className="at-lista">{avisos.map(a => <li key={a} data-estado="erro">! {a}</li>)}</ul>}
    {modo === "erro" && <p className="at-erro" role="alert">Não foi possível atualizar: {erro}</p>}
  </div>;
}
