"use client";
import { useId } from "react";

const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT").trim();
export function correspondePesquisaTP(tp: {nome: string; email: string}, pesquisa: string) {
  const termos = normalizar(pesquisa).split(/\s+/).filter(Boolean);
  const texto = normalizar(`${tp.nome} ${tp.email}`);
  return termos.every(t => texto.includes(t));
}
export function PesquisaTPs({valor, alterar}: {valor: string; alterar: (v: string) => void}) {
  const id = useId();
  return <div style={{margin: "20px 0", display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap"}}>
    <label htmlFor={id} style={{display: "grid", gap: 6, flex: "1 1 250px", maxWidth: 460}}>Pesquisar TP por nome ou email
      <input id={id} type="search" placeholder="Nome ou email do TP" value={valor} onChange={e => alterar(e.target.value)}
        style={{padding: "10px 12px", border: "1px solid #90967b", borderRadius: 6, width: "100%", boxSizing: "border-box", font: "inherit"}} />
    </label>
    {valor && <button type="button" onClick={() => alterar("")} style={{padding: "10px 12px", border: "1px solid #4b5320", borderRadius: 6, color: "#4b5320", background: "white", cursor: "pointer"}}>Limpar pesquisa</button>}
  </div>;
}
