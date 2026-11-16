import {ANALISADOR, deSeroval, pedidoAnalisador} from "./analisador-organizacao";
import {arredondarNegocio, type PeriodoNegocio, type TotaisNegocio} from "./consultor-negocio";

export const CANAL_NEGOCIO = "icligo-consultor-negocio-v1";
export const MYOFFICE_NEGOCIO = "https://myoffice.icligo.com";
const API = "https://api.icligo.com/legacy-system/v1";

/** Executado só no MyOffice. A sessão e o token nunca são enviados para a plataforma. */
export function favoritoNegocio(site: string): string {
  return "javascript:" + encodeURIComponent(`(async()=>{
    const S=${JSON.stringify(site)}, C=${JSON.stringify(CANAL_NEGOCIO)}, A=${JSON.stringify(ANALISADOR)}, N=${JSON.stringify(NEGOCIO_MYOFFICE)};
    if(location.origin!==${JSON.stringify(MYOFFICE_NEGOCIO)}){alert('Abre primeiro o MyOffice, entra na tua conta e carrega novamente neste favorito.');return}
    const w=window.open(S+'/consultor/nova-area/negocio/atualizar?ponte=1','consultor-negocio-atualizar');
    if(!w){alert('Permite janelas do MyOffice e carrega novamente no favorito.');return}
    const contexto=(async()=>{
      let sessao;try{const r=await fetch('/api/auth/session',{signal:AbortSignal.timeout(15000)});if(r.ok)sessao=await r.json()}catch{}
      const token=sessao?.token?.accessToken;
      let perfil={};try{if(token){const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');perfil=JSON.parse(decodeURIComponent(escape(atob(p))))}}catch{}
      let email=sessao?.user?.email||sessao?.token?.email||perfil.email||'';
      if(!email)try{
        const r=await fetch('/_serverFn/382ebf7105989db7b91dd80b63e148b2c5d6c40d63ed2b514ab481c6ad262b66',{credentials:'include',signal:AbortSignal.timeout(30000)});
        if(r.ok){
          const refs={};const ler=n=>{if(!n||typeof n!=='object')return n;let v;if(n.t===0||n.t===1)v=n.s;else if(n.t===2)v=({0:null,1:undefined,2:true,3:false})[n.s];else if(n.t===4)v=refs[n.i];else if(n.t===9)v=(n.a||[]).map(ler);else if(n.t===10||n.t===11){v={};n.p?.k.forEach((k,i)=>v[k]=ler(n.p.v[i]))}if(n.i!==undefined&&n.t!==4)refs[n.i]=v;return v};
          const corpo=await r.json(),conta=typeof corpo?.t==='number'?ler(corpo):corpo;
          email=conta?.result?.email||conta?.email||'';
        }
      }catch{}
      return {token,email};
    })();
    if(window.__ponteNegocio)window.removeEventListener('message',window.__ponteNegocio);
    window.__ponteNegocio=async e=>{
      if(e.origin!==S||e.source!==w||e.data?.canal!==C)return;
      const {id,url}=e.data;
      const responder=d=>w.postMessage({canal:C,id,...d},S);
      const {token,email}=await contexto;
      if(url==='identidade'){responder({corpo:JSON.stringify({email,versao:5}),status:200});return}
      let u;try{u=new URL(url)}catch{return}
      if(u.origin+u.pathname===A||u.origin+u.pathname===N){try{const r=await fetch(u.href,{credentials:'include',headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(180000)});responder({status:r.status,corpo:await r.text()})}catch{responder({erro:'O MyOffice não respondeu. Repete a atualização.'})}return}
      if(u.origin!=='https://api.icligo.com'||!['/legacy-system/v1/team/affiliates','/legacy-system/v1/ranking/topPoints','/legacy-system/v1/stats/activeIncome','/legacy-system/v1/stats/passiveIncome'].includes(u.pathname)){responder({erro:'Endereço não permitido.'});return}
      try{const r=await fetch(u.href,{credentials:'include',headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(180000)});responder({status:r.status,corpo:await r.text()})}catch{responder({erro:'O MyOffice não respondeu. Repete a atualização.'})}
    };
    window.addEventListener('message',window.__ponteNegocio);
  })()`);
}

type PedirMyOffice = (url: string) => Promise<unknown>;
/** A função do servidor do MyOffice por trás de Negócio → Visão Geral do Negócio («O meu negócio»). */
export const NEGOCIO_MYOFFICE = `${MYOFFICE_NEGOCIO}/_serverFn/b08e83ed56f14e68ed29ed2ec93d6132d46035fac5637de359d8e293aa37dfde`;
/** O pedido no formato do MyOffice (seroval), igual ao filtro de datas personalizado da página. */
export function pedidoNegocioMyOffice(inicio: string, fim: string): string {
  const v = (x: string | undefined) => x === undefined ? {t: 2, s: 1} : {t: 1, s: x};
  const corpo = {t: {t: 10, i: 0, p: {k: ["data"], v: [{t: 10, i: 1, p: {k: ["period", "startDate", "endDate", "country", "user"], v: [v("custom"), v(inicio), v(fim), v(undefined), v(undefined)]}, o: 0}]}, o: 0}, f: 127, m: []};
  return `${NEGOCIO_MYOFFICE}?payload=${encodeURIComponent(JSON.stringify(corpo))}`;
}
const finito = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
/**
 * Faturação e comissões são os mesmos valores de Negócio → Visão Geral do Negócio:
 * Faturação Total (reservas + subscrições + gifts, pessoal + equipa) e Comissões
 * Ativas + Passivas. Os pontos totais são a linha da própria conta no Top Pontos da
 * equipa (`ranking/topPoints?team=true`), como no Início. `team/affiliates` omite a
 * própria conta e só dá as adesões da equipa. O nome de utilizador vem da raiz do
 * Analisador de Organização (a conta autenticada).
 */
export async function recolherPeriodoNegocio(periodo: PeriodoNegocio, pedir: PedirMyOffice): Promise<TotaisNegocio> {
  const query = `startDate=${periodo.inicio}&endDate=${periodo.fim}`;
  const equipa = await pedir(`${API}/team/affiliates?${query}&page=0&size=1`) as {stats?: {points?: unknown; subscriptions?: unknown}} | null;
  const stats = equipa?.stats;
  if (!stats || !finito(stats.points) || !finito(stats.subscriptions)) {
    throw new Error("O MyOffice não devolveu os totais da equipa. Não foram usados zeros em falta.");
  }
  const negocio = deSeroval(await pedir(pedidoNegocioMyOffice(periodo.inicio, periodo.fim))) as {result?: {currency?: unknown;
    totalBillings?: {value?: unknown}; activeCommission?: {value?: unknown}; passiveCommission?: {value?: unknown}}} | null;
  const r = negocio?.result;
  if (!r || (r.currency !== undefined && r.currency !== "EUR") || !finito(r.totalBillings?.value)) {
    throw new Error("O MyOffice não devolveu a Faturação Total em euros. Os dados anteriores mantêm-se.");
  }
  if (!finito(r.activeCommission?.value) || !finito(r.passiveCommission?.value)) {
    throw new Error("O MyOffice não devolveu as comissões ativas e passivas. Os dados anteriores mantêm-se.");
  }
  const analisador = deSeroval(await pedir(pedidoAnalisador(periodo.inicio, periodo.fim, 0))) as {result?: {parent?: {username?: unknown}}} | null;
  const username = analisador?.result?.parent?.username;
  if (typeof username !== "string" || !username.trim()) throw new Error("O MyOffice não identificou a tua conta. Os dados anteriores mantêm-se.");
  const ranking = await pedir(`${API}/ranking/topPoints?${query}&team=true&user=${encodeURIComponent(username)}&page=0&size=100`) as {content?: {username?: unknown; value?: unknown}[]} | null;
  if (!ranking || !Array.isArray(ranking.content)) throw new Error("O MyOffice não devolveu o Top Pontos. Os dados anteriores mantêm-se.");
  // A própria conta soma os pontos de toda a equipa, por isso fica no topo; sem
  // linha própria (sem pontos no período), os pontos totais são os da equipa.
  const linha = ranking.content.find(c => typeof c?.username === "string" && c.username.toLowerCase() === username.toLowerCase());
  const pontos = linha === undefined ? stats.points : linha.value;
  if (!finito(pontos)) throw new Error("O MyOffice não devolveu os pontos totais. Os dados anteriores mantêm-se.");
  return {faturacao: arredondarNegocio(r.totalBillings.value), pontos: arredondarNegocio(pontos), consultores: stats.subscriptions,
    comissoes: arredondarNegocio(r.activeCommission.value + r.passiveCommission.value)};
}
