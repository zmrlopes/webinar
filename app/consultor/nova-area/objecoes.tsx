"use client";

import { ObjecaoLead } from "../webinares/objecao-lead";
import estilos from "./nova-area.module.css";

export function ObjecoesNovaArea({ email }: { email: string }) {
  return <section id="resolucao-objecoes" aria-label="Resolução de objeções">
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>A MINHA ORGANIZAÇÃO</span>
      <h1>Resolução de objeções<span>.</span></h1>
      <p>Escreve a dúvida da lead e recebe sugestões de resposta e um testemunho para o follow-up.</p>
    </div>
    <ObjecaoLead email={email} />
  </section>;
}
