import Link from "next/link";
import {
  buscarOrigemInscricoes,
  buscarVisaoGeralAdmin,
  listarAlertasAdmin,
  listarAssiduidadeFormacoesConsultores,
  listarAtividadeRecente,
  listarConsultoresAdmin,
  listarEquipaPorLider,
  listarInscricoesPorDia,
  listarTopLideres,
} from "@/lib/admin";
import { listarInscricoesEvento } from "@/lib/eventos";

export const dynamic = "force-dynamic";

const COR_PRESENTE = "#0ca30c";
const DIAS_JANELA = 14;

function IconLeads(): React.JSX.Element {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M15.8 14.3c2.7.3 4.7 2.4 4.7 5.7" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck(): React.JSX.Element {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconRelogio(): React.JSX.Element {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconMais(): React.JSX.Element {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function IconTicket(): React.JSX.Element {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8a2 2 0 1 1 0 4v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4a2 2 0 1 1 0-4V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3Z" />
      <path d="M9 4v16" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function formatarDataCurta(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function formatarDiaCurto(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default async function AdminDashboard() {
  const [
    visaoGeral,
    inscricoesEvento,
    inscricoesPorDia,
    origem,
    consultores,
    lideres,
    atividade,
    alertas,
    assiduidade,
    equipaPorLider,
  ] = await Promise.all([
    buscarVisaoGeralAdmin(),
    listarInscricoesEvento(),
    listarInscricoesPorDia(DIAS_JANELA),
    buscarOrigemInscricoes(DIAS_JANELA),
    listarConsultoresAdmin(),
    listarTopLideres(5),
    listarAtividadeRecente(6),
    listarAlertasAdmin(),
    listarAssiduidadeFormacoesConsultores(),
    listarEquipaPorLider(),
  ]);

  const totalEquipaLideres = equipaPorLider.reduce((soma, l) => soma + l.pessoas, 0);
  const maxEquipaLider = Math.max(1, ...equipaPorLider.map((l) => l.pessoas));

  const topConsultores = [...consultores]
    .filter((c) => c.inscricoesTotais > 0)
    .sort((a, b) => b.inscricoesTotais - a.inscricoesTotais)
    .slice(0, 5);

  const maisAssiduos = [...assiduidade]
    .filter((a) => a.assistiu > 0)
    .sort((a, b) => b.assistiu - a.assistiu)
    .slice(0, 5);

  const maisFaltosos = [...assiduidade]
    .filter((a) => a.faltou > 0)
    .sort((a, b) => b.faltou - a.faltou || b.pctFaltas - a.pctFaltas)
    .slice(0, 5);

  const maxDia = Math.max(1, ...inscricoesPorDia.map((d) => d.total));
  const totalJanela = inscricoesPorDia.reduce((soma, d) => soma + d.total, 0);
  const totalOrigem = origem.viaConsultor + origem.direto + origem.invalido;

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 1400px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0 0 1.25rem; }
        .ad-pagina h2 { color: #000000; font-size: 1.15rem; margin: 0 0 0.9rem; }
        .ad-kicker {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          font-weight: 700;
          color: #4b5320;
          margin: 0 0 0.75rem;
        }
        .ad-bloco { margin-bottom: 2.5rem; }
        .ad-grid-geral {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
        }
        .ad-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 1rem;
        }
        .ad-cartao {
          background: #ffffff;
          color: #000000;
          border: 1px solid #ececE6;
          border-radius: 16px;
          padding: 1.25rem 1.4rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 6px rgba(0, 0, 0, 0.04);
        }
        .ad-icone-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: #eef1e4;
          color: #4b5320;
          margin-bottom: 0.75rem;
        }
        .ad-grid-acoes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .ad-acao {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          text-decoration: none;
        }
        .ad-acao .ad-icone-badge { margin-bottom: 0; background: #4b5320; color: #ffffff; }
        .ad-acao-titulo { color: #000000; font-weight: 700; font-size: 0.95rem; }
        .ad-acao-sub { color: #6b6a63; font-size: 0.8rem; margin-top: 0.1rem; }
        .ad-numero { font-size: 2rem; font-weight: 800; line-height: 1.1; color: #000000; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.25rem; }

        .ad-grafico-barras {
          display: flex;
          align-items: flex-end;
          gap: 0.4rem;
          height: 140px;
          margin-top: 1rem;
        }
        .ad-barra-coluna { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
        .ad-barra {
          width: 100%;
          background: linear-gradient(180deg, #5d6b2a, #4b5320);
          border-radius: 4px 4px 0 0;
          min-height: 2px;
        }
        .ad-barra-valor { font-size: 0.7rem; color: #6b6a63; margin-bottom: 0.2rem; }
        .ad-barra-dia { font-size: 0.65rem; color: #6b6a63; margin-top: 0.4rem; }

        .ad-origem-linha { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; }
        .ad-origem-etiqueta { flex: 0 0 140px; font-size: 0.85rem; }
        .ad-origem-barra-fundo { flex: 1; height: 10px; border-radius: 5px; background: #eee; overflow: hidden; }
        .ad-origem-barra { height: 100%; background: linear-gradient(90deg, #5d6b2a, #4b5320); }
        .ad-origem-numero { flex: 0 0 auto; font-weight: 700; font-size: 0.85rem; }

        .ad-lista { list-style: none; margin: 0.5rem 0 0; padding: 0; }
        .ad-lista li {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e3dc;
          font-size: 0.9rem;
        }
        .ad-lista li:last-child { border-bottom: none; }
        .ad-lista-numero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.6rem;
          height: 1.6rem;
          padding: 0 0.4rem;
          border-radius: 999px;
          background: #eef1e4;
          color: #4b5320;
          font-weight: 700;
          font-size: 0.8rem;
        }
        .ad-lista-nome { flex: 1; }
        .ad-lista-sub { color: #6b6a63; font-size: 0.75rem; }
        .ad-alerta {
          background: #fdf3e0;
          border: 1px solid #e2cf94;
          color: #4a3c10;
          border-radius: 8px;
          padding: 0.6rem 0.85rem;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        .ad-alerta:last-child { margin-bottom: 0; }
        .ad-mudo { color: #6b6a63; font-size: 0.85rem; margin: 0.5rem 0 0; }
      `}</style>

      <div className="ad-caixa">
        <h1>Início</h1>
        <p className="ad-kicker">Visão geral</p>
        <div className="ad-grid-geral ad-bloco">
          <div className="ad-cartao">
            <div className="ad-icone-badge"><IconLeads /></div>
            <div className="ad-numero">{visaoGeral.leadsInscritas}</div>
            <div className="ad-legenda">Leads inscritas</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-icone-badge"><IconLeads /></div>
            <div className="ad-numero">{visaoGeral.consultoresInscritos}</div>
            <div className="ad-legenda">Consultores inscritos</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-icone-badge" style={{ background: "#e4f3e4", color: COR_PRESENTE }}>
              <IconCheck />
            </div>
            <div className="ad-numero" style={{ color: COR_PRESENTE }}>
              {visaoGeral.leadsPresentes}
            </div>
            <div className="ad-legenda">Leads presentes ({visaoGeral.pctLeadsPresentes}%)</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-icone-badge" style={{ background: "#e4f3e4", color: COR_PRESENTE }}>
              <IconCheck />
            </div>
            <div className="ad-numero" style={{ color: COR_PRESENTE }}>
              {visaoGeral.consultoresPresentes}
            </div>
            <div className="ad-legenda">Consultores presentes ({visaoGeral.pctConsultoresPresentes}%)</div>
          </div>
          <div className="ad-cartao">
            <div className="ad-icone-badge"><IconRelogio /></div>
            <div className="ad-numero">
              {visaoGeral.duracaoMediaLeadsMinutos !== null ? `${visaoGeral.duracaoMediaLeadsMinutos} min` : "—"}
            </div>
            <div className="ad-legenda">Duração média (leads presentes)</div>
          </div>
        </div>

        <p className="ad-kicker">Ações rápidas</p>
        <div className="ad-grid-acoes ad-bloco">
          <Link href="/admin/formacoes/nova" className="ad-cartao ad-acao">
            <div className="ad-icone-badge"><IconMais /></div>
            <div>
              <div className="ad-acao-titulo">Criar formação</div>
              <div className="ad-acao-sub">Na tua conta Zoom</div>
            </div>
          </Link>
          <Link href="/admin/consultores" className="ad-cartao ad-acao">
            <div className="ad-icone-badge"><IconLeads /></div>
            <div>
              <div className="ad-acao-titulo">{visaoGeral.consultoresAtivos} consultores</div>
              <div className="ad-acao-sub">Ver todos →</div>
            </div>
          </Link>
          <Link href="/admin/eventos" className="ad-cartao ad-acao">
            <div className="ad-icone-badge"><IconTicket /></div>
            <div>
              <div className="ad-acao-titulo">{inscricoesEvento.length} em eventos</div>
              <div className="ad-acao-sub">Ver eventos →</div>
            </div>
          </Link>
        </div>

        <div className="ad-grid-2 ad-bloco">
          <div className="ad-cartao">
            <h2>Inscrições por dia</h2>
            <p className="ad-legenda" style={{ marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
              Últimos {DIAS_JANELA} dias · {totalJanela} no total
            </p>
            <div className="ad-grafico-barras">
              {inscricoesPorDia.map((d) => (
                <div className="ad-barra-coluna" key={d.dia}>
                  {d.total > 0 && <span className="ad-barra-valor">{d.total}</span>}
                  <div className="ad-barra" style={{ height: `${(d.total / maxDia) * 100}%` }} />
                  <span className="ad-barra-dia">{formatarDiaCurto(d.dia)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ad-cartao">
            <h2>Origem das inscrições</h2>
            <p className="ad-legenda" style={{ marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
              Últimos {DIAS_JANELA} dias
            </p>
            {totalOrigem === 0 ? (
              <p className="ad-mudo">Sem inscrições neste período.</p>
            ) : (
              <>
                <div className="ad-origem-linha">
                  <span className="ad-origem-etiqueta">Consultores</span>
                  <div className="ad-origem-barra-fundo">
                    <div
                      className="ad-origem-barra"
                      style={{ width: `${(origem.viaConsultor / totalOrigem) * 100}%` }}
                    />
                  </div>
                  <span className="ad-origem-numero">{origem.viaConsultor}</span>
                </div>
                <div className="ad-origem-linha">
                  <span className="ad-origem-etiqueta">Direto</span>
                  <div className="ad-origem-barra-fundo">
                    <div className="ad-origem-barra" style={{ width: `${(origem.direto / totalOrigem) * 100}%` }} />
                  </div>
                  <span className="ad-origem-numero">{origem.direto}</span>
                </div>
                <div className="ad-origem-linha">
                  <span className="ad-origem-etiqueta">Referências inválidas</span>
                  <div className="ad-origem-barra-fundo">
                    <div
                      className="ad-origem-barra"
                      style={{ width: `${(origem.invalido / totalOrigem) * 100}%` }}
                    />
                  </div>
                  <span className="ad-origem-numero">{origem.invalido}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-grid-2 ad-bloco">
          <div className="ad-cartao">
            <h2>Top consultores</h2>
            {topConsultores.length === 0 ? (
              <p className="ad-mudo">Ainda sem inscrições atribuídas a consultores.</p>
            ) : (
              <ul className="ad-lista">
                {topConsultores.map((c, i) => (
                  <li key={c.referencia}>
                    <span className="ad-lista-nome">
                      <span className="ad-lista-numero">{i + 1}</span> {c.nome ?? c.email}
                    </span>
                    <strong>{c.inscricoesTotais}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ad-cartao">
            <h2>Top líderes</h2>
            {lideres.length === 0 ? (
              <p className="ad-mudo">Ainda sem líderes com equipa e leads.</p>
            ) : (
              <ul className="ad-lista">
                {lideres.map((l, i) => (
                  <li key={l.email}>
                    <span className="ad-lista-nome">
                      <span className="ad-lista-numero">{i + 1}</span> {l.nome}{" "}
                      <span className="ad-lista-sub">({l.equipaTotal} na equipa)</span>
                    </span>
                    <strong>{l.leadsEquipa}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ad-bloco">
          <div className="ad-cartao">
            <h2>Equipa por líder</h2>
            <p className="ad-legenda" style={{ marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
              Pessoas em cada equipa de topo (líder + toda a descendência) · {totalEquipaLideres} no total
            </p>
            {equipaPorLider.length === 0 ? (
              <p className="ad-mudo">Ainda sem líderes de topo com equipa.</p>
            ) : (
              equipaPorLider.map((l) => (
                <div className="ad-origem-linha" key={l.nome}>
                  <span className="ad-origem-etiqueta" style={{ flexBasis: 160 }}>
                    {l.nome}
                  </span>
                  <div className="ad-origem-barra-fundo">
                    <div
                      className="ad-origem-barra"
                      style={{ width: `${(l.pessoas / maxEquipaLider) * 100}%` }}
                    />
                  </div>
                  <span className="ad-origem-numero">{l.pessoas}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ad-grid-2 ad-bloco">
          <div className="ad-cartao">
            <h2>Mais assíduos em formações</h2>
            <p className="ad-legenda" style={{ marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
              Consultores que mais formações assistiram
            </p>
            {maisAssiduos.length === 0 ? (
              <p className="ad-mudo">Ainda sem presenças registadas em formações.</p>
            ) : (
              <ul className="ad-lista">
                {maisAssiduos.map((a, i) => (
                  <li key={a.email}>
                    <span className="ad-lista-nome">
                      <span className="ad-lista-numero">{i + 1}</span> {a.nome}{" "}
                      <span className="ad-lista-sub">
                        ({a.assistiu}/{a.inscricoesFormacoes} inscrições)
                      </span>
                    </span>
                    <strong>{a.assistiu}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ad-cartao">
            <h2>Faltam a formações</h2>
            <p className="ad-legenda" style={{ marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
              Inscrevem-se mas não assistem
            </p>
            {maisFaltosos.length === 0 ? (
              <p className="ad-mudo">Sem faltas registadas em formações.</p>
            ) : (
              <ul className="ad-lista">
                {maisFaltosos.map((a, i) => (
                  <li key={a.email}>
                    <span className="ad-lista-nome">
                      <span className="ad-lista-numero">{i + 1}</span> {a.nome}{" "}
                      <span className="ad-lista-sub">
                        ({a.faltou}/{a.inscricoesFormacoes} inscrições, {a.pctFaltas}%)
                      </span>
                    </span>
                    <strong style={{ color: "#d03b3b" }}>{a.faltou}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ad-grid-2 ad-bloco">
          <div className="ad-cartao">
            <h2>Inscrições recentes</h2>
            {atividade.length === 0 ? (
              <p className="ad-mudo">Sem inscrições ainda.</p>
            ) : (
              <ul className="ad-lista">
                {atividade.map((a, i) => (
                  <li key={i}>
                    <span className="ad-lista-nome">
                      {a.nome} <span className="ad-lista-sub">— {a.webinarTitulo}</span>
                    </span>
                    <span className="ad-lista-sub">{formatarDataCurta(a.criadoEm)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ad-cartao">
            <h2>Alertas</h2>
            {alertas.length === 0 ? (
              <p className="ad-mudo">Sem nada a assinalar de momento.</p>
            ) : (
              alertas.map((a, i) => (
                <p className="ad-alerta" key={i}>
                  {a}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
