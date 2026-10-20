"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { podeVerCalendarioCriativo } from "@/lib/calendario-criativo";
import { lerEmailGuardado } from "../armazenamento";
import { CalendarioCriativo } from "../nova-area/calendario-criativo";
import css from "../core-rank/core-rank-pagina.module.css";

export default function PaginaCalendarioCriativo() {
  const [email, setEmail] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("A carregar o calendário…");

  useEffect(() => {
    const conta = lerEmailGuardado()?.trim().toLowerCase();
    if (!conta) setMensagem("Primeiro identifica-te no painel do consultor.");
    else if (!podeVerCalendarioCriativo(conta)) setMensagem("Este calendário ainda está em preparação.");
    else setEmail(conta);
  }, []);

  return <main className={css.pagina}>
    <Link href="/consultor" className={css.voltar}>← Voltar à área atual</Link>
    {email ? <CalendarioCriativo email={email} /> : <p role="status">{mensagem}</p>}
  </main>;
}
