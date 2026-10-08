"use client";

import { useEffect, useState } from "react";
import type { DestinatarioFormacao } from "@/lib/formacoes-destinatarios";

export function SeletorPessoas({ selecionadas, onChange }: {
  selecionadas: DestinatarioFormacao[];
  onChange: (pessoas: DestinatarioFormacao[]) => void;
}) {
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tentativa, setTentativa] = useState(0);
  const [pessoas, setPessoas] = useState<DestinatarioFormacao[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setACarregar(true);
    setErro("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ pesquisa, pagina: String(pagina) });
        const resposta = await fetch(`/api/admin/formacoes/destinatarios?${params}`, {
          signal: controller.signal, cache: "no-store",
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar a lista.");
        if (!controller.signal.aborted) {
          setPessoas(dados.pessoas);
          setTemMais(dados.temMais);
        }
      } catch (e) {
        if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : "Falha de ligação. Tenta novamente.");
      } finally {
        if (!controller.signal.aborted) setACarregar(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [pesquisa, pagina, tentativa]);

  function alternar(pessoa: DestinatarioFormacao) {
    onChange(selecionadas.some(p => p.email === pessoa.email)
      ? selecionadas.filter(p => p.email !== pessoa.email) : [...selecionadas, pessoa]);
  }

  return <div className="fc-pessoas">
    <label htmlFor="fc-pesquisa">Pesquisar pessoas</label>
    <input id="fc-pesquisa" type="search" value={pesquisa}
      placeholder="Nome, telemóvel ou email" autoComplete="off"
      onChange={e => { setPesquisa(e.target.value); setPagina(1); setACarregar(true); }} />
    <p className="fc-nota">Consultores inscritos na plataforma. O telemóvel aparece quando já foi indicado numa inscrição.</p>
    <div className="fc-resultados" aria-busy={aCarregar}>
      {aCarregar ? <p role="status">A pesquisar…</p> : erro ? <>
        <p role="alert" className="fc-erro">{erro}</p>
        <button type="button" className="fc-acao" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button>
      </> : pessoas.length === 0 ? <p role="status">Não encontrámos pessoas para esta pesquisa.</p>
      : pessoas.map(p => <label key={p.email} className="fc-pessoa">
        <input type="checkbox" checked={selecionadas.some(s => s.email === p.email)}
          onChange={() => alternar(p)} />
        <span><strong>{p.nome}</strong><small>{p.telemovel || "Telemóvel não indicado"} · {p.email}</small></span>
      </label>)}
    </div>
    {!aCarregar && !erro && (pagina > 1 || temMais) && <div className="fc-paginacao">
      <button type="button" className="fc-acao" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
      <span>Página {pagina}</span>
      <button type="button" className="fc-acao" disabled={!temMais} onClick={() => setPagina(p => p + 1)}>Seguinte</button>
    </div>}
    <p className="fc-contagem" aria-live="polite">{selecionadas.length} {selecionadas.length === 1 ? "pessoa selecionada" : "pessoas selecionadas"}</p>
    {selecionadas.length > 0 && <ul className="fc-selecionadas" aria-label="Pessoas selecionadas">
      {selecionadas.map(p => <li key={p.email}>
        <span><strong>{p.nome}</strong><small>{p.telemovel || p.email}</small></span>
        <button type="button" className="fc-acao" aria-label={`Remover ${p.nome}`} onClick={() => alternar(p)}>Remover</button>
      </li>)}
    </ul>}
    <p className="fc-nota">Só estas pessoas vão ver esta formação no painel e poder entrar.</p>
  </div>;
}
