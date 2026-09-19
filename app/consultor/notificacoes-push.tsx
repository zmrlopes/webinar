"use client";

import { useEffect, useState } from "react";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";

/**
 * Regista o service worker (public/sw.js) assim que o painel carrega —
 * precisa de estar ativo antes de se poder subscrever notificações ou
 * instalar a app. Silencioso a falhar: browsers sem suporte (ex: alguns
 * webviews) simplesmente não ganham a funcionalidade, sem rebentar o
 * resto do painel.
 */
function registarServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

/** A chave pública VAPID vem em base64url — o PushManager precisa dela como bytes crus. */
function base64UrlParaBytes(base64Url: string): ArrayBuffer {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const bruto = atob(base64);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0))).buffer;
}

type EstadoPush = "a-verificar" | "sem-suporte" | "pronto" | "a-ativar" | "ativo" | "recusado" | "erro";

/**
 * Cartão para ativar notificações push e instalar a app no ecrã principal.
 * As duas coisas vivem juntas porque, na prática, só fazem sentido em
 * conjunto: notificações sem a app instalada ainda funcionam, mas o pedido
 * todo faz mais sentido apresentado como um só passo.
 */
export function NotificacoesPush({ email }: { email: string }) {
  const [estadoPush, setEstadoPush] = useState<EstadoPush>("a-verificar");
  const [erro, setErro] = useState<string | null>(null);
  const [promptInstalacao, setPromptInstalacao] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [appInstalada, setAppInstalada] = useState(false);
  const [teste, setTeste] = useState<"pronto" | "a-enviar" | "enviado" | "erro">("pronto");

  useEffect(() => {
    registarServiceWorker();

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setAppInstalada(true);
    }

    const aoPedirInstalacao = (evento: Event): void => {
      evento.preventDefault();
      setPromptInstalacao(evento as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", aoPedirInstalacao);

    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstadoPush("sem-suporte");
    } else if (Notification.permission === "denied") {
      setEstadoPush("recusado");
    } else {
      navigator.serviceWorker.ready
        .then((registo) => registo.pushManager.getSubscription())
        .then((subscricao) => setEstadoPush(subscricao ? "ativo" : "pronto"))
        .catch(() => setEstadoPush("pronto"));
    }

    return () => window.removeEventListener("beforeinstallprompt", aoPedirInstalacao);
  }, []);

  async function ativarNotificacoes(): Promise<void> {
    const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!chavePublica) {
      setEstadoPush("erro");
      setErro("notificações ainda não configuradas");
      return;
    }

    setEstadoPush("a-ativar");
    setErro(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstadoPush(permissao === "denied" ? "recusado" : "pronto");
        return;
      }

      const registo = await navigator.serviceWorker.ready;
      const subscricao = await registo.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaBytes(chavePublica),
      });
      const dados = subscricao.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

      const resposta = await fetch("/api/consultor/push/subscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, endpoint: dados.endpoint, keys: dados.keys }),
      });
      if (!resposta.ok) throw new Error("o servidor não aceitou a subscrição");

      setEstadoPush("ativo");
    } catch {
      setEstadoPush("erro");
      setErro("não foi possível ativar — tenta outra vez");
    }
  }

  async function instalarApp(): Promise<void> {
    if (!promptInstalacao) return;
    await promptInstalacao.prompt();
    setPromptInstalacao(null);
  }

  async function enviarTeste(): Promise<void> {
    setTeste("a-enviar");
    try {
      const resposta = await fetch("/api/consultor/push/teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setTeste(resposta.ok ? "enviado" : "erro");
    } catch {
      setTeste("erro");
    }
  }

  const ehPainelDemonstracao = email === EMAIL_PAINEL_DEMONSTRACAO;

  // No painel de demonstração o cartão nunca desaparece — precisa de ficar
  // sempre à mão para se poder testar o botão de notificação de teste,
  // mesmo depois de já estar tudo instalado e ativado.
  if (!ehPainelDemonstracao) {
    if (estadoPush === "sem-suporte" && appInstalada) return null;
    if (estadoPush === "a-verificar") return null;
    if (estadoPush === "ativo" && appInstalada) return null;
  }

  return (
    <div className="vqb-aviso-destaque" style={{ marginTop: "1rem" }}>
      <span className="vqb-destaque-etiqueta">App e notificações</span>
      <p className="vqb-destaque-texto" style={{ marginBottom: "1rem" }}>
        Instala o painel no ecrã principal do telemóvel e recebe aqui os mesmos avisos que já chegam por
        email — nova sessão disponível, uma lead a inscrever-se pelo teu link, lembretes da equipa.
      </p>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {!appInstalada && promptInstalacao && (
          <button type="button" onClick={instalarApp} className="vqb-destaque-botao">
            Instalar no telemóvel
          </button>
        )}

        {estadoPush === "pronto" && (
          <button type="button" onClick={ativarNotificacoes} className="vqb-destaque-botao">
            Ativar notificações
          </button>
        )}
        {estadoPush === "a-ativar" && (
          <span className="vqb-destaque-texto" style={{ marginBottom: 0 }}>
            A ativar…
          </span>
        )}
        {estadoPush === "ativo" && (
          <span className="vqb-destaque-texto" style={{ marginBottom: 0, color: "#0ca30c" }}>
            ✓ Notificações ativas
          </span>
        )}
        {estadoPush === "ativo" && ehPainelDemonstracao && (
          <button
            type="button"
            onClick={enviarTeste}
            disabled={teste === "a-enviar"}
            className="vqb-destaque-botao"
            style={{ background: "#3a2f77" }}
          >
            {teste === "a-enviar" ? "A enviar…" : "Enviar notificação de teste"}
          </button>
        )}
        {teste === "enviado" && (
          <span className="vqb-destaque-texto" style={{ marginBottom: 0, color: "#0ca30c" }}>
            Enviada — devias vê-la a chegar em segundos.
          </span>
        )}
        {teste === "erro" && (
          <span className="vqb-destaque-texto" style={{ marginBottom: 0, color: "#c0392b" }}>
            Falhou — se acabaste de ativar, tenta outra vez daqui a pouco.
          </span>
        )}
        {estadoPush === "recusado" && (
          <span className="vqb-destaque-texto" style={{ marginBottom: 0 }}>
            As notificações estão bloqueadas para este site — para ativar, muda a permissão nas
            definições do browser (junto ao endereço do site).
          </span>
        )}
      </div>

      {!appInstalada && !promptInstalacao && (
        <p className="vqb-destaque-texto" style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: "0.85rem" }}>
          No iPhone: toca no ícone de partilha do Safari e escolhe &quot;Adicionar ao ecrã principal&quot;.
        </p>
      )}
      {erro && (
        <p className="vqb-destaque-texto" style={{ marginTop: "0.5rem", marginBottom: 0, color: "#c0392b" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
