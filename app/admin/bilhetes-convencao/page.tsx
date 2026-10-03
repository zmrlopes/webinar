import Link from "next/link";
import { listarPedidosBilhete, totaisBilhetes, urlCsvParaSheets } from "@/lib/bilhetes-convencao";
import { BotaoWhatsApp } from "../botao-whatsapp";
import { BotaoRemover } from "./botao-remover";
import { CopiarFormula } from "./copiar-formula";

export const dynamic = "force-dynamic";

function pedidosTexto(n: number): string {
  return n === 1 ? "1 pedido" : `${n} pedidos`;
}

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function BilhetesConvencaoAdmin() {
  const pedidos = await listarPedidosBilhete();
  const totais = totaisBilhetes(pedidos);
  const base = process.env.SITE_BASE_URL ?? "https://webinar.viajareviver.net";
  const urlCsv = urlCsvParaSheets(base);

  return (
    <main className="bc-pagina">
      <style>{`
        .bc-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
          min-height: calc(100vh - 4rem);
        }
        .bc-caixa { max-width: 1100px; margin: 0 auto; }
        .bc-pagina h1 { font-size: 1.5rem; margin: 0 0 0.4rem; }
        .bc-pagina h2 { font-size: 1.1rem; margin: 2rem 0 0.75rem; }
        .bc-subtitulo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .bc-totais {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
        }
        .bc-total {
          background: #f7f6f3;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1rem 1.25rem;
        }
        .bc-total b { display: block; font-size: 1.9rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .bc-total span { color: #6b6a63; font-size: 0.85rem; }
        .bc-tabela { overflow-x: auto; }
        .bc-tabela table { min-width: 760px; }
        .bc-tabela th, .bc-tabela td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid #e4e2dc; vertical-align: top; }
        .bc-tabela th { font-size: 0.8rem; color: #6b6a63; }
        .bc-num { text-align: right; font-variant-numeric: tabular-nums; }
        .bc-formula { display: grid; gap: 0.5rem; }
        .bc-formula code {
          font-size: 0.75rem;
          word-break: break-all;
          background: #f7f6f3;
          border-radius: 6px;
          padding: 0.5rem 0.6rem;
          color: #6b6a63;
        }
        .bc-botao { margin-top: 0; justify-self: start; font-weight: 700; }
        .bc-passos { margin: 0 0 0.75rem; padding-left: 1.2rem; font-size: 0.9rem; }
      `}</style>

      <div className="bc-caixa">
        <h1>Bilhetes · Convenção Nacional iCligo 2027</h1>
        <p className="bc-subtitulo">
          Pedidos feitos em <Link href="/bilhetes-convencao">/bilhetes-convencao</Link> para os packs da Sara Izza.
        </p>

        <div className="bc-totais">
          <div className="bc-total">
            <b>{totais.bilhetes}</b>
            <span>bilhetes pedidos ({pedidosTexto(totais.pedidos)})</span>
          </div>
          <div className="bc-total">
            <b>{totais.total.bilhetes}</b>
            <span>bilhetes a pagar o valor total ({pedidosTexto(totais.total.pedidos)})</span>
          </div>
          <div className="bc-total">
            <b>{totais.parte.bilhetes}</b>
            <span>bilhetes a pagar só uma parte ({pedidosTexto(totais.parte.pedidos)})</span>
          </div>
        </div>

        <h2>Pedidos</h2>
        {pedidos.length === 0 ? (
          <p className="bc-subtitulo">Ainda não há pedidos. Partilha o link da página para começarem a chegar.</p>
        ) : (
          <div className="bc-tabela">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nome</th>
                  <th>Telemóvel</th>
                  <th className="bc-num">Bilhetes</th>
                  <th>Acompanhantes</th>
                  <th>Pagamento</th>
                  <th>Observações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>{formatarData(p.criadoEm)}</td>
                    <td>
                      {p.nome}
                      {p.email && <div className="bc-subtitulo" style={{ margin: 0 }}>{p.email}</div>}
                    </td>
                    <td>
                      <div>{p.telemovel}</div>
                      <BotaoWhatsApp
                        telemovel={p.telemovel}
                        mensagem={`Olá ${p.nome.split(/\s+/)[0] ?? ""}! Recebi o teu pedido de bilhete para a Convenção Nacional iCligo de 13 de março de 2027.`}
                      />
                    </td>
                    <td className="bc-num">{p.bilhetes}</td>
                    <td>{p.acompanhantes || "—"}</td>
                    <td>{p.pagamento === "O valor total" ? "Valor total" : "Só uma parte"}</td>
                    <td>{p.observacoes || "—"}</td>
                    <td>
                      <BotaoRemover id={p.id} nome={p.nome} email={p.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2>Ver no Google Sheets</h2>
        {urlCsv ? (
          <>
            <ol className="bc-passos">
              <li>Carrega no botão para copiar a fórmula.</li>
              <li>Abre a folha no Google Sheets, toca na célula A1 e cola.</li>
            </ol>
            <CopiarFormula formula={`=IMPORTDATA("${urlCsv}")`} />
            <p className="bc-subtitulo" style={{ marginTop: "0.5rem" }}>
              A folha atualiza-se sozinha (o Google vai buscar os dados mais ou menos de hora a hora). Esta
              página mostra sempre os pedidos ao minuto.
            </p>
          </>
        ) : (
          <p className="bc-subtitulo">Indisponível: falta a ADMIN_PASSWORD no servidor.</p>
        )}
      </div>
    </main>
  );
}
