"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InscricaoEvento } from "@/lib/eventos";
import { resumirPresencasEvento } from "@/lib/eventos-presencas";
import { EditarEmailInscricao } from "./editar-email";
import { BotaoWhatsApp } from "../botao-whatsapp";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function TabelaInscricoesEvento({ inscricoes }: { inscricoes: InscricaoEvento[] }) {
  const [pesquisa, setPesquisa] = useState("");
  const [presenca, setPresenca] = useState("todas");
  const router = useRouter();
  const bloqueado = useRef(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [resultados, setResultados] = useState<Record<string, string>>({});

  async function enviar(lista: InscricaoEvento[]) {
    if (bloqueado.current) return;
    bloqueado.current = true;
    setAEnviar(true);
    let enviados = 0;
    let falhas = 0;
    try {
      for (const [indice, inscricao] of lista.entries()) {
        setMensagem(`A enviar ${indice + 1} de ${lista.length} — ${inscricao.nome}. Mantém esta página aberta.`);
        setResultados((anteriores) => ({ ...anteriores, [inscricao.id]: "A enviar…" }));
        try {
          const resposta = await fetch("/api/admin/eventos/enviar-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: inscricao.id }),
          });
          const corpo = await resposta.json().catch(() => null);
          if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha no envio.");
          enviados++;
          setResultados((anteriores) => ({ ...anteriores, [inscricao.id]: "Email enviado." }));
        } catch (erro) {
          falhas++;
          setResultados((anteriores) => ({ ...anteriores, [inscricao.id]: erro instanceof Error ? erro.message : "Falha de ligação. Verifica o estado antes de repetir." }));
        }
      }
      setMensagem(`Envio concluído: ${enviados} enviados, ${falhas} com falha.`);
    } finally {
      bloqueado.current = false;
      setAEnviar(false);
      router.refresh();
    }
  }

  const inscricoesFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return inscricoes.filter((i) => {
      const resumo = resumirPresencasEvento([i]);
      const correspondePresenca = presenca === "todas" || (presenca === "com" ? resumo.presentes > 0 : resumo.semCheckin > 0);
      return correspondePresenca && `${i.nome} ${i.telemovel} ${i.email}`.toLowerCase().includes(termo);
    });
  }, [inscricoes, pesquisa, presenca]);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button type="button" className="ad-download" disabled={aEnviar || !inscricoes.length} onClick={() => void enviar(inscricoes)}>
          {aEnviar ? "A enviar QR codes…" : `Enviar QR codes a todos (${inscricoes.length})`}
        </button>
        <p className="ad-legenda">Envia para todas as inscrições, incluindo as que já receberam o email, mesmo com pesquisa ativa.</p>
        <p role="status" aria-live="polite">{mensagem}</p>
      </div>
      <input
        type="text"
        value={pesquisa}
        onChange={(e) => setPesquisa(e.target.value)}
        placeholder="Pesquisar por nome, telemóvel ou email…"
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "0.9rem",
          width: "100%",
          maxWidth: 320,
          boxSizing: "border-box",
        }}
      />
      <label style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", margin: "0 0 0.75rem 0.75rem", flexWrap: "wrap" }}>
        Presenças
        <select value={presenca} onChange={e => setPresenca(e.target.value)} style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="todas">Todas as inscrições</option>
          <option value="com">Com check-in efetuado</option>
          <option value="sem">Com pessoas sem check-in</option>
        </select>
      </label>
      {(pesquisa.trim() !== "" || presenca !== "todas") && (
        <p className="ad-legenda" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          {inscricoesFiltradas.length} de {inscricoes.length}
        </p>
      )}
      <div className="ad-tabela-wrap">
        <table className="ad-tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telemóvel</th>
              <th>Email</th>
              <th>Contacto</th>
              <th>Adultos</th>
              <th>Crianças +10</th>
              <th>Crianças -10</th>
              <th>Total</th>
              <th>Check-ins</th>
              <th>Inscrito em</th>
              <th>Comprovativo</th>
              <th>Email QR code</th>
            </tr>
          </thead>
          <tbody>
            {inscricoesFiltradas.map((i) => (
              <tr key={i.id}>
                <td>{i.nome}</td>
                <td>{i.telemovel}</td>
                <td><EditarEmailInscricao id={i.id} email={i.email} /></td>
                <td>
                  <BotaoWhatsApp
                    telemovel={i.telemovel}
                    mensagem={i.adultos > 1
                      ? `Olá, ${i.nome}! Na tua inscrição para o Teambuilding de dia 14 de novembro constam ${i.adultos} adultos. Podes enviar-me o nome completo ${i.adultos === 2 ? "do outro adulto" : "dos restantes adultos"}, por favor? Obrigado!`
                      : `Olá, ${i.nome}! Estou a entrar em contacto sobre a tua inscrição para o Teambuilding de dia 14 de novembro.`}
                  />
                </td>
                <td>{i.adultos}</td>
                <td>{i.criancasMais10}</td>
                <td>{i.criancasMenos10}</td>
                <td>{i.totalPagar}€</td>
                <td>
                  <p style={{ margin: "0 0 6px", fontSize: "0.8rem" }}>{resumirPresencasEvento([i]).presentes} de {resumirPresencasEvento([i]).total} com check-in</p>
                  <div className="ad-bilhetes">
                    {i.bilhetes.map((b) => (
                      <span
                        key={b.id}
                        className={b.presente ? "ad-presenca ad-presenca-sim" : "ad-presenca ad-presenca-nao"}
                        title={b.presente ? (b.presenteEm ? `Check-in em ${formatarData(b.presenteEm)}` : "Check-in efetuado") : "Sem check-in"}
                      >
                        {b.rotulo} · {b.presente ? "✓ Check-in" : "Sem check-in"}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{formatarData(i.criadoEm)}</td>
                <td>
                  <a href={`/api/admin/eventos/comprovativo/${i.id}`} className="ad-download">
                    Descarregar
                  </a>
                </td>
                <td>
                  <button type="button" className="ad-download" disabled={aEnviar} onClick={() => void enviar([i])} aria-label={`Enviar QR codes a ${i.nome}`}>
                    Enviar QR codes
                  </button>
                  {resultados[i.id] && <p style={{ fontSize: "0.8rem" }}>{resultados[i.id]}</p>}
                  {i.emailEnviado === null ? (
                    <span style={{ color: "#6b6a63" }}>desconhecido</span>
                  ) : i.emailEnviado ? (
                    <span style={{ color: "#0ca30c" }}>enviado</span>
                  ) : (
                    <span style={{ color: "#c0392b" }}>falhou</span>
                  )}
                </td>
              </tr>
            ))}
            {!inscricoesFiltradas.length && <tr><td colSpan={12}>Não há inscrições para os filtros selecionados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
