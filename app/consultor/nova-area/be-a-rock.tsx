"use client";

import { useEffect, useState } from "react";
import { BE_A_ROCK, ROTULO_ZONA_BE_A_ROCK, ZONAS_BE_A_ROCK, type ZonaBeARock } from "@/lib/be-a-rock";
import estilos from "./nova-area.module.css";
import s from "./eventos.module.css";

export function SondagemBeARock({ email }: { email: string }) {
  const [voto, setVoto] = useState<ZonaBeARock | null>(null);
  const [carregar, setCarregar] = useState(true);
  const [guardar, setGuardar] = useState<ZonaBeARock | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [confirmacao, setConfirmacao] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setCarregar(true);
    setErro("");
    void fetch("/api/consultor/nova-area/eventos/be-a-rock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, acao: "consultar" }), signal: controller.signal,
    }).then(async r => {
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível consultar o teu voto.");
      if (!controller.signal.aborted) { setVoto(corpo.voto); setCarregar(false); }
    }).catch(falha => {
      if (!controller.signal.aborted) { setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente."); setCarregar(false); }
    });
    return () => controller.abort();
  }, [email, tentativa]);

  async function votar(zona: ZonaBeARock) {
    if (guardar || carregar) return;
    setGuardar(zona); setErro(""); setConfirmacao("");
    try {
      const r = await fetch("/api/consultor/nova-area/eventos/be-a-rock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, acao: "votar", zona }),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível guardar o teu voto.");
      setVoto(corpo.voto); setConfirmacao(`Voto guardado: ${ROTULO_ZONA_BE_A_ROCK[corpo.voto as ZonaBeARock]}.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setGuardar(null); }
  }

  return <article className={s.cartao} aria-labelledby="titulo-be-a-rock">
    <span className={estilos.etiqueta}><img className={s.logo} src="/icligo-logo.png" alt="" width={20} height={20} />EVENTO ICLIGO</span>
    <h2 id="titulo-be-a-rock">{BE_A_ROCK.titulo}</h2>
    <p className={s.data}><time dateTime={BE_A_ROCK.inicio}>8</time> a <time dateTime={BE_A_ROCK.fim}>10 de janeiro de 2027</time></p>
    <p className={s.descricao}>{BE_A_ROCK.descricao}</p>
    <p className={s.pergunta}>Como vais assistir ao Be a Rock?</p>
    <div className={s.opcoesSondagem} role="group" aria-label="Votar na zona do encontro">
      {ZONAS_BE_A_ROCK.map(zona => <button key={zona} type="button" className={s.opcaoSondagem} aria-pressed={voto === zona} disabled={carregar || guardar !== null} onClick={() => void votar(zona)}>
        {guardar === zona ? "A guardar…" : ROTULO_ZONA_BE_A_ROCK[zona]}{voto === zona && <span aria-hidden="true"> ✓</span>}
      </button>)}
    </div>
    <p className={s.estadoSondagem} role="status">{carregar ? "A consultar o teu voto…" : confirmacao || (voto ? `A tua escolha: ${ROTULO_ZONA_BE_A_ROCK[voto]}. Podes alterar o teu voto.` : "Escolhe NORTE, SUL ou Vejo em casa para registar o teu interesse.")}</p>
    {erro && <div className={s.erro} role="alert"><p>{erro}</p><button type="button" className={estilos.botaoSecundario} disabled={guardar !== null} onClick={() => setTentativa(n => n + 1)}>Consultar novamente</button></div>}
    <p className={s.nota}>Um voto por consultor. Esta sondagem serve para organizar o encontro e não substitui a inscrição no evento.</p>
  </article>;
}
