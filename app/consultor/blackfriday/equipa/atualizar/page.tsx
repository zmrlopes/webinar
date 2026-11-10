"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { podeVerAreaEquipa } from "@/lib/lideres-equipa";
import { deSeroval, pedidoAnalisador } from "@/lib/analisador-organizacao";
import { CANAL_EQUIPA_NEGOCIO, MYOFFICE_EQUIPA } from "@/lib/equipa-negocio-ponte";
import { lerEmailGuardado } from "../../../armazenamento";
import estilos from "../equipa.module.css";

export default function AtualizarEquipaNegocio() {
  const [estado, setEstado] = useState("A preparar a atualização…");
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    const email = lerEmailGuardado()?.trim().toLowerCase() ?? "";
    if (!podeVerAreaEquipa(email)) { setErro("Esta atualização é exclusiva de líderes com equipa própria no desafio."); return; }
    if (!window.opener || new URLSearchParams(window.location.search).get("ponte") !== "1") {
      setErro("Abre o MyOffice e carrega no favorito «Atualizar a minha equipa», disponível na tua área."); return;
    }
    let ativo = true, proximo = 0;
    const controller = new AbortController();
    const pendentes = new Map<number, { resolver: (corpo: unknown) => void; rejeitar: (erro: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
    function receber(evento: MessageEvent) {
      if (evento.origin !== MYOFFICE_EQUIPA || evento.source !== window.opener || evento.data?.canal !== CANAL_EQUIPA_NEGOCIO) return;
      const p = pendentes.get(evento.data.id);
      if (!p) return;
      clearTimeout(p.timeout); pendentes.delete(evento.data.id);
      if (evento.data.erro) return p.rejeitar(new Error(String(evento.data.erro)));
      const status = evento.data.status;
      if (status === 401 || status === 403) return p.rejeitar(new Error("A sessão do MyOffice terminou ou não tem acesso a estes dados. Entra novamente e repete."));
      if (typeof status !== "number" || status < 200 || status >= 300) return p.rejeitar(new Error(`O MyOffice respondeu com erro (${status ?? "sem resposta"}). Repete a atualização.`));
      try { p.resolver(JSON.parse(evento.data.corpo)); } catch { p.rejeitar(new Error("O MyOffice devolveu uma resposta ilegível.")); }
    }
    const pedir = (url: string) => new Promise<unknown>((resolver, rejeitar) => {
      if (!ativo) { rejeitar(new Error("Atualização interrompida.")); return; }
      const id = ++proximo;
      const timeout = setTimeout(() => { pendentes.delete(id); rejeitar(new Error("O MyOffice demorou demasiado. Mantém as duas janelas abertas e repete a atualização.")); }, 70_000);
      pendentes.set(id, { resolver, rejeitar, timeout });
      try { window.opener.postMessage({ canal: CANAL_EQUIPA_NEGOCIO, id, url }, MYOFFICE_EQUIPA); } catch { clearTimeout(timeout); pendentes.delete(id); rejeitar(new Error("A janela do MyOffice foi fechada. Abre-a e repete.")); }
    });
    async function enviar(corpo: object) {
      const r = await fetch("/api/consultor/blackfriday-equipa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...corpo, email }), signal: controller.signal });
      const c = await r.json();
      if (!r.ok) throw new Error(c.erro ?? "Não foi possível guardar a atualização.");
      return c;
    }
    async function correr() {
      try {
        setEstado("A confirmar a conta do MyOffice…");
        const identidade = await pedir("identidade") as { email?: string; versao?: number };
        if (!identidade.email) throw new Error("Não foi possível confirmar o email da sessão do MyOffice. Entra novamente no MyOffice e repete o favorito.");
        setEstado("A calcular o período do desafio…");
        const { inicio, fim } = await enviar({ acao: "periodo" }) as { inicio: string; fim: string };
        setEstado("A pedir o volume da equipa ao MyOffice…");
        const resposta = deSeroval(await pedir(pedidoAnalisador(inicio, fim, 0, undefined))) as { result?: { parent?: { bookingVolume?: number } } };
        const valor = resposta.result?.parent?.bookingVolume;
        if (typeof valor !== "number" || !Number.isFinite(valor)) throw new Error("O MyOffice não devolveu o volume da tua equipa. Tenta novamente.");
        setEstado("A guardar…");
        await enviar({ acao: "atualizar-faturacao", origemEmail: identidade.email, valor });
        if (ativo) { setFeito(true); setEstado("A faturação da tua equipa está atualizada."); }
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar. Tenta novamente.");
      }
    }
    window.addEventListener("message", receber);
    const arranque = setTimeout(() => void correr(), 0);
    return () => {
      ativo = false; clearTimeout(arranque); controller.abort(); window.removeEventListener("message", receber);
      for (const p of pendentes.values()) { clearTimeout(p.timeout); p.rejeitar(new Error("Atualização interrompida.")); }
      pendentes.clear();
    };
  }, []);
  return <main className={estilos.atualizarPagina}>
    <span className={estilos.etiqueta}>EQUIPA · DESAFIO BLACKFRIDAY</span>
    <h1>Atualizar a faturação da equipa</h1>
    {erro ? <><p role="alert" className={estilos.erro}>{erro}</p><p>O último valor guardado mantém-se.</p></> : <p role="status">{estado}</p>}
    <Link className={estilos.botao} href="/consultor/blackfriday/equipa">{feito ? "Ver a equipa →" : "Voltar à equipa"}</Link>
  </main>;
}
