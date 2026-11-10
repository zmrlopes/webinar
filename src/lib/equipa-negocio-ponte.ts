import { ANALISADOR } from "./analisador-organizacao";

export const CANAL_EQUIPA_NEGOCIO = "icligo-equipa-negocio-v1";
export const MYOFFICE_EQUIPA = "https://myoffice.icligo.com";

/**
 * Favorito da equipa de um líder: corre só no MyOffice, com a sessão de quem
 * está autenticado (a própria líder), e pede só o Analisador de Organização
 * — nunca `team/affiliates` nem `stats/*`, que são dados pessoais de outra
 * pessoa. Como ela entra com a própria conta, o pedido sem `parent` já
 * devolve a sua própria subárvore (ela + descendência).
 */
export function favoritoEquipaNegocio(site: string): string {
  return "javascript:" + encodeURIComponent(`(async()=>{
    const S=${JSON.stringify(site)}, C=${JSON.stringify(CANAL_EQUIPA_NEGOCIO)}, A=${JSON.stringify(ANALISADOR)};
    if(location.origin!==${JSON.stringify(MYOFFICE_EQUIPA)}){alert('Abre primeiro o MyOffice, entra na tua conta e carrega novamente neste favorito.');return}
    const w=window.open(S+'/consultor/blackfriday/equipa/atualizar?ponte=1','equipa-negocio-atualizar');
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
    if(window.__ponteEquipaNegocio)window.removeEventListener('message',window.__ponteEquipaNegocio);
    window.__ponteEquipaNegocio=async e=>{
      if(e.origin!==S||e.source!==w||e.data?.canal!==C)return;
      const {id,url}=e.data;
      const responder=d=>w.postMessage({canal:C,id,...d},S);
      const {token,email}=await contexto;
      if(url==='identidade'){responder({corpo:JSON.stringify({email,versao:1}),status:200});return}
      let u;try{u=new URL(url)}catch{return}
      if(u.origin+u.pathname!==A){responder({erro:'Endereço não permitido.'});return}
      try{const r=await fetch(url,{credentials:'include',headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(60000)});responder({status:r.status,corpo:await r.text()})}catch{responder({erro:'O MyOffice não respondeu. Repete a atualização.'})}
    };
    window.addEventListener('message',window.__ponteEquipaNegocio);
  })()`);
}
