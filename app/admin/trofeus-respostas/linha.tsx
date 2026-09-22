"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patamaresComDireito, TROFEUS_JA_TENHO, TROFEUS_QUERO } from "@/lib/trofeus-lista";
import type { RespostaTrofeusAdmin } from "@/lib/trofeus";

function rotuloDe(chave: string): string {
  return TROFEUS_JA_TENHO.find((t) => t.chave === chave)?.rotulo ?? chave;
}

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function alternar(lista: string[], chave: string): string[] {
  return lista.includes(chave) ? lista.filter((c) => c !== chave) : [...lista, chave];
}

/**
 * Uma linha da tabela de respostas, com edição inline — para corrigir
 * enganos como alguém marcar "quero" em vários patamares quando só tem
 * direito ao seu (ver chaveDoPatamar). A pílula de um troféu de patamar
 * que não é o da pessoa fica a vermelho na vista normal, para o engano
 * saltar à vista sem ser preciso abrir a edição.
 */
export function LinhaResposta({ resposta }: { resposta: RespostaTrofeusAdmin }) {
  const router = useRouter();
  const [aEditar, setAEditar] = useState(false);
  const [quero, setQuero] = useState(resposta.quero);
  const [jaTenho, setJaTenho] = useState(resposta.jaTenho);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Tem direito ao seu patamar E a todos os abaixo (confirmado com o
  // utilizador: um Master pode pedir Master, Sénior e Júnior) — só quem
  // pede um patamar ACIMA do seu é que está a marcar algo a mais. Sem
  // saber o patamar (null), não se assinala nada como errado.
  const direitos = patamaresComDireito(resposta.nivel);
  const extrasQuero = direitos ? resposta.quero.filter((c) => !direitos.includes(c)) : [];

  function abrirEdicao(): void {
    setQuero(resposta.quero);
    setJaTenho(resposta.jaTenho);
    setErro(null);
    setAEditar(true);
  }

  function aplicarPatamaresComDireito(): void {
    if (direitos) setQuero(direitos);
  }

  async function guardar(): Promise<void> {
    setAGuardar(true);
    setErro(null);
    try {
      const resp = await fetch("/api/admin/trofeus-corrigir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resposta.email, quero, jaTenho }),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível guardar");
        setAGuardar(false);
        return;
      }
      setAEditar(false);
      router.refresh();
    } catch {
      setErro("falha de ligação — tenta outra vez");
    } finally {
      setAGuardar(false);
    }
  }

  if (!aEditar) {
    return (
      <tr>
        <td>
          {resposta.nome}
          <div className="ad-legenda">{resposta.email}</div>
        </td>
        <td className="ad-legenda">{resposta.nivel ?? "—"}</td>
        <td>
          {resposta.quero.length === 0 ? (
            <span className="ad-legenda">nenhum</span>
          ) : (
            resposta.quero.map((c) => (
              <span className={extrasQuero.includes(c) ? "ad-pilula ad-pilula-aviso" : "ad-pilula"} key={c}>
                {rotuloDe(c)}
              </span>
            ))
          )}
          {extrasQuero.length > 0 && (
            <div className="ad-aviso-texto">
              ⚠ pediu patamar(es) acima do atual — confirma se não está quase lá antes de tirar
            </div>
          )}
        </td>
        <td>
          {resposta.jaTenho.length === 0 ? (
            <span className="ad-legenda">nenhum</span>
          ) : (
            resposta.jaTenho.map((c) => (
              <span className="ad-pilula ad-pilula-cinza" key={c}>
                {rotuloDe(c)}
              </span>
            ))
          )}
        </td>
        <td className="ad-legenda">{formatarData(resposta.criadoEm)}</td>
        <td>
          <button type="button" className="ad-botao-corrigir" onClick={abrirEdicao}>
            Corrigir
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6}>
        <div className="ad-edicao">
          <strong>
            {resposta.nome} <span className="ad-legenda">— {resposta.email}</span>
          </strong>
          <p className="ad-legenda" style={{ margin: "0.2rem 0 0.8rem" }}>
            Patamar atual (CSV da equipa): {resposta.nivel ?? "desconhecido"}
          </p>

          <div className="ad-edicao-colunas">
            <div>
              <div className="ad-edicao-titulo">Quer receber</div>
              {direitos && (
                <button type="button" className="ad-botao-sugestao" onClick={aplicarPatamaresComDireito}>
                  Só os patamares a que tem direito ({direitos.length})
                </button>
              )}
              {TROFEUS_QUERO.map((t) => (
                <label className="ad-checkbox-linha" key={t.chave}>
                  <input
                    type="checkbox"
                    checked={quero.includes(t.chave)}
                    onChange={() => setQuero(alternar(quero, t.chave))}
                  />
                  {t.rotulo}
                </label>
              ))}
            </div>
            <div>
              <div className="ad-edicao-titulo">Já tem</div>
              {TROFEUS_JA_TENHO.map((t) => (
                <label className="ad-checkbox-linha" key={t.chave}>
                  <input
                    type="checkbox"
                    checked={jaTenho.includes(t.chave)}
                    onChange={() => setJaTenho(alternar(jaTenho, t.chave))}
                  />
                  {t.rotulo}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <button type="button" className="ad-botao-corrigir" disabled={aGuardar} onClick={guardar}>
              {aGuardar ? "A guardar…" : "Guardar"}
            </button>
            <button
              type="button"
              className="ad-botao-cancelar"
              disabled={aGuardar}
              onClick={() => setAEditar(false)}
            >
              Cancelar
            </button>
            {erro && <span className="ad-aviso-texto">{erro}</span>}
          </div>
        </div>
      </td>
    </tr>
  );
}
