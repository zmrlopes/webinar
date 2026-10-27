"use client";

import { useState } from "react";
import type { ProximoWebinarNovaArea } from "@/lib/consultor-nova-area";
import estilos from "./nova-area.module.css";

export function ProximoWebinar({ webinar, email, aoInscrever }: {
  webinar: ProximoWebinarNovaArea | null; email: string; aoInscrever: () => void;
}) {
  const [aPedir, setAPedir] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  async function pedirWebinar() {
    if (!webinar || aPedir) return;
    setAPedir(true);
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/webinar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok || typeof corpo.url !== "string") throw new Error(corpo.erro ?? "Não foi possível preparar o teu acesso. Tenta novamente.");
      if (!webinar.inscrito) { aoInscrever(); setConfirmado(true); }
      else window.location.href = corpo.url;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setAPedir(false); }
  }

  return (
    <section id="proximo-webinar" aria-labelledby="titulo-proximo-webinar">
      <div className={estilos.intro}>
        <span className={estilos.etiqueta}>A MINHA ORGANIZAÇÃO</span>
        <h1 id="titulo-proximo-webinar">Próximo webinar<span>.</span></h1>
        <p>Consulta a próxima sessão e garante o teu acesso.</p>
      </div>
      {webinar ? <article className={estilos.cartaoOrganizacao} aria-labelledby="nome-webinar">
        <div className={estilos.webinarTopo}><span className={estilos.presencaFeita}>Sessão online</span><span>Próximo webinar</span></div>
        <h2 id="nome-webinar" className={estilos.webinarTitulo}>{webinar.titulo}</h2>
        <div className={estilos.webinarData}>
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M7 3v4m10-4v4M3 11h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <time dateTime={webinar.comecaEm}>{new Date(webinar.comecaEm).toLocaleString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" })}</time>
        </div>
        {webinar.duracaoMinutos > 0 && <p className={estilos.webinarDuracao}>Duração prevista: {webinar.duracaoMinutos} minutos · Hora de Portugal</p>}
        <p className={estilos.descricaoOrganizacao}>{webinar.inscrito ? "Já estás inscrito — o link também ficou no teu email." : "Inscreve-te para receberes o link por email. Depois, volta aqui para entrar no webinar."}</p>
        <button type="button" className={estilos.botao} onClick={() => void pedirWebinar()} disabled={aPedir}>{aPedir ? "A preparar…" : webinar.inscrito ? "Entrar no webinar" : "Inscrever"}<span aria-hidden="true">→</span></button>
        {confirmado && <p className={estilos.webinarConfirmado} role="status">✓ Inscrição confirmada. O link será enviado para o teu email.</p>}
        {erro && <p className={estilos.erroOrganizacao} role="alert">{erro}</p>}
      </article> : <div className={estilos.cartaoOrganizacao}><div className={estilos.vazioOrganizacao}><strong>Sem webinar agendado de momento</strong><p>A próxima sessão aparece aqui assim que estiver disponível.</p></div></div>}
    </section>
  );
}
