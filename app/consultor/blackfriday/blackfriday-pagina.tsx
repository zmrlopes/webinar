"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BlackFriday } from "../nova-area/blackfriday";
import { lerEmailGuardado } from "../armazenamento";
import css from "./blackfriday-pagina.module.css";

export function BlackFridayPaginaAtual() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { setEmail(lerEmailGuardado()?.trim().toLowerCase() ?? ""); }, []);

  return <main className={css.pagina}>
    <Link href="/consultor" className={css.voltar}>← Voltar à área atual</Link>
    {email === null ? <p role="status">A carregar…</p>
      : !email ? <p>Primeiro identifica-te no painel do consultor.</p>
      : <BlackFriday email={email} />}
  </main>;
}
