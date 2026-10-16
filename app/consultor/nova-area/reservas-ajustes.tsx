"use client";

import {useState} from "react";
import {FONTES_RESERVA, fonteReserva, type FonteReserva} from "@/lib/reservas-fontes";
import {carregarFonteReserva} from "@/lib/reservas-canvas";
import {precoPessoaReserva, type DadosReserva, type ElementoReserva, type MaterialReserva} from "@/lib/reservas";
import css from "./reservas.module.css";

type Props={material:MaterialReserva;selecionado:string|null;selecionar:(id:string)=>void;alterar:(patch:Partial<ElementoReserva>)=>void;dados:(patch:Partial<DadosReserva>)=>void;foto:()=>void;desfazer:()=>void;podeDesfazer:boolean};
export function AjustesReserva({material,selecionado,selecionar,alterar,dados,foto,desfazer,podeDesfazer}:Props){
  const [fontesAbertas,setFontesAbertas]=useState(false),[erroFonte,setErroFonte]=useState("");
  const e=material.elementos.find(e=>e.id===selecionado&&e.tipo!=="marca");
  const d=material.dados,h=e?d.hoteis[e.hotel]:undefined;
  async function escolherFonte(fonte:FonteReserva){
    setErroFonte("");
    try{await carregarFonteReserva(fonte);alterar({fonte});setFontesAbertas(false);}catch(ex){setErroFonte(ex instanceof Error?ex.message:"Não foi possível carregar a fonte.");}
  }
  function abrirFontes(){setFontesAbertas(v=>!v);if(!fontesAbertas)void Promise.allSettled(FONTES_RESERVA.map(f=>carregarFonteReserva(f.id)));}
  function textoAtual():string{
    if(!e)return "";
    if(e.campo==="livre")return e.texto;
    if(["hotel","regime","quarto"].includes(e.campo))return h?.[e.campo==="hotel"?"nome":e.campo as "regime"|"quarto"]??"";
    return String(d[e.campo as keyof DadosReserva]??"");
  }
  function escrever(valor:string){
    if(!e)return;
    if(e.campo==="livre"){alterar({texto:valor});return;}
    if(["hotel","regime","quarto","total","preco"].includes(e.campo)){
      const chave=e.campo==="hotel"?"nome":e.campo==="preco"?"precoPessoa":e.campo;
      dados({hoteis:d.hoteis.map((h,i)=>i===e.hotel?{...h,[chave]:["preco","total"].includes(e.campo)?valor===""?null:Number(valor):valor}:h)});return;
    }
    dados({[e.campo]:e.campo==="viajantes"?valor===""?null:Number(valor):valor});
  }
  const numerico=e&&["preco","total","viajantes"].includes(e.campo);
  return <section className={`${css.cartao} ${css.ajustes}`} data-ativo={!!e} aria-label="Ajustes rápidos do template">
    <div className={css.tituloLinha}><div><h2>Ajusta com um clique</h2></div><div><button type="button" onClick={desfazer} disabled={!podeDesfazer}>↶ Desfazer</button>{e&&<button type="button" className={css.fecharAjustes} aria-label="Fechar ajustes" onClick={()=>selecionar("")}>Fechar</button>}</div></div>
    <p className={css.nota}>Clica no texto ou na fotografia do template. Arrasta para mover e usa o canto para redimensionar.</p>
    <label className={css.campo}><span>O que queres editar?</span><select value={e?.id??""} onChange={ev=>{selecionar(ev.target.value);setFontesAbertas(false);}}><option value="">Escolher texto ou imagem…</option>{material.elementos.filter(e=>e.tipo!=="marca").map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
    {!e?<div className={css.ajusteVazio}>Seleciona um elemento na imagem para veres aqui as opções.</div>:<>
      {e.tipo==="texto"&&<>
        {["datas","noites"].includes(e.campo)?<div className={css.grelha}><label className={css.campo}><span>Ida</span><input type="date" value={d.ida} onChange={ev=>dados({ida:ev.target.value})}/></label><label className={css.campo}><span>Regresso</span><input type="date" value={d.regresso} onChange={ev=>dados({regresso:ev.target.value})}/></label></div>:numerico?<label className={css.campo}><span>{e.campo==="preco"?"Preço por pessoa (€)":e.campo==="total"?"Preço total (€)":"Viajantes"}</span><input type="number" min={e.campo==="viajantes"?1:0} step={e.campo==="viajantes"?1:"any"} value={e.campo==="preco"&&h?precoPessoaReserva(d,h)??"":e.campo==="total"?h?.total??"":d.viajantes??""} onChange={ev=>escrever(ev.target.value)}/></label>:["ida","regresso"].includes(e.campo)?<label className={css.campo}><span>{e.nome}</span><input type="date" value={textoAtual()} onChange={ev=>escrever(ev.target.value)}/></label>:<label className={css.campo}><span>Texto</span><textarea rows={2} placeholder={e.texto||e.nome} value={textoAtual()} onChange={ev=>escrever(ev.target.value)}/></label>}
        <div className={css.fonteEscolha}><span>Tipo de letra</span><button type="button" aria-expanded={fontesAbertas} onClick={abrirFontes} style={{fontFamily:fonteReserva(e.fonte).familia}}>{fonteReserva(e.fonte).nome} <span>⌄</span></button></div>
        {fontesAbertas&&<div className={css.catalogoFontes} aria-label="Tipos de letra disponíveis">{FONTES_RESERVA.map(f=><button type="button" aria-pressed={e.fonte===f.id} key={f.id} onClick={()=>void escolherFonte(f.id)} style={{fontFamily:f.familia,fontSize:17,fontWeight:400}}>{f.nome}</button>)}</div>}
        {erroFonte&&<p className={css.erro} role="alert">{erroFonte}</p>}
        <div className={css.barraTexto}>
          <label className={css.campo}><span>Tamanho</span><input aria-label="Tamanho da letra" type="number" min={5.4} max={270} step={1} value={Math.round(e.tamanho*10.8*10)/10} onChange={ev=>alterar({tamanho:Math.max(.5,Math.min(25,Number(ev.target.value)/10.8))})}/></label>
          <label className={css.campo}><span>Cor</span><input type="color" value={e.cor} onChange={ev=>alterar({cor:ev.target.value})}/></label>
          <button type="button" aria-label="Negrito" aria-pressed={e.negrito} onClick={()=>alterar({negrito:!e.negrito})}><strong>B</strong></button>
          <button type="button" aria-label="Maiúsculas" aria-pressed={e.capitalizacao==="maiusculas"} onClick={()=>alterar({capitalizacao:e.capitalizacao==="maiusculas"?"normal":"maiusculas"})}>Aa</button>
        </div>
        <div className={css.acoes} aria-label="Alinhamento do texto">{([['left','Esquerda'],['center','Centro'],['right','Direita']] as const).map(([valor,nome])=><button type="button" key={valor} aria-pressed={e.alinhar===valor} onClick={()=>alterar({alinhar:valor})}>{nome}</button>)}</div>
      </>}
      {(e.tipo==="foto"||e.tipo==="grafico")&&<><button type="button" className={css.primario} onClick={foto}>Trocar esta imagem</button><p className={css.nota}>A nova imagem ocupa o mesmo espaço do modelo.</p></>}
      {e.tipo==="forma"&&<label className={css.campo}><span>Cor</span><input type="color" value={e.cor} onChange={ev=>alterar({cor:ev.target.value})}/></label>}
    </>}
  </section>;
}
