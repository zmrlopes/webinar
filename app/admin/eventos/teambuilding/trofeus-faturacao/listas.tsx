"use client";
import { useState } from "react";
import type { InscritoFaturacao } from "@/lib/teambuilding";
import { listasTrofeusFaturacao } from "@/lib/trofeus-faturacao-evento";
import { PesquisaTPs, correspondePesquisaTP } from "../../../pesquisa-tps";
import s from "./pagina.module.css";

const euro = (v: number | null) => v === null ? "Sem dados" : new Intl.NumberFormat("pt-PT", {style: "currency", currency: "EUR"}).format(v);
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-PT", {timeZone: "Europe/Lisbon"}).format(new Date(v)) : "Sem data";
function Tabela({pessoas, vazia}: {pessoas: InscritoFaturacao[]; vazia: string}) {
  if (!pessoas.length) return <p>{vazia}</p>;
  return <div className={s.tabela}><table>
    <thead><tr><th scope="col">TP</th><th scope="col">Patamar atual</th><th scope="col">Faturação própria acumulada</th><th scope="col">Dados de</th></tr></thead>
    <tbody>{pessoas.map(i => <tr key={i.email}><td><strong>{i.nome}</strong><small>{i.email}</small></td><td>{i.nivel ?? "Sem patamar"}</td><td>{euro(i.vendas)}</td><td>{data(i.atualizadoEm)}</td></tr>)}</tbody>
  </table></div>;
}
export function ListasFaturacao({inscritos}: {inscritos: InscritoFaturacao[]}) {
  const [pesquisa, setPesquisa] = useState("");
  const grupos = listasTrofeusFaturacao(inscritos);
  return <>
    <div className={s.resumo}>{grupos.map(g => <div key={g.chave}><span>Troféus {g.titulo} a entregar</span><strong>{g.entregar.length}</strong><small>{g.confirmar.length} TP(s) com receção por confirmar</small></div>)}</div>
    <PesquisaTPs valor={pesquisa} alterar={setPesquisa} />
    {pesquisa && <p role="status">{new Set(grupos.flatMap(g => [...g.entregar,...g.confirmar]).filter(i => correspondePesquisaTP(i,pesquisa)).map(i=>i.email)).size} TP(s) encontrado(s).</p>}
    {grupos.map(g => {
      const entregar = g.entregar.filter(i => correspondePesquisaTP(i, pesquisa));
      const confirmar = g.confirmar.filter(i => correspondePesquisaTP(i, pesquisa));
      return <section key={g.chave} className={s.grupo} aria-labelledby={`titulo-${g.chave}`}>
        <h2 id={`titulo-${g.chave}`}>Troféu {g.titulo} · {pesquisa ? `${entregar.length} de ` : ""}{g.entregar.length} a entregar</h2>
        <Tabela pessoas={entregar} vazia={pesquisa ? "Não há TPs a entregar para esta pesquisa." : "Nenhum inscrito com este troféu em falta nas respostas disponíveis."} />
        {g.confirmar.length > 0 && <details className={s.confirmar}>
          <summary>Receção por confirmar · {pesquisa ? `${confirmar.length} de ` : ""}{g.confirmar.length}</summary>
          <p>Estes TPs atingiram o valor, mas ainda não responderam ao questionário. Confirma se já receberam o troféu antes de os incluir na entrega. Não estão somados à quantidade a entregar.</p>
          <Tabela pessoas={confirmar} vazia="Não há TPs por confirmar para esta pesquisa." />
        </details>}
      </section>;
    })}
  </>;
}
