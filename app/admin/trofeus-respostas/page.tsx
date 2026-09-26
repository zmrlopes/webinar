import Link from "next/link";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import {
  contarTrofeus,
  listarInscritosSemRespostaTrofeus,
  listarRespostasTrofeus,
  questionarioTrofeusPublicado,
} from "@/lib/trofeus";
import { BotaoWhatsApp } from "../botao-whatsapp";
import { BotoesAvisar } from "./botoes-avisar";
import { LinhaResposta } from "./linha";

export const dynamic = "force-dynamic";

export default async function TrofeusRespostasPagina() {
  const [respostas, semResposta] = await Promise.all([
    listarRespostasTrofeus(),
    listarInscritosSemRespostaTrofeus(),
  ]);
  const contagens = contarTrofeus(respostas);
  const totalPedidos = contagens.reduce((soma, c) => soma + c.pedidos, 0);
  const maxPedidos = Math.max(1, ...contagens.map((c) => c.pedidos));
  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 1100px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-pagina h2 { color: #4b5320; font-size: 1.1rem; margin: 2.25rem 0 0.75rem; }
        .ad-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-cartao {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 14px;
          padding: 1.1rem 1.25rem;
        }
        .ad-linha { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.7rem; }
        .ad-etiqueta { flex: 0 0 220px; font-size: 0.9rem; }
        .ad-barra-fundo { flex: 1; height: 10px; border-radius: 5px; background: #e6e4dc; overflow: hidden; }
        .ad-barra { height: 100%; background: linear-gradient(90deg, #5d6b2a, #4b5320); }
        .ad-pedidos { flex: 0 0 auto; font-weight: 800; font-size: 1rem; min-width: 2ch; text-align: right; }
        .ad-jatem { flex: 0 0 120px; color: #6b6a63; font-size: 0.8rem; }
        .ad-tabela-wrap { border-radius: 10px; overflow-x: auto; border: 1px solid #e2e0d8; }
        .ad-tabela { width: 100%; min-width: 720px; border-collapse: collapse; background: #f7f6f3; }
        .ad-tabela th, .ad-tabela td {
          text-align: left;
          padding: 0.6rem 0.9rem;
          border-bottom: 1px solid #eae7de;
          font-size: 0.88rem;
          vertical-align: top;
        }
        .ad-tabela th {
          color: #6b6a63;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ad-tabela tr:last-child td { border-bottom: none; }
        .ad-pilula {
          display: inline-block;
          background: #eef1e4;
          color: #4b5320;
          border-radius: 999px;
          padding: 0.12rem 0.55rem;
          font-size: 0.78rem;
          margin: 0 0.25rem 0.25rem 0;
        }
        .ad-pilula-cinza { background: #ececE6; color: #6b6a63; }
        .ad-pilula-aviso { background: #fbe4e0; color: #b3261e; font-weight: 700; }
        .ad-aviso-texto { color: #b3261e; font-size: 0.8rem; margin-top: 0.3rem; }
        .ad-botao-corrigir {
          background: #4b5320;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ad-botao-corrigir:disabled { opacity: 0.6; cursor: default; }
        .ad-botao-cancelar {
          background: transparent;
          color: #6b6a63;
          border: 1px solid #d8d5cb;
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          font-size: 0.82rem;
          cursor: pointer;
        }
        .ad-botao-sugestao {
          display: block;
          background: transparent;
          color: #4b5320;
          border: 1px solid #4b5320;
          border-radius: 6px;
          padding: 0.35rem 0.7rem;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 0.6rem;
        }
        .ad-edicao { padding: 1rem 0.25rem; }
        .ad-edicao-titulo { font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem; color: #4b5320; }
        .ad-edicao-colunas { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
        .ad-checkbox-linha { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; padding: 0.25rem 0; }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin/eventos/teambuilding" className="ad-voltar">
          ← Teambuilding
        </Link>
        <h1>Troféus — o que pedir</h1>
        <p className="ad-subtitulo">
          {respostas.length} resposta(s) · {totalPedidos} troféu(s) pedido(s) ao todo ·{" "}
          {semResposta.length} inscrito(s) ainda por responder.
        </p>

        <BotoesAvisar
          porResponder={semResposta.length}
          publicado={questionarioTrofeusPublicado()}
          emailDemonstracao={EMAIL_PAINEL_DEMONSTRACAO}
        />

        <h2 style={{ marginTop: 0 }}>Quantos mandar fazer</h2>
        <div className="ad-cartao">
          {contagens.map((c) => (
            <div className="ad-linha" key={c.chave}>
              <span className="ad-etiqueta">{c.rotulo}</span>
              <div className="ad-barra-fundo">
                <div className="ad-barra" style={{ width: `${(c.pedidos / maxPedidos) * 100}%` }} />
              </div>
              <span className="ad-pedidos">{c.pedidos}</span>
              <span className="ad-jatem">{c.jaTem} já o têm</span>
            </div>
          ))}
          <p className="ad-legenda" style={{ marginTop: "1rem" }}>
            O número a negrito é quantos pedem cada troféu — é esse que interessa para encomendar. Os
            troféus de faturação aparecem só com &quot;já o têm&quot;: não se pedem no formulário, de
            propósito.
          </p>
        </div>

        <h2>Respostas</h2>
        {respostas.length === 0 ? (
          <p className="ad-legenda">Ainda ninguém respondeu.</p>
        ) : (
          <div className="ad-tabela-wrap">
            <table className="ad-tabela">
              <thead>
                <tr>
                  <th>Consultor</th>
                  <th>Patamar</th>
                  <th>Quer receber</th>
                  <th>Já tem</th>
                  <th>Quando</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {respostas.map((r) => (
                  <LinhaResposta resposta={r} key={r.email} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2>Ainda por responder</h2>
        {semResposta.length === 0 ? (
          <p className="ad-legenda">Respondeu toda a gente que está inscrita.</p>
        ) : (
          <div className="ad-cartao">
            {semResposta.map((i) => (
              <div
                key={i.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                  fontSize: "0.9rem",
                  padding: "0.3rem 0",
                }}
              >
                <span>
                  {i.nome} <span className="ad-legenda">— {i.email}</span>
                </span>
                <BotaoWhatsApp
                  telemovel={i.telemovel}
                  mensagem={`Olá ${i.nome}, ainda não respondeste ao questionário dos troféus do Teambuilding. Entra na tua área de consultor para responderes: ${base}/consultor`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
