"use client";

import { useState, type ReactNode } from "react";

type Inscrito = { nome: string; email: string; dataRegisto: string | null };

export function SeparadoresEvento({ inscritos, children }: { inscritos: Inscrito[]; children: ReactNode }) {
  const [aba, setAba] = useState("geral");
  const [pesquisa, setPesquisa] = useState("");
  const [ano, setAno] = useState("");
  const anoDe = (i: Inscrito) => i.dataRegisto?.slice(0, 4) ?? "Sem data";
  const anos = [...new Set(inscritos.map(anoDe))].sort((a, b) => a.localeCompare(b));
  const termo = pesquisa.trim().toLocaleLowerCase("pt-PT");
  const visiveis = inscritos.filter(i => (!ano || anoDe(i) === ano) &&
    (!termo || `${i.nome} ${i.email}`.toLocaleLowerCase("pt-PT").includes(termo)));
  const grupos = anos.map(a => ({ ano: a, pessoas: visiveis.filter(i => anoDe(i) === a)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT")) })).filter(g => g.pessoas.length);

  return <>
    <div role="tablist" aria-label="Informação do evento" style={{ display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #ddd", paddingBottom: 12, marginBottom: 20 }}>
      {[{ id: "geral", titulo: "Geral" }, { id: "registos", titulo: "Inscritos por ano de registo" }].map(tab =>
        <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={aba === tab.id}
          aria-controls={`painel-${tab.id}`} onClick={() => setAba(tab.id)}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #4b5320", background: aba === tab.id ? "#4b5320" : "#fff", color: aba === tab.id ? "#fff" : "#4b5320", cursor: "pointer", fontWeight: 700 }}>
          {tab.titulo}
        </button>)}
    </div>
    <div id="painel-geral" role="tabpanel" aria-labelledby="tab-geral" hidden={aba !== "geral"}>{children}</div>
    <div id="painel-registos" role="tabpanel" aria-labelledby="tab-registos" hidden={aba !== "registos"}>
      <h2>Inscritos por ano de registo</h2>
      <p className="ad-legenda">Lista nominal agrupada pelo ano de entrada como consultor, não pela data de inscrição no evento. Cada email aparece uma vez; os acompanhantes não são identificados individualmente.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, margin: "20px 0" }}>
        <label style={{ display: "grid", gap: 6 }}>Pesquisar por nome ou email
          <input type="search" value={pesquisa} onChange={e => setPesquisa(e.target.value)} style={{ padding: 10, border: "1px solid #aaa", borderRadius: 6, maxWidth: "100%" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>Ano de registo
          <select value={ano} onChange={e => setAno(e.target.value)} style={{ padding: 10, border: "1px solid #aaa", borderRadius: 6 }}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <p aria-live="polite">{visiveis.length} de {inscritos.length} inscritos</p>
      {grupos.map(g => <section key={g.ano} aria-label={`Ano de registo: ${g.ano}`}>
        <h3 style={{ color: "#4b5320", marginTop: 28 }}>{g.ano} · {g.pessoas.length} {g.pessoas.length === 1 ? "inscrito" : "inscritos"}</h3>
        <div className="ad-tabela-wrap"><table className="ad-tabela" style={{ minWidth: 560 }}>
          <thead><tr><th scope="col">Nome</th><th scope="col">Email</th><th scope="col">Data de registo como consultor</th></tr></thead>
          <tbody>{g.pessoas.map(i => <tr key={i.email}><td>{i.nome}</td><td>{i.email}</td>
            <td>{i.dataRegisto ? i.dataRegisto.split("-").reverse().join("/") : "Sem data disponível"}</td></tr>)}</tbody>
        </table></div>
      </section>)}
      {!visiveis.length && <p>Não há inscritos para os filtros selecionados.</p>}
      <p className="ad-legenda" style={{ marginTop: 24 }}>As datas vêm do registo da equipa. Quando não existe uma data associada ao email, o inscrito aparece em «Sem data».</p>
    </div>
  </>;
}
