"use client";

import { ObjecaoLead } from "../webinares/objecao-lead";
import estilos from "./assistente.module.css";

export function ObjecoesNovaArea({ email }: { email: string }) {
  return <section id="resolucao-objecoes" className={estilos.objecoes} aria-labelledby="titulo-resolucao-objecoes">
    <h2 id="titulo-resolucao-objecoes">Resolução de objeções</h2>
    <p>Escreve a dúvida da lead e recebe sugestões de resposta e um testemunho para o follow-up.</p>
    <ObjecaoLead email={email} />
  </section>;
}
