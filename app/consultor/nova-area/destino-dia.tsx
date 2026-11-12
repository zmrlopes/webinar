"use client";

import { DESTINOS_DIA, dadosReservaDestinoDia } from "@/lib/destino-dia";
import type { DadosReserva } from "@/lib/reservas";
import estilos from "./nova-area.module.css";
import css from "./reservas.module.css";
import s from "./destino-dia.module.css";

const euros = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const dataPt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Lisbon" });
const noites = (ida: string, regresso: string) => Math.round((Date.parse(regresso) - Date.parse(ida)) / 86_400_000);

export function DestinoDiaNovaArea({ aoCriarTemplate }: { aoCriarTemplate: (dados: DadosReserva) => void }) {
  return <div className={css.pagina}>
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>RESERVAS</span>
      <h1>Destino do dia<span>.</span></h1>
      <p>Duas propostas já pesquisadas no motor de Operadores do MyOffice, prontas para divulgar. Escolhe uma e cria o teu template — só falta escolher a referência.</p>
    </div>
    <div className={s.grelha}>
      {DESTINOS_DIA.map(c => <article key={c.id} className={`${css.cartao} ${s.cartaoDestino}`}>
        <div className={s.foto}>
          <img src={c.foto.url} alt={`${c.destino}, ${c.pais}`} loading="lazy" />
          <span className={s.badge}>Promoção do dia</span>
        </div>
        <span className={s.fonte}>{c.fonte}</span>
        <h2>{c.destino}<small>{c.pais}</small></h2>
        <p className={s.hotel}>{c.hotel} · {"★".repeat(c.estrelas)}</p>
        <dl className={s.dados}>
          <div><dt>Regime</dt><dd>{c.regime}</dd></div>
          <div><dt>Partida</dt><dd>{c.partida}</dd></div>
          <div><dt>Datas</dt><dd>{dataPt(c.ida)} – {dataPt(c.regresso)}</dd></div>
          <div><dt>Duração</dt><dd>{noites(c.ida, c.regresso)} noites</dd></div>
        </dl>
        <p className={s.preco}>Desde<strong>{euros(c.precoPessoa)}</strong>/ pessoa<small>Total para {c.viajantes} viajantes: {euros(c.precoTotal)}</small></p>
        <button type="button" className={css.primario} onClick={() => aoCriarTemplate(dadosReservaDestinoDia(c))}>Criar template com este destino</button>
        <small className={s.creditoFoto}>Foto: <a href={c.foto.origem} target="_blank" rel="noopener noreferrer">{c.foto.credito}</a></small>
      </article>)}
    </div>
    <p className={css.nota}>Os preços e o hotel vêm da pesquisa mais recente no motor de Operadores do MyOffice e servem de base para testar a publicação diária. Confirma sempre a disponibilidade antes de enviar à equipa. As fotografias são de domínio público/CC0, com crédito. Ao clicar em “Criar template”, estes dados abrem diretamente a secção Criar templates — só é preciso escolher a referência.</p>
  </div>;
}
