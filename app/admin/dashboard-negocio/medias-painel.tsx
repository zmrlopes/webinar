import Link from "next/link";
import { ehContaPropria, lerConfig } from "@/lib/dashboard-negocio";
import { db } from "@/lib/db";
import { type AnoReservas, type DadosReservasMedias, resumir } from "@/lib/reservas-medias";

const eur = (v: number, d = 0) => `${v.toLocaleString("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d })} €`;
const num = (v: number, d = 0) => v.toLocaleString("pt-PT", { maximumFractionDigits: d });

function dataCurta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Meses decorridos no ano (o ano em curso conta até ao dia de hoje). */
function mesesDoAno(a: AnoReservas): number {
  if (!a.parcial) return 12;
  const [ano, mes, dia] = a.ate.split("-").map(Number) as [number, number, number];
  return mes - 1 + dia / new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Servidor: a reserva média e a faturação média por consultor, ano a ano.
 * A reserva média é a conta do Analisador de Organização do MyOffice (valor ÷
 * nº de reservas); a faturação são as reservas pessoais de cada consultor.
 * Os números vêm de dashboard_config.reservas_medias, gravado pelo botão
 * «Atualizar dashboard» — ver src/lib/reservas-medias.ts. Os consultores na
 * equipa de cada ano contam-se em equipa_afiliados (registados até ao fim do ano).
 */
export async function MediasPainel(): Promise<React.JSX.Element> {
  const dados = await lerConfig<DadosReservasMedias>("reservas_medias");
  if (!dados?.anos.length) {
    return (
      <p className="dn-nota">
        Ainda não há reservas médias guardadas. Carrega em{" "}
        <Link href="/admin/dashboard-negocio/atualizar" style={{ color: "#4b5320", fontWeight: 600 }}>
          Atualizar dados
        </Link>{" "}
        — a primeira vez vai buscar todos os anos desde 2019 e demora alguns minutos.
      </p>
    );
  }

  const { rows } = await db().query<{ nome: string; data_registo: string | null }>(
    "select nome, data_registo from equipa_afiliados",
  );
  const registos = rows
    .filter((r) => !ehContaPropria(r.nome) && r.data_registo)
    .map((r) => new Date(r.data_registo!).getUTCFullYear());
  const naEquipa = (ano: number) => registos.filter((a) => a <= ano).length;

  const anos = dados.anos.map((a) => {
    const faturacao = Object.values(a.pessoas).reduce((s, [v]) => s + v, 0);
    const equipa = naEquipa(a.ano);
    return { ...a, meses: mesesDoAno(a), faturacao, equipa };
  });
  const volume = anos.reduce((s, a) => s + a.volume, 0);
  const reservas = anos.reduce((s, a) => s + a.reservas, 0);
  const meses = anos.reduce((s, a) => s + a.meses, 0);
  const faturacao = anos.reduce((s, a) => s + a.faturacao, 0);
  const equipaHoje = registos.length;
  // Desde sempre, por consultor: as reservas pessoais de cada um somadas em todos os anos.
  const porPessoa = new Map<string, [number, number]>();
  for (const a of anos) {
    for (const [id, [v, c]] of Object.entries(a.pessoas)) {
      const t = porPessoa.get(id) ?? [0, 0];
      porPessoa.set(id, [t[0] + v, t[1] + c]);
    }
  }
  const sempre = resumir([...porPessoa.values()]);
  const atual = anos[anos.length - 1]!;
  const fechados = anos.filter((a) => !a.parcial && a.consultores);
  const mediaAnualConsultor = fechados.length
    ? fechados.reduce((s, a) => s + a.vendaPorConsultor, 0) / fechados.length
    : 0;

  return (
    <div>
      <p className="dn-nota">
        A <strong>reserva média</strong> é a mesma conta do Analisador de Organização do MyOffice: o valor das reservas a
        dividir pelo número de reservas. A <strong>faturação por consultor</strong> são as reservas pessoais de cada
        consultor: a média entre os que faturaram nesse ano e, na última coluna, a média por todos os consultores que
        estavam na equipa (incluindo quem não vendeu). Ficam de fora as tuas reservas e as das contas próprias.
      </p>

      <div className="dn-stats">
        <div className="dn-stat">
          <div className="dn-stat-v">{eur(mediaAnualConsultor)}</div>
          <div className="dn-stat-l">Faturação média de um consultor por ano (anos fechados)</div>
          <div className="dn-stat-delta">
            {atual.ano} até agora: {eur(atual.vendaPorConsultor)}
          </div>
        </div>
        <div className="dn-stat">
          <div className="dn-stat-v">{eur(reservas ? volume / reservas : 0, 2)}</div>
          <div className="dn-stat-l">Reserva média da equipa, desde {anos[0]!.ano}</div>
          <div className="dn-stat-delta">
            {atual.ano}: {eur(atual.media, 2)}
          </div>
        </div>
        <div className="dn-stat">
          <div className="dn-stat-v">{eur(sempre.mediaConsultor, 2)}</div>
          <div className="dn-stat-l">Reserva média de um consultor, desde {anos[0]!.ano}</div>
          <div className="dn-stat-delta">
            {atual.ano}: {eur(atual.mediaConsultor, 2)}
          </div>
        </div>
      </div>

      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Ano</th>
              <th className="dn-num">Faturação da equipa</th>
              <th className="dn-num">Nº de reservas</th>
              <th className="dn-num">Reserva média da equipa</th>
              <th className="dn-num">Reserva média de um consultor</th>
              <th className="dn-num">Consultores que faturaram</th>
              <th className="dn-num">Faturação média por consultor no ano</th>
              <th className="dn-num">Faturação média por consultor por mês</th>
              <th className="dn-num">Consultores na equipa</th>
              <th className="dn-num">Faturação média por consultor da equipa</th>
            </tr>
          </thead>
          <tbody>
            {anos.map((a) => (
              <tr key={a.ano}>
                <td>
                  <strong>{a.ano}</strong>
                  {a.parcial && <span className="dn-nivel"> · até {dataCurta(a.ate)}</span>}
                </td>
                <td className="dn-num">{eur(a.volume)}</td>
                <td className="dn-num">{num(a.reservas)}</td>
                <td className="dn-num">
                  <strong>{eur(a.media, 2)}</strong>
                </td>
                <td className="dn-num">
                  <strong>{eur(a.mediaConsultor, 2)}</strong>
                </td>
                <td className="dn-num">{num(a.consultores)}</td>
                <td className="dn-num">
                  <strong>{eur(a.vendaPorConsultor)}</strong>
                </td>
                <td className="dn-num">{eur(a.vendaPorConsultor / a.meses)}</td>
                <td className="dn-num">{a.equipa ? num(a.equipa) : "—"}</td>
                <td className="dn-num">{a.equipa ? eur(a.faturacao / a.equipa) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <strong>Desde sempre</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(volume)}</strong>
              </td>
              <td className="dn-num">
                <strong>{num(reservas)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(reservas ? volume / reservas : 0, 2)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(sempre.mediaConsultor, 2)}</strong>
              </td>
              <td className="dn-num">
                <strong>{num(sempre.consultores)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(sempre.vendaPorConsultor)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(meses ? sempre.vendaPorConsultor / meses : 0)}</strong>
              </td>
              <td className="dn-num">
                <strong>{num(equipaHoje)}</strong>
              </td>
              <td className="dn-num">
                <strong>{equipaHoje ? eur(faturacao / equipaHoje) : "—"}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="dn-rodape">
        Na linha «Desde sempre», a faturação por consultor é tudo o que cada um faturou desde {anos[0]!.ano}, em média
        entre os {num(sempre.consultores)} que já faturaram; por mês, a dividir por {num(meses)} meses. Os consultores na
        equipa são os registados até 31 de dezembro de cada ano (quem saiu conta nos anos em que lá estava).
        <br />
        Mediana da reserva de um consultor (o consultor «do meio»):{" "}
        {anos.map((a) => `${a.ano} ${eur(a.medianaConsultor)}`).join(" · ")} · desde sempre {eur(sempre.medianaConsultor)}.
        <br />O número de reservas é o valor ÷ a reserva média que o MyOffice mostra. Atualizado a {dataCurta(dados.ate)}{" "}
        com o botão «Atualizar dados»; os anos fechados ficam guardados e só o ano em curso volta a ser pedido.
      </p>
    </div>
  );
}
