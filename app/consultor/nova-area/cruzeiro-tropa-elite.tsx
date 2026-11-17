"use client";

import { useEffect, useState } from "react";
import {
  CRUZEIRO_TROPA_ELITE,
  MAXIMO_ACOMPANHANTES_CRUZEIRO,
  OPCOES_CRUZEIRO_TROPA_ELITE,
  opcaoIncluiCruzeiro,
  ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE,
  type OpcaoCruzeiroTropaElite,
  type VotoCruzeiroTropaElite,
} from "@/lib/cruzeiro-tropa-elite";
import estilos from "./nova-area.module.css";
import s from "./eventos.module.css";

export function SondagemCruzeiroTropaElite({ email }: { email: string }) {
  const [voto, setVoto] = useState<VotoCruzeiroTropaElite | null>(null);
  const [carregar, setCarregar] = useState(true);
  const [guardar, setGuardar] = useState<OpcaoCruzeiroTropaElite | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [confirmacao, setConfirmacao] = useState("");
  const [acompanhantes, setAcompanhantes] = useState("0");
  const [aGuardarAcompanhantes, setAGuardarAcompanhantes] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCarregar(true);
    setErro("");
    void fetch("/api/consultor/nova-area/eventos/cruzeiro-tropa-elite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, acao: "consultar" }), signal: controller.signal,
    }).then(async r => {
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível consultar o teu voto.");
      if (!controller.signal.aborted) {
        setVoto(corpo.voto);
        setAcompanhantes(String(corpo.voto?.acompanhantes ?? 0));
        setCarregar(false);
      }
    }).catch(falha => {
      if (!controller.signal.aborted) { setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente."); setCarregar(false); }
    });
    return () => controller.abort();
  }, [email, tentativa]);

  async function votar(opcao: OpcaoCruzeiroTropaElite, numeroAcompanhantes: string): Promise<VotoCruzeiroTropaElite> {
    const r = await fetch("/api/consultor/nova-area/eventos/cruzeiro-tropa-elite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, acao: "votar", opcao, acompanhantes: Number(numeroAcompanhantes) || 0 }),
    });
    const corpo = await r.json();
    if (!r.ok) throw new Error(corpo.erro ?? "Não foi possível guardar o teu voto.");
    return corpo.voto;
  }

  async function escolher(opcao: OpcaoCruzeiroTropaElite) {
    if (guardar || carregar) return;
    setGuardar(opcao); setErro(""); setConfirmacao("");
    try {
      const novoVoto = await votar(opcao, opcaoIncluiCruzeiro(opcao) ? acompanhantes : "0");
      setVoto(novoVoto);
      setAcompanhantes(String(novoVoto.acompanhantes ?? 0));
      setConfirmacao(`Voto guardado: ${ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE[novoVoto.opcao as OpcaoCruzeiroTropaElite]}.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setGuardar(null); }
  }

  async function guardarAcompanhantes(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!voto || aGuardarAcompanhantes) return;
    setAGuardarAcompanhantes(true); setErro(""); setConfirmacao("");
    try {
      const novoVoto = await votar(voto.opcao, acompanhantes);
      setVoto(novoVoto);
      setAcompanhantes(String(novoVoto.acompanhantes ?? 0));
      setConfirmacao("Número de acompanhantes guardado.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setAGuardarAcompanhantes(false); }
  }

  return <article className={s.cartao} aria-labelledby="titulo-cruzeiro-tropa-elite">
    <span className={estilos.etiqueta}><img className={s.logo} src="/tropa-elite-logo.png" alt="" width={20} height={20} />EVENTO TROPA DE ELITE</span>
    <h2 id="titulo-cruzeiro-tropa-elite">{CRUZEIRO_TROPA_ELITE.titulo}</h2>
    <p className={s.data}><time dateTime={CRUZEIRO_TROPA_ELITE.inicio}>22</time> a <time dateTime={CRUZEIRO_TROPA_ELITE.fim}>29 de abril de 2027</time></p>
    <p className={s.descricao}>{CRUZEIRO_TROPA_ELITE.descricao}</p>
    <p className={s.pergunta}>Como queres participar?</p>
    <div className={s.opcoesSondagem} role="group" aria-label="Votar na preferência do Cruzeiro Tropa de Elite">
      {OPCOES_CRUZEIRO_TROPA_ELITE.map(opcao => <button key={opcao} type="button" className={s.opcaoSondagem} aria-pressed={voto?.opcao === opcao} disabled={carregar || guardar !== null} onClick={() => void escolher(opcao)}>
        {guardar === opcao ? "A guardar…" : ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE[opcao]}{voto?.opcao === opcao && <span aria-hidden="true"> ✓</span>}
      </button>)}
    </div>
    {voto && opcaoIncluiCruzeiro(voto.opcao) && <form className={s.acompanhantes} onSubmit={guardarAcompanhantes}>
      <label htmlFor="cruzeiro-acompanhantes">Vais levar acompanhantes? Quantos?</label>
      <div className={s.acompanhantesLinha}>
        <input id="cruzeiro-acompanhantes" type="number" min={0} max={MAXIMO_ACOMPANHANTES_CRUZEIRO} inputMode="numeric"
          value={acompanhantes} disabled={aGuardarAcompanhantes}
          onChange={evento => setAcompanhantes(evento.target.value)} />
        <button type="submit" className={estilos.botaoSecundario} disabled={aGuardarAcompanhantes}>{aGuardarAcompanhantes ? "A guardar…" : "Guardar"}</button>
      </div>
    </form>}
    <p className={s.estadoSondagem} role="status">{carregar ? "A consultar o teu voto…" : confirmacao || (voto ? `A tua escolha: ${ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE[voto.opcao]}. Podes alterar o teu voto.` : "Escolhe uma opção para registar o teu interesse.")}</p>
    {erro && <div className={s.erro} role="alert"><p>{erro}</p><button type="button" className={estilos.botaoSecundario} disabled={guardar !== null} onClick={() => setTentativa(n => n + 1)}>Consultar novamente</button></div>}
    <p className={s.nota}>Um voto por consultor. Esta sondagem serve para organizar o encontro e não substitui a inscrição no evento.</p>
  </article>;
}
