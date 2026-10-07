"use client";

import { useState } from "react";
import type { ResultadoConsultor } from "@/lib/eventos-dashboard";
import styles from "./eventos.module.css";

const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
export function EventosConsultores({ consultores }: { consultores: ResultadoConsultor[] }): React.JSX.Element {
  const [pesquisa, setPesquisa] = useState("");
  const [ordem, setOrdem] = useState("eventos");
  const linhas = consultores.filter(p => normalizar(p.nome).includes(normalizar(pesquisa.trim())))
    .sort((a, b) => (ordem === "nome" ? 0 : b[ordem as "eventos" | "faturacao" | "diretos"] - a[ordem as "eventos" | "faturacao" | "diretos"]) || a.nome.localeCompare(b.nome, "pt"));
  return <div>
    <div className={styles.controls}>
      <label>Procurar consultor<input type="search" value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Nome do consultor" /></label>
      <label>Ordenar por<select value={ordem} onChange={e => setOrdem(e.target.value)}><option value="eventos">Mais eventos</option><option value="faturacao">Maior faturação</option><option value="diretos">Mais TPs diretos</option><option value="nome">Nome</option></select></label>
    </div>
    <div className={styles.tableWrap}><table className={styles.table}>
      <caption>Consultores incluídos na comparação</caption>
      <thead><tr><th scope="col">Consultor</th><th scope="col">Inscrições em eventos</th><th scope="col">Faturação própria</th><th scope="col">TPs diretos</th></tr></thead>
      <tbody>{linhas.map(p => <tr key={p.email}><td>{p.nome}</td><td>{p.eventos || "Sem inscrição localizada"}</td><td>{p.faturacao.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td><td>{p.diretos}</td></tr>)}</tbody>
    </table></div>
    {!linhas.length && <p className={styles.empty}>Nenhum consultor encontrado.</p>}
  </div>;
}
