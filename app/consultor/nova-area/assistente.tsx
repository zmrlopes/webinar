"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_PERGUNTA_ASSISTENTE, textoRespostaAssistente, type MensagemAssistente, type RespostaAssistente } from "@/lib/assistente-equipa";
import comuns from "./nova-area.module.css";
import estilos from "./assistente.module.css";

interface Troca { id: string; pergunta: string; resposta: RespostaAssistente | null }
const SUGESTOES = [
  { tema: "Contactos", pergunta: "Como abordar um contacto frio sem pressionar?" },
  { tema: "Vendas de viagens", pergunta: "Como acompanhar um orçamento que ficou sem resposta?" },
  { tema: "A minha equipa", pergunta: "Como preparar a primeira reunião com um novo TP?" },
  { tema: "Formação", pergunta: "Que formação me recomendas para melhorar as minhas vendas?" },
];

export function AssistenteEquipa({ email }: { email: string }) {
  const [conversa, setConversa] = useState<Troca[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");
  const pedido = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setConversa([]); setPergunta(""); setErro(""); setCopiado(""); setOcupado(false);
    return () => pedido.current?.abort();
  }, [email]);

  useEffect(() => {
    if (!conversa.length) return;
    fim.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [conversa, ocupado]);

  async function enviar(texto = pergunta) {
    if (ocupado || texto.trim().length < 5 || texto.length > MAX_PERGUNTA_ASSISTENTE) return;
    const id = crypto.randomUUID();
    const historico: MensagemAssistente[] = conversa.filter(t => t.resposta).slice(-3).flatMap(t => [
      { papel: "utilizador" as const, texto: t.pergunta },
      { papel: "assistente" as const, texto: textoRespostaAssistente(t.resposta!).slice(0, 4000) },
    ]);
    const controller = new AbortController();
    pedido.current = controller;
    setOcupado(true); setErro(""); setPergunta("");
    setConversa(anterior => [...anterior, { id, pergunta: texto.trim(), resposta: null }]);
    try {
      const resposta = await fetch("/api/consultor/nova-area/assistente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pergunta: texto.trim(), historico }), signal: controller.signal,
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível preparar a resposta.");
      if (controller.signal.aborted) return;
      setConversa(anterior => anterior.map(t => t.id === id ? { ...t, resposta: corpo as RespostaAssistente } : t));
    } catch (falha) {
      if (controller.signal.aborted) return;
      setConversa(anterior => anterior.filter(t => t.id !== id));
      setPergunta(texto);
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { if (!controller.signal.aborted) setOcupado(false); }
  }

  async function copiar(troca: Troca) {
    if (!troca.resposta) return;
    try {
      const fontes = troca.resposta.fontes.map(f => `${f.titulo}${f.url ? ` — ${f.url.startsWith("/") ? location.origin + f.url : f.url}` : ""}`).join("\n");
      await navigator.clipboard.writeText(textoRespostaAssistente(troca.resposta) + (fontes ? `\n\nFontes:\n${fontes}` : ""));
      setCopiado(troca.id);
    } catch { setErro("Não foi possível copiar automaticamente. Podes selecionar e copiar o texto da resposta."); }
  }

  function submeter(evento: FormEvent) { evento.preventDefault(); void enviar(); }

  return <section id="assistente-equipa" aria-labelledby="titulo-assistente-equipa">
    <div className={comuns.intro}>
      <span className={comuns.etiqueta}>A MINHA ORGANIZAÇÃO</span>
      <h1 id="titulo-assistente-equipa">Assistente da equipa<span>.</span></h1>
      <p>Uma dúvida, um próximo passo. Encontra orientação nas formações e nos materiais da equipa.</p>
    </div>
    <div className={estilos.painel}>
      <div className={estilos.cabecalho}>
        <div className={estilos.identidade}><span className={estilos.simbolo} aria-hidden="true">✦</span><div><strong>Em que te posso ajudar?</strong><span>Vendas · Contactos · Organização · Equipa</span></div></div>
        {conversa.length > 0 && <button type="button" className={estilos.discreto} disabled={ocupado} onClick={() => { setConversa([]); setErro(""); setCopiado(""); campo.current?.focus(); }}>Nova conversa</button>}
      </div>
      {conversa.length === 0 && <div className={estilos.sugestoes} aria-label="Perguntas para experimentar">
        {SUGESTOES.map(s => <button key={s.tema} type="button" onClick={() => void enviar(s.pergunta)} disabled={ocupado}><span>{s.tema}</span>{s.pergunta}<span aria-hidden="true" className={estilos.seta}>↗</span></button>)}
      </div>}
      <div className={estilos.conversa} role="log" aria-label="Conversa com o assistente" aria-live="polite" aria-relevant="additions text">
        {conversa.map(t => <article key={t.id} className={estilos.troca}>
          <div className={estilos.pergunta}><span>Tu</span><p>{t.pergunta}</p></div>
          <div className={estilos.resposta}>
            <span className={estilos.autor}>Assistente da equipa</span>
            {t.resposta ? <>
              <p className={estilos.texto}>{t.resposta.resposta}</p>
              {t.resposta.passos.length > 0 && <ol className={estilos.passos}>{t.resposta.passos.map((p, i) => <li key={i}>{p}</li>)}</ol>}
              {t.resposta.exemplo && <div className={estilos.exemplo}><strong>Uma forma de dizer</strong><p>{t.resposta.exemplo}</p></div>}
              {t.resposta.fontes.length > 0 && <div className={estilos.fontes}><h2>Fontes usadas</h2><ul>{t.resposta.fontes.map(f => <li key={f.id}>
                {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer"><span>{f.tipo === "documento" ? "Documento" : "Formação"} · {f.curso}</span><strong>{f.titulo} <span aria-label="(abre num novo separador)">↗</span></strong></a>
                  : <div><span>{f.curso}</span><strong>{f.titulo}</strong></div>}
              </li>)}</ul></div>}
              <button type="button" className={estilos.discreto} onClick={() => void copiar(t)}>{copiado === t.id ? "Resposta copiada ✓" : "Copiar resposta"}</button>
            </> : <p className={estilos.aPesquisar} role="status">A consultar o conhecimento da equipa…</p>}
          </div>
        </article>)}
        <div ref={fim} />
      </div>
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <form className={estilos.formulario} onSubmit={submeter}>
        <label htmlFor="pergunta-assistente">{conversa.length ? "Continua a conversa" : "A tua pergunta"}</label>
        <textarea ref={campo} id="pergunta-assistente" rows={3} maxLength={MAX_PERGUNTA_ASSISTENTE} disabled={ocupado} value={pergunta} onChange={e => setPergunta(e.target.value)} placeholder="Ex.: O cliente achou o orçamento caro. Como posso perceber melhor o que procura?" onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <div className={estilos.rodape}><span>Baseado nos materiais da equipa. Confirma as fontes antes de aplicar.</span><button type="submit" disabled={ocupado || pergunta.trim().length < 5}>{ocupado ? "A preparar…" : "Perguntar"}<span aria-hidden="true">↑</span></button></div>
      </form>
      <p className={estilos.privacidade}>A conversa mantém-se durante esta visita. Ao atualizar ou sair da página, começa uma nova conversa.</p>
    </div>
  </section>;
}
