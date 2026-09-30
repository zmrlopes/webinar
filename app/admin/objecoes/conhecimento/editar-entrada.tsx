"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TEMAS_CONHECIMENTO } from "@/lib/formacoes-temas";

/** Corrigir o conhecimento tirado de uma aula (texto e temas), ou tirá-la da base. */
export function EditarEntrada({
  id,
  resumo,
  temas,
}: {
  id: string;
  resumo: string;
  temas: string[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(resumo);
  const [escolhidos, setEscolhidos] = useState<string[]>(temas);
  const [aTrabalhar, setATrabalhar] = useState(false);
  const [erro, setErro] = useState("");

  async function guardar(): Promise<void> {
    setATrabalhar(true);
    setErro("");
    const r = await fetch("/api/admin/formacoes-conhecimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: [{ id, resumo: texto, temas: escolhidos }],
      }),
    }).catch(() => null);
    setATrabalhar(false);
    if (!r?.ok) return setErro("não foi possível gravar");
    setAberto(false);
    router.refresh();
  }

  async function apagar(): Promise<void> {
    setATrabalhar(true);
    const r = await fetch(
      `/api/admin/formacoes-conhecimento?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ).catch(() => null);
    setATrabalhar(false);
    if (!r?.ok) return setErro("não foi possível apagar");
    router.refresh();
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className="bf-botao"
        onClick={() => setAberto(true)}
      >
        Corrigir
      </button>
    );
  }

  return (
    <div className="bf-editar">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={12}
      />
      <div className="bf-temas-edit">
        {TEMAS_CONHECIMENTO.map((t) => (
          <label key={t.id}>
            <input
              type="checkbox"
              checked={escolhidos.includes(t.id)}
              onChange={(e) =>
                setEscolhidos((atual) =>
                  e.target.checked
                    ? [...atual, t.id]
                    : atual.filter((x) => x !== t.id),
                )
              }
            />{" "}
            {t.nome}
          </label>
        ))}
      </div>
      {erro && <p className="ob-erro">{erro}</p>}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="bf-botao bf-primario"
          disabled={aTrabalhar}
          onClick={guardar}
        >
          Guardar
        </button>
        <button
          type="button"
          className="bf-botao"
          disabled={aTrabalhar}
          onClick={() => setAberto(false)}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="ob-apagar"
          disabled={aTrabalhar}
          onClick={apagar}
        >
          Tirar da base
        </button>
      </div>
    </div>
  );
}
