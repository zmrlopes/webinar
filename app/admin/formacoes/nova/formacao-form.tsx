"use client";

import { useState } from "react";
import type { DestinatarioFormacao } from "@/lib/formacoes-destinatarios";
import { SeletorPessoas } from "./seletor-pessoas";

type Estado = "pronto" | "a-enviar" | "enviado" | "erro";

export interface DadosIniciaisFormacao {
  titulo: string;
  comecaEm: string; // ISO
  duracaoMinutos: number;
  linkZoom: string;
  publicoParaLeads: boolean;
  destinatarios?: DestinatarioFormacao[] | null;
}

function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FormacaoForm({
  formacaoId,
  inicial,
}: {
  /** Presente = modo edição (PATCH); ausente = criar (POST). */
  formacaoId?: string;
  inicial?: DadosIniciaisFormacao;
}) {
  const emEdicao = formacaoId !== undefined;
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [comecaEm, setComecaEm] = useState(inicial ? paraDatetimeLocal(inicial.comecaEm) : "");
  const [duracaoMinutos, setDuracaoMinutos] = useState(String(inicial?.duracaoMinutos ?? 60));
  const [linkZoom, setLinkZoom] = useState(inicial?.linkZoom ?? "");
  const [publicoParaLeads, setPublicoParaLeads] = useState(inicial?.publicoParaLeads ?? false);
  const [restrita, setRestrita] = useState(inicial?.destinatarios != null);
  const [selecionadas, setSelecionadas] = useState<DestinatarioFormacao[]>(inicial?.destinatarios ?? []);
  const [estado, setEstado] = useState<Estado>("pronto");
  const [erro, setErro] = useState("");

  const duracaoNum = Math.max(0, Number(duracaoMinutos) || 0);
  const valido =
    titulo.trim() !== "" && comecaEm !== "" && duracaoNum > 0 && linkZoom.trim() !== "" &&
    (!restrita || publicoParaLeads || selecionadas.length > 0);

  async function submeter(): Promise<void> {
    if (!valido) return;
    setEstado("a-enviar");
    setErro("");
    try {
      const resposta = await fetch(
        emEdicao ? `/api/admin/formacoes/${formacaoId}` : "/api/admin/formacoes",
        {
          method: emEdicao ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: titulo.trim(),
            comecaEm: new Date(comecaEm).toISOString(),
            duracaoMinutos: duracaoNum,
            linkZoom: linkZoom.trim(),
            publicoParaLeads,
            destinatariosEmails: restrita && !publicoParaLeads ? selecionadas.map(p => p.email) : null,
          }),
        },
      );
      const resultado = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(
          typeof resultado.erro === "string"
            ? resultado.erro
            : `não foi possível ${emEdicao ? "guardar" : "criar"} a formação`,
        );
        setEstado("erro");
        return;
      }
      setEstado("enviado");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("erro");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="fc-cartao">
        <style>{estilos}</style>
        <p className="fc-sucesso">✅ {emEdicao ? "Formação atualizada." : "Formação criada."}</p>
        <p className="fc-legenda">
          Já aparece na área "Próximas sessões" do painel do consultor
          {publicoParaLeads ? " e fica disponível para inscrição pelos links dos consultores."
            : restrita ? `, apenas para as ${selecionadas.length} pessoas selecionadas.` : ", só para a equipa."}
        </p>
        <a href="/admin/sessoes" className="fc-botao-secundario">
          ← Voltar às sessões
        </a>
      </div>
    );
  }

  return (
    <div className="fc-cartao">
      <style>{estilos}</style>

      <div className="fc-campo">
        <label htmlFor="fc-titulo">Nome da formação</label>
        <input
          id="fc-titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="ex: Formação de vendas — outubro"
        />
      </div>

      <div className="fc-campo">
        <label htmlFor="fc-comeca">Data e hora</label>
        <input
          id="fc-comeca"
          type="datetime-local"
          value={comecaEm}
          onChange={(e) => setComecaEm(e.target.value)}
        />
      </div>

      <div className="fc-campo">
        <label htmlFor="fc-duracao">Duração (minutos)</label>
        <input
          id="fc-duracao"
          type="number"
          min={1}
          value={duracaoMinutos}
          onChange={(e) => setDuracaoMinutos(e.target.value)}
          onBlur={() => setDuracaoMinutos(String(Math.max(1, Number(duracaoMinutos) || 60)))}
        />
      </div>

      <div className="fc-campo">
        <label htmlFor="fc-link">Link do Zoom</label>
        <input
          id="fc-link"
          type="url"
          value={linkZoom}
          onChange={(e) => setLinkZoom(e.target.value)}
          placeholder="https://zoom.us/j/..."
        />
        <p className="fc-nota">O link da reunião criada na tua conta Zoom.</p>
      </div>

      <div className="fc-campo">
        <label>Modo</label>
        <label className="fc-radio">
          <input
            type="radio"
            name="fc-modo"
            checked={!publicoParaLeads}
            onChange={() => setPublicoParaLeads(false)}
          />
          Só equipa — aparece no painel do consultor, um clique para entrar
        </label>
        <label className="fc-radio">
          <input
            type="radio"
            name="fc-modo"
            checked={publicoParaLeads}
            onChange={() => setPublicoParaLeads(true)}
          />
          Equipa + leads — também abre para inscrição pelos links dos consultores
        </label>
      </div>

      {!publicoParaLeads && <fieldset className="fc-destinatarios" disabled={estado === "a-enviar"}>
        <legend>Quem pode ver esta formação?</legend>
        <label className="fc-radio">
          <input type="radio" name="fc-destinatarios" checked={!restrita} onChange={() => setRestrita(false)} />
          Toda a equipa
        </label>
        <label className="fc-radio">
          <input type="radio" name="fc-destinatarios" checked={restrita} onChange={() => setRestrita(true)} />
          Apenas as pessoas que eu selecionar
        </label>
        {restrita && <>
          <SeletorPessoas selecionadas={selecionadas} onChange={setSelecionadas} />
          {!selecionadas.length && <p className="fc-nota">Seleciona pelo menos uma pessoa para guardar a formação.</p>}
        </>}
      </fieldset>}

      {erro && <p className="fc-erro">{erro}</p>}

      <button type="button" disabled={!valido || estado === "a-enviar"} onClick={submeter}>
        {estado === "a-enviar"
          ? emEdicao
            ? "A guardar…"
            : "A criar…"
          : emEdicao
            ? "Guardar alterações"
            : "Criar formação"}
      </button>
    </div>
  );
}

const estilos = `
  .fc-cartao {
    background: #f7f6f3;
    border: 1px solid #000000;
    border-radius: 12px;
    padding: 1.5rem;
  }
  .fc-campo { margin-bottom: 1.1rem; }
  .fc-campo > label:first-child {
    display: block;
    font-weight: 600;
    font-size: 0.85rem;
    color: #000000;
    margin: 0 0 0.35rem;
  }
  .fc-campo input[type="text"],
  .fc-campo input[type="number"],
  .fc-campo input[type="url"],
  .fc-campo input[type="datetime-local"] {
    box-sizing: border-box;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #000000;
    background: #fff;
    color: #000000;
    font-size: 1rem;
    font-family: inherit;
  }
  .fc-pessoas input[type="search"] {
    box-sizing: border-box; width: 100%; padding: 0.7rem; border: 1px solid #000;
    border-radius: 8px; background: #fff; color: #000; font: inherit;
  }
  .fc-destinatarios { min-width: 0; margin: 0 0 1.25rem; padding: 1rem; border: 1px solid #ccc; border-radius: 10px; }
  .fc-destinatarios legend { font-weight: 700; font-size: 0.9rem; }
  .fc-pessoas { margin-top: 1rem; }
  .fc-pessoas > label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; }
  .fc-resultados { margin-top: 0.75rem; max-height: 300px; overflow-y: auto; background: white; border: 1px solid #ddd; border-radius: 8px; }
  .fc-resultados > p { padding: 0.75rem; font-size: 0.9rem; margin: 0; }
  .fc-pessoa { display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem; cursor: pointer; border-bottom: 1px solid #eee; }
  .fc-pessoa:last-child { border-bottom: none; }
  .fc-pessoa:has(input:checked) { background: #eef0e4; }
  .fc-pessoa input { flex-shrink: 0; width: 18px; height: 18px; accent-color: #4b5320; }
  .fc-pessoa span, .fc-selecionadas span { min-width: 0; }
  .fc-pessoa strong, .fc-selecionadas strong { display: block; font-size: 0.9rem; overflow-wrap: anywhere; }
  .fc-pessoa small, .fc-selecionadas small { display: block; font-size: 0.75rem; color: #6b6a63; overflow-wrap: anywhere; margin-top: 0.2rem; }
  .fc-cartao button.fc-acao { width: auto; padding: 0.55rem 0.65rem; background: white; border: 1px solid #4b5320; color: #4b5320; border-radius: 6px; font-size: 0.8rem; flex-shrink: 0; }
  .fc-paginacao { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.6rem; font-size: 0.8rem; }
  .fc-contagem { font-weight: 600; font-size: 0.9rem; color: #4b5320; margin: 0.85rem 0 0.5rem; }
  .fc-selecionadas { list-style: none; padding: 0; margin: 0; max-height: 260px; overflow-y: auto; }
  .fc-selecionadas li { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 0; border-bottom: 1px solid #ddd; }
  .fc-nota { font-size: 0.8rem; color: #6b6a63; margin: 0.3rem 0 0; }
  .fc-radio {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #000000;
    font-weight: 400;
    margin-top: 0.5rem;
    cursor: pointer;
  }
  .fc-radio input { width: 16px; height: 16px; flex: 0 0 16px; margin: 0.2rem 0 0; accent-color: #4b5320; }
  .fc-erro { color: #c0392b; font-size: 0.9rem; margin: 0 0 1rem; }
  .fc-cartao button {
    width: 100%;
    padding: 0.85rem;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #5d6b2a, #4b5320);
    color: #ffffff;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
  }
  .fc-cartao button:active { background: linear-gradient(135deg, #3a4118, #23280e); }
  .fc-cartao button:disabled { opacity: 0.55; cursor: default; }
  .fc-sucesso { font-size: 1.1rem; font-weight: 700; color: #0ca30c; margin: 0 0 0.5rem; }
  .fc-legenda { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.25rem; }
  .fc-botao-secundario {
    display: inline-block;
    color: #4b5320;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .fc-botao-secundario:hover { text-decoration: underline; }
`;
