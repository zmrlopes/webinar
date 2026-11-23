"use client";

import { useEffect, useState } from "react";
import type { VotoBeARock } from "@/lib/be-a-rock";
import { ContagemBeARock } from "../../components/resultados-be-a-rock";
import s from "../../admin/eventos/be-a-rock.module.css";

export function AdminBeARock({ email }: { email: string }) {
  const [votos, setVotos] = useState<VotoBeARock[] | null>(null);
  const [erro, setErro] = useState("");
  const [atualizacao, setAtualizacao] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setVotos(null); setErro("");
    async function carregar() {
      try {
        const resposta = await fetch("/api/consultor/nova-area/eventos/be-a-rock/resultados", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }), signal: controller.signal, cache: "no-store",
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível carregar os resultados.");
        if (!controller.signal.aborted) { setVotos(dados.votos); setErro(""); }
      } catch (e) {
        if (!controller.signal.aborted) { setVotos(null); setErro(e instanceof Error ? e.message : "Falha de ligação."); }
      }
    }
    void carregar();
    const aoFocar = () => void carregar();
    window.addEventListener("focus", aoFocar);
    return () => { controller.abort(); window.removeEventListener("focus", aoFocar); };
  }, [email, atualizacao]);

  return <section className={s.cartao} aria-label="Resultados Be a Rock da equipa da Ana Custódia">
    {votos ? <ContagemBeARock votos={votos} equipa="Equipa da Ana Custódia" /> : <h2 className={s.titulo}>Be a Rock · Resultados da equipa</h2>}
    {erro ? <p role="alert">{erro}</p> : votos === null && <p role="status">A carregar os votos da equipa…</p>}
    <button type="button" onClick={() => setAtualizacao(n => n + 1)}>{erro ? "Tentar novamente" : "Atualizar resultados"}</button>
  </section>;
}
