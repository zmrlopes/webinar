import Link from "next/link";
import { lerConfig } from "@/lib/dashboard-negocio";
import { type DadosReservasMedias, resumir } from "@/lib/reservas-medias";

const eur = (v: number, d = 0) => `${v.toLocaleString("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d })} €`;
const num = (v: number, d = 0) => v.toLocaleString("pt-PT", { maximumFractionDigits: d });

function dataCurta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Servidor: a reserva média da equipa e de um consultor, ano a ano, como o
 * Analisador de Organização do MyOffice a calcula (valor ÷ nº de reservas).
 * Os números vêm de dashboard_config.reservas_medias, gravado pelo botão
 * «Atualizar dashboard» — ver src/lib/reservas-medias.ts.
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

  const anos = dados.anos;
  const volume = anos.reduce((s, a) => s + a.volume, 0);
  const reservas = anos.reduce((s, a) => s + a.reservas, 0);
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

  return (
    <div>
      <p className="dn-nota">
        A <strong>reserva média</strong> é a mesma conta do Analisador de Organização do MyOffice: o valor total das
        reservas a dividir pelo número de reservas. A <strong>da equipa</strong> junta as tuas reservas e as de toda a
        equipa. A <strong>de um consultor</strong> olha para as reservas pessoais de cada consultor que reservou nesse
        ano, faz a média de cada um e depois a média entre todos — cada pessoa conta uma vez, faça 2 ou 50 reservas.
        Ficam de fora as tuas reservas e as das contas próprias.
      </p>

      <div className="dn-stats">
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
        <div className="dn-stat">
          <div className="dn-stat-v">{num(reservas)}</div>
          <div className="dn-stat-l">Reservas da equipa desde {anos[0]!.ano}</div>
          <div className="dn-stat-delta">{eur(volume)} no total</div>
        </div>
      </div>

      <div className="dn-cartao">
        <table className="dn-tabela">
          <thead>
            <tr>
              <th>Ano</th>
              <th className="dn-num">Reservas da equipa</th>
              <th className="dn-num">Nº de reservas</th>
              <th className="dn-num">Reserva média da equipa</th>
              <th className="dn-num">Consultores que reservaram</th>
              <th className="dn-num">Reserva média de um consultor</th>
              <th className="dn-num">Reservas por consultor</th>
              <th className="dn-num">Venda por consultor</th>
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
                <td className="dn-num">{num(a.consultores)}</td>
                <td className="dn-num">
                  <strong>{eur(a.mediaConsultor, 2)}</strong>
                </td>
                <td className="dn-num">{num(a.reservasPorConsultor, 1)}</td>
                <td className="dn-num">{eur(a.vendaPorConsultor)}</td>
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
                <strong>{num(sempre.consultores)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(sempre.mediaConsultor, 2)}</strong>
              </td>
              <td className="dn-num">
                <strong>{num(sempre.reservasPorConsultor, 1)}</strong>
              </td>
              <td className="dn-num">
                <strong>{eur(sempre.vendaPorConsultor)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="dn-rodape">
        Mediana de um consultor (o consultor «do meio», menos puxada pelos casos extremos):{" "}
        {anos.map((a) => `${a.ano} ${eur(a.medianaConsultor)}`).join(" · ")} · desde sempre {eur(sempre.medianaConsultor)}.
        <br />O número de reservas é o valor ÷ a reserva média que o MyOffice mostra. Atualizado a {dataCurta(dados.ate)}{" "}
        com o botão «Atualizar dados»; os anos fechados ficam guardados e só o ano em curso volta a ser pedido.
      </p>
    </div>
  );
}
