"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Lote {
  enviados: number;
  falhas: number;
  restantes: number;
}

const ESTILO_BOTAO: React.CSSProperties = {
  padding: "0.5rem 1.1rem",
  fontSize: "0.85rem",
  fontWeight: 700,
  border: "none",
  borderRadius: "0.3rem",
  cursor: "pointer",
};

/**
 * O teste vai só ao painel de demonstração. O envio a todos corre em lotes
 * a partir do browser (como o reenvio do aviso de uma sessão): nenhuma
 * função da Vercel aguenta a equipa toda de uma vez, e assim vê-se o
 * progresso. Se parar a meio, carregar outra vez continua de onde ficou.
 */
export function BotoesAvisoFormacoes({
  porAvisar,
  publicado,
  emailDemonstracao,
}: {
  porAvisar: number;
  publicado: boolean;
  emailDemonstracao: string;
}) {
  const router = useRouter();
  const [aEnviar, setAEnviar] = useState<"teste" | "todos" | null>(null);
  const [enviados, setEnviados] = useState(0);
  const [falhas, setFalhas] = useState(0);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function lote(teste: boolean): Promise<Lote> {
    const resposta = await fetch("/api/admin/formacoes-avisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teste }),
    });
    const dados = (await resposta.json()) as Lote & { erro?: string };
    if (!resposta.ok) throw new Error(dados.erro ?? "Falha desconhecida.");
    return dados;
  }

  async function enviarTeste(): Promise<void> {
    if (!window.confirm(`Enviar o email e a notificação de teste para ${emailDemonstracao}?`)) return;
    setAEnviar("teste");
    setErro(null);
    setMensagem(null);
    try {
      const dados = await lote(true);
      setMensagem(dados.enviados === 1 ? "Teste enviado." : "O teste falhou — vê os registos da Vercel.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha de rede — tenta outra vez.");
    } finally {
      setAEnviar(null);
    }
  }

  async function enviarTodos(): Promise<void> {
    if (!window.confirm(`Enviar o aviso das formações gravadas a ${porAvisar} consultor(es)?`)) return;
    setAEnviar("todos");
    setErro(null);
    setMensagem(null);
    let totalEnviados = 0;
    let totalFalhas = 0;
    try {
      for (;;) {
        const dados = await lote(false);
        totalEnviados += dados.enviados;
        totalFalhas += dados.falhas;
        setEnviados(totalEnviados);
        setFalhas(totalFalhas);
        setRestantes(dados.restantes);
        if (dados.restantes === 0) break;
        // Um lote sem ninguém processado e ainda com gente à espera só pode
        // ser um ciclo infinito — mais vale parar e dizer.
        if (dados.enviados + dados.falhas === 0) {
          throw new Error("O envio parou sem progredir — vê os registos da Vercel antes de tentar outra vez.");
        }
      }
      setMensagem(
        `Aviso enviado a ${totalEnviados} consultor(es)${totalFalhas > 0 ? `, com ${totalFalhas} falha(s)` : ""}.`,
      );
      router.refresh();
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Falha de rede a meio do envio — o que já saiu não se repete se carregares outra vez.",
      );
      router.refresh();
    } finally {
      setAEnviar(null);
    }
  }

  const podeTodos = publicado && porAvisar > 0;

  return (
    <div style={{ margin: "0 0 1.5rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={aEnviar !== null}
        onClick={enviarTeste}
        style={{ ...ESTILO_BOTAO, background: "#4b5320", color: "#ffffff" }}
      >
        {aEnviar === "teste" ? "A enviar…" : `Enviar teste para ${emailDemonstracao}`}
      </button>

      <button
        type="button"
        disabled={aEnviar !== null || !podeTodos}
        onClick={enviarTodos}
        style={{
          ...ESTILO_BOTAO,
          background: "transparent",
          color: "#4b5320",
          border: "1px solid #4b5320",
          opacity: podeTodos ? 1 : 0.5,
          cursor: podeTodos ? "pointer" : "default",
        }}
      >
        {aEnviar === "todos" ? "A enviar…" : `Avisar toda a equipa (${porAvisar})`}
      </button>

      <div style={{ flexBasis: "100%" }}>
        {!publicado && (
          <p className="ad-legenda" style={{ margin: "0.5rem 0 0" }}>
            O aviso a todos está travado enquanto as formações só aparecerem no painel de demonstração.
          </p>
        )}
        {aEnviar === "todos" && (
          <p className="ad-legenda" style={{ margin: "0.5rem 0 0" }}>
            {enviados} enviado(s){falhas > 0 && `, ${falhas} falhou(aram)`}
            {restantes !== null && ` · faltam ${restantes}`} — não feches esta página.
          </p>
        )}
        {mensagem && <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#0ca30c" }}>{mensagem}</p>}
        {erro && <p style={{ margin: "0.5rem 0 0", color: "#c0392b", fontSize: "0.9rem" }}>{erro}</p>}
      </div>
    </div>
  );
}
