import {
  ATUALIZADO_EM,
  CONGRESSOS,
  CORRELACAO_DIRETOS,
  CORRELACAO_FATURACAO,
  ESCALOES,
  TOTAL_PESSOAS,
} from "./eventos-dados";
import type { EscalaoEventos } from "./eventos-dados";
import type { TotaisEquipa } from "@/lib/dashboard-negocio";

function euros(v: number): string {
  return `${Math.round(v).toLocaleString("pt-PT")} €`;
}

/** Barra proporcional ao maior valor da coluna, para se ler a subida de relance. */
function Barra({ valor, max }: { valor: number; max: number }): React.JSX.Element {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="dn-barra">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Quem nunca foi a nenhum congresso: os consultores ativos com mais de um ano (ao vivo, da base de
 * dados) menos quem já foi (os escalões agregados). null se as contas não
 * baterem — p.ex. a exportação da equipa ainda não ter sido importada.
 */
function calcularSemEventos(totais: TotaisEquipa): EscalaoEventos | null {
  const pessoas = totais.pessoas - TOTAL_PESSOAS;
  if (pessoas <= 0) return null;
  const vendasForam = ESCALOES.reduce((s, e) => s + e.pessoas * e.faturacaoMedia, 0);
  const diretosForam = ESCALOES.reduce((s, e) => s + e.pessoas * e.diretosMedia, 0);
  const faturacaoMedia = Math.max(0, (totais.somaVendas - vendasForam) / pessoas);
  const diretosMedia = Math.max(0, Math.round(((totais.somaDiretos - diretosForam) / pessoas) * 10) / 10);
  return { escalao: "Nenhum", pessoas, faturacaoMedia, diretosMedia };
}

export function EventosPainel({ totais }: { totais: TotaisEquipa }): React.JSX.Element {
  const semEventos = calcularSemEventos(totais);
  const linhas = semEventos ? [semEventos, ...ESCALOES] : ESCALOES;
  const totalInscritos = CONGRESSOS.reduce((s, c) => s + c.inscritos, 0);
  const maxFat = Math.max(...linhas.map((e) => e.faturacaoMedia));
  const maxDir = Math.max(...linhas.map((e) => e.diretosMedia));
  const foram = ESCALOES.reduce((s, e) => s + e.pessoas, 0);
  const mediaForam = foram > 0 ? ESCALOES.reduce((s, e) => s + e.pessoas * e.faturacaoMedia, 0) / foram : 0;
  const diretosForam = foram > 0 ? ESCALOES.reduce((s, e) => s + e.pessoas * e.diretosMedia, 0) / foram : 0;
  const maxCong = Math.max(...CONGRESSOS.map((c) => c.inscritos));
  const topo = ESCALOES[ESCALOES.length - 1] ?? { faturacaoMedia: 0, diretosMedia: 0 };
  const base = ESCALOES[0] ?? { faturacaoMedia: 0, diretosMedia: 0 };
  const vezesFat = base.faturacaoMedia > 0 ? Math.round(topo.faturacaoMedia / base.faturacaoMedia) : 0;
  const vezesDir = base.diretosMedia > 0 ? Math.round(topo.diretosMedia / base.diretosMedia) : 0;

  return (
    <div>
      <div className="dn-stats">
        <div className="dn-stat">
          <div className="dn-stat-v">{CONGRESSOS.length}</div>
          <div className="dn-stat-l">congressos grandes, Out/2023 a Mai/2026</div>
        </div>
        <div className="dn-stat">
          <div className="dn-stat-v">{TOTAL_PESSOAS}</div>
          <div className="dn-stat-l">pessoas da equipa que já foram a pelo menos um</div>
        </div>
        {semEventos && (
          <div className="dn-stat">
            <div className="dn-stat-v">{semEventos.pessoas}</div>
            <div className="dn-stat-l">consultores ativos que nunca foram a nenhum</div>
          </div>
        )}
        <div className="dn-stat">
          <div className="dn-stat-v">{totalInscritos}</div>
          <div className="dn-stat-l">inscrições da equipa, somando todos os congressos</div>
        </div>
      </div>

      <p className="dn-nota">
        Presença = estar inscrito no congresso. Contam só os congressos grandes (Congresso de Janeiro, Convenção, Be a
        Pro, Be a Leader e Bootcamp); ficam de fora as sessões semanais online, festas, jantares e visitas. Dados do
        MyOffice a {ATUALIZADO_EM}, cruzados com a faturação própria e os recrutas diretos de cada pessoa. Tu ficas de
        fora das contas. A linha «Nenhum» são os consultores com subscrição ativa e mais de um ano de casa que não
        aparecem em nenhum congresso (suspensos, cancelados e entradas recentes ficam de fora), calculada ao vivo a
        partir da última importação da equipa.
      </p>

      <div className="dn-destaque">
        Quem vai a <strong>7 ou mais</strong> congressos fatura, em média, <strong>{vezesFat}×</strong> mais e traz{" "}
        <strong>{vezesDir}×</strong> mais pessoas novas para a equipa do que quem só foi a um.
      </div>

      {semEventos && (
        <div className="dn-destaque">
          Quem já foi a pelo menos um congresso fatura, em média, <strong>{euros(mediaForam)}</strong> e traz{" "}
          <strong>{diretosForam.toFixed(1).replace(".", ",")}</strong> recrutas diretos. Quem nunca foi a nenhum fatura{" "}
          <strong>{euros(semEventos.faturacaoMedia)}</strong> e traz{" "}
          <strong>{semEventos.diretosMedia.toString().replace(".", ",")}</strong>
          {semEventos.faturacaoMedia > 0 && (
            <>
              {" "}
              — ou seja, quem vai fatura <strong>{Math.round(mediaForam / semEventos.faturacaoMedia)}×</strong> mais
            </>
          )}
          .
        </div>
      )}

      <h2 className="dn-h2">Quem vai a mais congressos fatura mais</h2>
      <p className="dn-sub">
        Faturação própria média por escalão de presenças. Correlação de {CORRELACAO_FATURACAO.toString().replace(".", ",")}{" "}
        (0 = sem relação, 1 = relação perfeita).
      </p>
      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Congressos</th>
              <th className="dn-num">Pessoas</th>
              <th>Faturação própria média</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((e) => (
              <tr key={e.escalao} style={e === semEventos ? { background: "#f3f1ea" } : undefined}>
                <td>
                  <strong>{e.escalao}</strong>
                </td>
                <td className="dn-num">{e.pessoas}</td>
                <td>
                  <div className="dn-celula-barra">
                    <span className="dn-valor">{euros(e.faturacaoMedia)}</span>
                    <Barra valor={e.faturacaoMedia} max={maxFat} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="dn-h2">E constrói mais equipa</h2>
      <p className="dn-sub">
        Recrutas diretos médios por escalão de presenças. Correlação de{" "}
        {CORRELACAO_DIRETOS.toString().replace(".", ",")}.
      </p>
      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Congressos</th>
              <th className="dn-num">Pessoas</th>
              <th>Recrutas diretos (média)</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((e) => (
              <tr key={e.escalao} style={e === semEventos ? { background: "#f3f1ea" } : undefined}>
                <td>
                  <strong>{e.escalao}</strong>
                </td>
                <td className="dn-num">{e.pessoas}</td>
                <td>
                  <div className="dn-celula-barra">
                    <span className="dn-valor">
                      {e.diretosMedia.toString().replace(".", ",")}
                    </span>
                    <Barra valor={e.diretosMedia} max={maxDir} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="dn-h2">Os congressos que entraram na conta</h2>
      <p className="dn-sub">Inscrições da nossa equipa em cada um. O MyOffice só guarda registo de bilhete desde outubro de 2023.</p>
      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Congresso</th>
              <th>Quando</th>
              <th>Inscritos da equipa</th>
            </tr>
          </thead>
          <tbody>
            {CONGRESSOS.map((c, i) => (
              <tr key={`${c.cat}-${i}`}>
                <td>
                  <strong>{c.cat}</strong>
                </td>
                <td className="dn-quando">{c.data}</td>
                <td>
                  <div className="dn-celula-barra">
                    <span className="dn-valor">{c.inscritos}</span>
                    <Barra valor={c.inscritos} max={maxCong} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="dn-rodape">
        Isto é a primeira parte do dashboard. A tabela pessoa a pessoa (quem foi a que congressos, com a sua faturação)
        fica para o passo seguinte, a ler da base de dados em tempo real — assim os nomes e os valores nunca ficam
        escritos no código.
      </p>
    </div>
  );
}
