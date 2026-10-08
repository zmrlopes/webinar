"use client";

import { useState } from "react";

export function ImportacaoForum() {
  const [aAtualizar, setAAtualizar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  async function atualizar() {
    setAAtualizar(true); setMensagem("");
    try {
      const r = await fetch("/api/admin/formacoes-externas/sincronizar", { method: "POST" });
      const dados = await r.json();
      setErro(!r.ok);
      setMensagem(r.ok ? `${dados.quantidade} formações importadas do fórum. O calendário da conta de teste está atualizado.` : dados.erro);
    } catch { setErro(true); setMensagem("Falha de ligação. Tenta novamente."); }
    finally { setAAtualizar(false); }
  }
  return <section className="fe-cartao" style={{ marginBottom: "1.5rem" }} aria-labelledby="titulo-importacao-forum">
    <h2 id="titulo-importacao-forum" style={{ marginTop: 0, fontSize: "1.1rem" }}>Importação automática do fórum iCliGo</h2>
    <p className="ad-subtitulo">As formações online de todas as línguas são atualizadas de hora a hora, com as bandeiras e os horários de Portugal. Aparecem apenas no calendário da nova área da conta de teste.</p>
    <button type="button" disabled={aAtualizar} onClick={() => void atualizar()}>{aAtualizar ? "A consultar o fórum…" : "Atualizar agora"}</button>
    {mensagem && <p role="status" className={erro ? "fe-erro" : "ad-subtitulo"} style={{ margin: "1rem 0 0" }}>{mensagem}</p>}
  </section>;
}
