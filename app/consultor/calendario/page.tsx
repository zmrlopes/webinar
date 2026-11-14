"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerEmailGuardado } from "../armazenamento";
import { CalendarioConsultor } from "../nova-area/calendario";
import css from "../core-rank/core-rank-pagina.module.css";

// Calendário publicado para todos os consultores da equipa na área atual;
// reutiliza o mesmo componente e a mesma API da nova área.
export default function PaginaCalendario() {
  const [email, setEmail] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("A carregar o calendário…");

  useEffect(() => {
    const conta = lerEmailGuardado()?.trim().toLowerCase();
    if (!conta) setMensagem("Primeiro identifica-te no painel do consultor.");
    else setEmail(conta);
  }, []);

  return <main className={css.pagina}>
    <Link href="/consultor" className={css.voltar}>← Voltar à área atual</Link>
    {email ? <CalendarioConsultor email={email} nome={null} /> : <p role="status">{mensagem}</p>}
  </main>;
}
