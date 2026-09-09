"use client";

import { useState } from "react";

export function DiretrizesGerais({ inicial }: { inicial: string }) {
  const [conteudo, setConteudo] = useState(inicial);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [erro, setErro] = useState("");

  async function guardar(): Promise<void> {
    setAGuardar(true);
    setErro("");
    setGuardado(false);
    try {
      const resposta = await fetch("/api/admin/objecoes/diretrizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo }),
      });
      if (!resposta.ok) {
        setErro("não foi possível gravar");
        return;
      }
      setGuardado(true);
    } catch {
      setErro("falha de ligação — tenta outra vez");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="ob-cartao ob-cartao-diretrizes">
      <div className="ob-campo">
        <label htmlFor="ob-diretrizes">Diretrizes gerais (aplicam-se sempre, a todas as dúvidas)</label>
        <textarea
          id="ob-diretrizes"
          value={conteudo}
          onChange={(e) => {
            setConteudo(e.target.value);
            setGuardado(false);
          }}
          placeholder="ex: Fala sempre em tom próximo e informal. Nunca prometas valores de ganhos. Termina sempre a convidar para uma chamada com o consultor..."
        />
      </div>
      {erro && <p className="ob-erro">{erro}</p>}
      {guardado && !erro && <p className="ob-resultado">Guardado.</p>}
      <button type="button" disabled={aGuardar} onClick={guardar}>
        {aGuardar ? "A guardar…" : "Guardar diretrizes gerais"}
      </button>
    </div>
  );
}
