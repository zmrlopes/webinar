"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import { lerEmailGuardado } from "../armazenamento";
import { CoreRankNovaArea } from "../nova-area/core-rank";
import css from "./core-rank-pagina.module.css";

export function CoreRankPaginaAtual() {
  const [conta, setConta] = useState<{ email: string; nome: string } | null>(null);
  const [mensagem, setMensagem] = useState("A carregar o Core Rank…");

  useEffect(() => {
    const email = lerEmailGuardado()?.trim().toLowerCase();
    if (!email) {
      setMensagem("Primeiro identifica-te no painel do consultor.");
      return;
    }
    if (email !== EMAIL_PAINEL_DEMONSTRACAO) {
      setMensagem("Esta página está disponível apenas na conta de teste.");
      return;
    }
    const controller = new AbortController();
    void fetch("/api/consultor/nova-area", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    }).then(async resposta => {
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível carregar a conta.");
      if (!controller.signal.aborted) setConta({ email, nome: dados.nome });
    }).catch(erro => {
      if (!controller.signal.aborted) setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar a conta.");
    });
    return () => controller.abort();
  }, []);

  return <main className={css.pagina}>
    <Link href="/consultor" className={css.voltar}>← Voltar à área atual</Link>
    {conta ? <CoreRankNovaArea email={conta.email} nome={conta.nome} /> : <p role="status">{mensagem}</p>}
  </main>;
}
