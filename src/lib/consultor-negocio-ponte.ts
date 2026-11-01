import {arredondarNegocio, type PeriodoNegocio, type TotaisNegocio} from "./consultor-negocio";

export const CANAL_NEGOCIO = "icligo-consultor-negocio-v1";
export const MYOFFICE_NEGOCIO = "https://myoffice.icligo.com";
const API = "https://api.icligo.com/legacy-system/v1";

/** Executado só no MyOffice. A sessão e o token nunca são enviados para a plataforma. */
export function favoritoNegocio(site: string): string {
  return "javascript:" + encodeURIComponent(`(async()=>{
    const S=${JSON.stringify(site)}, C=${JSON.stringify(CANAL_NEGOCIO)};
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
      if(url==='identidade'){responder({corpo:JSON.stringify({email}),status:200});return}
      let u;try{u=new URL(url)}catch{return}
      if(u.origin!=='https://api.icligo.com'||!['/legacy-system/v1/team/affiliates','/legacy-system/v1/account/movements'].includes(u.pathname)){responder({erro:'Endereço não permitido.'});return}
      try{const r=await fetch(u.href,{credentials:'include',headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(180000)});responder({status:r.status,corpo:await r.text()})}catch{responder({erro:'O MyOffice não respondeu. Repete a atualização.'})}
    };
    window.addEventListener('message',window.__ponteNegocio);
  })()`);
}

type PedirMyOffice = (url: string) => Promise<unknown>;
/** Totais da organização e comissões confirmadas positivas, como no dashboard admin. */
export async function recolherPeriodoNegocio(periodo: PeriodoNegocio, pedir: PedirMyOffice): Promise<TotaisNegocio> {
  const query = `startDate=${periodo.inicio}&endDate=${periodo.fim}`;
  const equipa = await pedir(`${API}/team/affiliates?${query}&page=0&size=1`) as {stats?: {sales?: unknown; points?: unknown; subscriptions?: unknown}} | null;
  const stats = equipa?.stats;
  if (!stats || [stats.sales, stats.points, stats.subscriptions].some(n => typeof n !== "number" || !Number.isFinite(n))) {
    throw new Error("O MyOffice não devolveu os totais da equipa. Não foram usados zeros em falta.");
  }
  let comissoes = 0, recebidos = 0;
  const vistos = new Set<string>();
  for (let pagina = 0; pagina < 100; pagina++) {
    const corpo = await pedir(`${API}/account/movements?${query}&page=${pagina}&size=1000`) as {
      content?: {state?: unknown; commissions?: unknown}[]; totalPages?: unknown; totalElements?: unknown;
    } | null;
    if (!corpo || !Array.isArray(corpo.content)) throw new Error("O MyOffice não devolveu os movimentos no formato esperado.");
    const assinatura = JSON.stringify(corpo.content);
    if (corpo.content.length && vistos.has(assinatura)) throw new Error("O MyOffice repetiu uma página de movimentos. Repete a atualização.");
    vistos.add(assinatura);
    for (const m of corpo.content) {
      if (typeof m.commissions !== "number" || !Number.isFinite(m.commissions) || typeof m.state !== "string") throw new Error("Há movimentos incompletos no MyOffice.");
      if (m.state === "confirmed" && m.commissions > 0) comissoes += m.commissions;
    }
    recebidos += corpo.content.length;
    const paginas = typeof corpo.totalPages === "number" ? corpo.totalPages : null;
    if (paginas !== null && (!Number.isInteger(paginas) || paginas < 0 || paginas > 100)) throw new Error("A lista de movimentos é demasiado grande ou está incompleta.");
    if (paginas !== null ? pagina + 1 >= paginas : corpo.content.length < 1000) {
      if (typeof corpo.totalElements === "number" && recebidos !== corpo.totalElements) throw new Error("Faltam movimentos do MyOffice. Repete a atualização.");
      return {faturacao: stats.sales as number, pontos: stats.points as number, consultores: stats.subscriptions as number, comissoes: arredondarNegocio(comissoes)};
    }
  }
  throw new Error("Não foi possível recolher todos os movimentos. Os dados anteriores mantêm-se.");
}
