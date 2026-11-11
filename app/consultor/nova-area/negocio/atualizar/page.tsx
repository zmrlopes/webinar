"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {podeVerNovaArea} from "@/lib/consultor-nova-area";
import {CANAL_NEGOCIO, MYOFFICE_NEGOCIO, recolherPeriodoNegocio} from "@/lib/consultor-negocio-ponte";
import type {PlanoNegocio} from "@/lib/consultor-negocio";
import {lerEmailGuardado} from "../../../armazenamento";
import estilos from "../../negocio.module.css";

export default function AtualizarNegocioConsultor() {
  const [estado, setEstado] = useState("A preparar a atualização…");
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState(false);
  const [progresso, setProgresso] = useState({feitos: 0, total: 1});
  useEffect(() => {
    const email = lerEmailGuardado()?.trim().toLowerCase() ?? "";
    if (!podeVerNovaArea(email)) {setErro("Esta atualização ainda não está disponível para esta conta. Entra primeiro na nova área."); return;}
    if (!window.opener || new URLSearchParams(window.location.search).get("ponte") !== "1") {
      setErro("Abre o MyOffice e carrega no novo favorito «Atualizar o meu negócio», disponível na nova área."); return;
    }
    let ativo = true, proximo = 0;
    const controller = new AbortController();
    const pendentes = new Map<number, {resolver: (corpo: unknown) => void; rejeitar: (erro: Error) => void; timeout: ReturnType<typeof setTimeout>}>();
    function receber(evento: MessageEvent) {
      if (evento.origin !== MYOFFICE_NEGOCIO || evento.source !== window.opener || evento.data?.canal !== CANAL_NEGOCIO) return;
      const p = pendentes.get(evento.data.id);
      if (!p) return;
      clearTimeout(p.timeout); pendentes.delete(evento.data.id);
      if (evento.data.erro) return p.rejeitar(new Error(String(evento.data.erro)));
      const status = evento.data.status;
      if (status === 401 || status === 403) return p.rejeitar(new Error("A sessão do MyOffice terminou ou não tem acesso a estes dados. Entra novamente e repete."));
      if (typeof status !== "number" || status < 200 || status >= 300) return p.rejeitar(new Error(`O MyOffice respondeu com erro (${status ?? "sem resposta"}). Repete a atualização.`));
      try {p.resolver(JSON.parse(evento.data.corpo));} catch {p.rejeitar(new Error("O MyOffice devolveu uma resposta ilegível."));}
    }
    const pedir = (url: string) => new Promise<unknown>((resolver, rejeitar) => {
      if (!ativo) {rejeitar(new Error("Atualização interrompida.")); return;}
      const id = ++proximo;
      const timeout = setTimeout(() => {pendentes.delete(id); rejeitar(new Error("O MyOffice demorou demasiado. Mantém as duas janelas abertas e repete a atualização."));}, 190_000);
      pendentes.set(id, {resolver, rejeitar, timeout});
      try {window.opener.postMessage({canal: CANAL_NEGOCIO, id, url}, MYOFFICE_NEGOCIO);} catch {clearTimeout(timeout); pendentes.delete(id); rejeitar(new Error("A janela do MyOffice foi fechada. Abre-a e repete."));}
    });
    async function enviar(corpo: object) {
      const r = await fetch("/api/consultor/nova-area/negocio", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({...corpo, email}), signal: controller.signal});
      const c = await r.json();
      if (!r.ok) throw new Error(c.erro ?? "Não foi possível guardar a atualização.");
      return c;
    }
    async function correr() {
      try {
        setEstado("A confirmar a conta do MyOffice…");
        const identidade = await pedir("identidade") as {email?: string; versao?: number};
        if (!identidade.email) throw new Error("Não foi possível confirmar o email da sessão do MyOffice. Entra novamente no MyOffice e repete o favorito.");
        if (identidade.versao !== 2) throw new Error("Substitui o favorito «Atualizar o meu negócio» pela versão disponível na nova área e volta a clicar nele no MyOffice. A nova versão inclui comissões próprias e passivas.");
        const {plano} = await enviar({acao: "iniciar", origemEmail: identidade.email}) as {plano: PlanoNegocio};
        setProgresso({feitos: 0, total: plano.periodos.length});
        let seguinte = 0, feitos = 0, falhou = false;
        await Promise.all(Array.from({length: 3}, async () => {
          while (ativo && !falhou && seguinte < plano.periodos.length) {
            const periodo = plano.periodos[seguinte++]!;
            setEstado(`A recolher o histórico desde ${plano.periodos[0]!.inicio.slice(0, 4)} · ${periodo.chave === "homologo" ? "período homólogo" : periodo.chave}…`);
            try {
              const totais = await recolherPeriodoNegocio(periodo, pedir);
              await enviar({acao: "periodo", id: plano.id, periodo: periodo.chave, totais});
              if (ativo) setProgresso({feitos: ++feitos, total: plano.periodos.length});
            } catch (falha) {falhou = true; throw falha;}
          }
        }));
        if (!ativo) return;
        setEstado("A guardar os Mapas e as Projeções…");
        await enviar({acao: "concluir", id: plano.id});
        if (ativo) {setFeito(true); setEstado("O teu dashboard está atualizado.");}
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar. Tenta novamente.");
      }
    }
    window.addEventListener("message", receber);
    const arranque = setTimeout(() => void correr(), 0);
    return () => {
      ativo = false; clearTimeout(arranque); controller.abort(); window.removeEventListener("message", receber);
      for (const p of pendentes.values()) {clearTimeout(p.timeout); p.rejeitar(new Error("Atualização interrompida."));}
      pendentes.clear();
    };
  }, []);
  return <main className={estilos.atualizarPagina}>
    <span className={estilos.etiqueta}>O MEU NEGÓCIO · CONTA DE TESTE</span>
    <h1>Atualizar os dados</h1>
    {erro ? <><p role="alert" className={estilos.erro}>{erro}</p><p>O último dashboard completo mantém-se guardado. Para tentar novamente, volta ao MyOffice e clica no favorito.</p></> : <>
      <p role="status">{estado}</p>
      <progress aria-label="Períodos recolhidos" max={progresso.total} value={progresso.feitos} />
      <p>{progresso.feitos} de {progresso.total} períodos</p>
      {!feito && <p>Mantém esta janela e o MyOffice abertos. A recolha inclui o histórico desde o ano de entrada, nunca anterior a 2019, e pode demorar alguns minutos.</p>}
    </>}
    <Link className={estilos.botao} href="/consultor/nova-area?seccao=negocio">{feito ? "Ver Mapas e Projeções →" : "Voltar à nova área"}</Link>
  </main>;
}
