import {CASAS_BF, type InscricaoBF} from "@/lib/blackfriday";
import css from "./blackfriday.module.css";

function Aviao() {
  return <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4L22 2Z" strokeLinejoin="round"/><path d="m11 13 6-6" strokeLinecap="round"/></svg>;
}

// Os restantes desenhos foram vetorizados a partir da referência bingo.jpeg.
function IconeCasa({casa}: {casa: number}) {
  if (casa === 21) return <svg className={css.iconeDestino} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 21 10 5l9 16H2Zm8-16 2 16m4-6 3-9 4 15h-4M2 23h21"/></svg>;
  if (casa === 13) return <svg className={css.iconeDestino} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 15c2-5 6-5 8 0 4 5 0 7-4 5-4 2-8 0-4-5ZM7 8a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm6-3a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm6 1a2 3 0 1 1-4 0 2 3 0 0 1 4 0Zm4 5a2 3 0 1 1-4 0 2 3 0 0 1 4 0Z"/></svg>;
  return <span className={`${css.iconeDestino} ${css.iconeReferencia}`} style={{maskImage: `url(/blackfriday/icones/casa-${casa}.svg)`, WebkitMaskImage: `url(/blackfriday/icones/casa-${casa}.svg)`}} aria-hidden="true"/>;
}

const rotuloEstado = {
  pendente: "◷ Em validação",
  aprovada: "Validada",
  recusada: "Rever envio",
};

interface GrelhaBlackFridayProps {
  inscricoes: InscricaoBF[];
  linhas: number[];
  linhasCelebradas?: number[];
  aoAbrirCasa?: (casa: number, botao: HTMLButtonElement) => void;
}

export function GrelhaBlackFriday({inscricoes, linhas, linhasCelebradas, aoAbrirCasa}: GrelhaBlackFridayProps) {
  // A API ordena por envio, da tentativa mais antiga para a mais recente.
  const porCasa = new Map(inscricoes.map(i => [i.casa, i]));
  return <>
    <div className={css.letras} aria-hidden="true">{"BINGO".split("").map(l => <span key={l}>{l}</span>)}</div>
    <div className={css.grelha}>
      {CASAS_BF.map((titulo, casa) => {
        const inscricao = porCasa.get(casa);
        const estado = inscricao?.estado ?? "vazia";
        const linha = Math.floor(casa / 5);
        const centro = casa === 12;
        const rotulo = estado === "vazia"
          ? (centro ? "Reserva ≥ 5.000 €" : aoAbrirCasa ? "+ Reserva" : "Por preencher")
          : !aoAbrirCasa && estado === "recusada" ? "Recusada" : rotuloEstado[estado];
        const atributos = {
          className: css.casa,
          "data-estado": estado,
          "data-cor": casa % 6,
          "data-linha": linhas.includes(linha),
          "data-celebrar": linhasCelebradas?.includes(linha) ?? false,
        };
        const conteudo = <>
          {estado === "aprovada" && <span className={css.check} aria-hidden="true">✓</span>}
          {centro ? <Aviao/> : <IconeCasa casa={casa}/>}
          <span className={centro ? `${css.destino} ${css.nomeCentro}` : css.destino}>{titulo}</span>
          <small>{rotulo}</small>
          {inscricao?.curinga && estado !== "recusada" && <span className={css.joker}>5K</span>}
        </>;
        return aoAbrirCasa
          ? <button key={casa} type="button" {...atributos} aria-label={`${titulo}: ${estado === "vazia" ? "por preencher" : estado}. Ver detalhes.`} onClick={e => aoAbrirCasa(casa, e.currentTarget)}>{conteudo}</button>
          : <div key={casa} {...atributos}>{conteudo}</div>;
      })}
    </div>
    <div className={css.legenda}><span>○ Por preencher</span><span>◷ Em validação</span><span>✓ Validada</span>{!aoAbrirCasa && <span>· Recusada</span>}</div>
  </>;
}
