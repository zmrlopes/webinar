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
  const todos100 = grupos.find(g => g.chave === "faturacao-100k")?.entregar ?? [];
  const palco100 = todos100.filter(i => i.vendas !== null && i.vendas < 250000);
  const palco100Visiveis = palco100.filter(i => correspondePesquisaTP(i, pesquisa));
  const levantarDepois = todos100.length - palco100.length;
  return <>
    <div className={s.resumo}>{grupos.map(g => <div key={g.chave}><span>Troféus {g.titulo} a entregar</span><strong>{g.entregar.length}</strong><small>{g.confirmar.length} TP(s) com receção por confirmar</small></div>)}</div>
    <PesquisaTPs valor={pesquisa} alterar={setPesquisa} />
    {pesquisa && <p role="status">{new Set(grupos.flatMap(g => [...g.entregar,...g.confirmar]).filter(i => correspondePesquisaTP(i,pesquisa)).map(i=>i.email)).size} TP(s) encontrado(s).</p>}
    <section className={s.grupo} aria-labelledby="titulo-100k-palco">
      <h2 id="titulo-100k-palco">100K — chamada a palco · {pesquisa ? `${palco100Visiveis.length} de ` : ""}{palco100.length} TP(s)</h2>
      <p>Apenas quem tem o troféu de 100K por receber e faturação própria acumulada entre 100.000 € e menos de 250.000 €.</p>
      <Tabela pessoas={palco100Visiveis} vazia={pesquisa ? "Não há TPs para esta pesquisa na chamada de 100K." : "Não há TPs para chamar a palco pelo troféu de 100K."} />
      <p className={s.nota}>{levantarDepois} TP(s) da lista completa de 100K já atingiram 250.000 € ou mais: não são chamados a palco pelo troféu de 100K e levantam-no depois. Mantêm-se na lista completa de entrega abaixo, mesmo que já tenham recebido o de 250K.</p>
    </section>
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
