import type { InscritoFaturacao } from "@/lib/teambuilding";

/**
 * Retrato de quem vai ao Teambuilding, calculado a cada visita a partir das
 * inscrições, do patamar/faturação em equipa_afiliados e de quem já respondeu
 * ao formulário de preparação — ao contrário do resto do relatório, que é
 * texto fixo, estes números estão sempre atualizados.
 */

// Ordem dos patamares na tabela; os que não estiverem aqui vão para o fim.
const ORDEM_PATAMARES = ["JUNIOR", "SENIOR", "MASTER", "COORDENADOR", "DIRETOR"];

const ESCALOES_FATURACAO: { rotulo: string; cabe: (v: number) => boolean }[] = [
  { rotulo: "Sem faturação (0€)", cabe: (v) => v <= 0 },
  { rotulo: "Até 5.000€", cabe: (v) => v > 0 && v < 5_000 },
  { rotulo: "5.000€ – 25.000€", cabe: (v) => v >= 5_000 && v < 25_000 },
  { rotulo: "25.000€ – 100.000€", cabe: (v) => v >= 25_000 && v < 100_000 },
  { rotulo: "100.000€ ou mais", cabe: (v) => v >= 100_000 },
];

function euros(valor: number): string {
  return `${Math.round(valor).toLocaleString("pt-PT")}€`;
}

function pct(parte: number, total: number): string {
  return total === 0 ? "—" : `${Math.round((parte / total) * 100)}%`;
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const centro = ordenados[meio] ?? 0;
  return ordenados.length % 2 ? centro : ((ordenados[meio - 1] ?? 0) + centro) / 2;
}

export function RetratoInscritos({
  inscritos,
  emailsResponderam,
}: {
  inscritos: InscritoFaturacao[];
  emailsResponderam: Set<string>;
}) {
  const total = inscritos.length;
  const responderam = inscritos.filter((i) => emailsResponderam.has(i.email)).length;

  const porPatamar = new Map<string, { inscritos: number; responderam: number }>();
  for (const i of inscritos) {
    const patamar = i.nivel?.trim().toUpperCase() || "Sem patamar";
    const linha = porPatamar.get(patamar) ?? { inscritos: 0, responderam: 0 };
    linha.inscritos += 1;
    if (emailsResponderam.has(i.email)) linha.responderam += 1;
    porPatamar.set(patamar, linha);
  }
  const posicao = (p: string) => {
    const n = ORDEM_PATAMARES.indexOf(p);
    return n === -1 ? ORDEM_PATAMARES.length + (p === "Sem patamar" ? 1 : 0) : n;
  };
  const patamares = [...porPatamar.entries()].sort((a, b) => posicao(a[0]) - posicao(b[0]));

  const juniores = porPatamar.get("JUNIOR") ?? { inscritos: 0, responderam: 0 };
  const experientes = patamares
    .filter(([p]) => p !== "JUNIOR" && p !== "Sem patamar")
    .reduce((s, [, l]) => ({ inscritos: s.inscritos + l.inscritos, responderam: s.responderam + l.responderam }), {
      inscritos: 0,
      responderam: 0,
    });

  const porAno = new Map<string, { inscritos: number; responderam: number; vendas: number[]; nomes: string[] }>();
  for (const i of inscritos) {
    const ano = i.dataRegisto ? String(new Date(i.dataRegisto).getFullYear()) : "Sem data";
    const linha = porAno.get(ano) ?? { inscritos: 0, responderam: 0, vendas: [], nomes: [] };
    linha.inscritos += 1;
    linha.nomes.push(i.nome);
    if (emailsResponderam.has(i.email)) linha.responderam += 1;
    if (i.vendas !== null) linha.vendas.push(i.vendas);
    porAno.set(ano, linha);
  }
  // Anos por ordem cronológica; "Sem data" no fim.
  const anos = [...porAno.entries()].sort((a, b) =>
    a[0] === "Sem data" ? 1 : b[0] === "Sem data" ? -1 : Number(a[0]) - Number(b[0]),
  );

  const vendas = inscritos.map((i) => i.vendas).filter((v): v is number => v !== null);
  const semDadosFaturacao = total - vendas.length;
  const medianaVendas = mediana(vendas);
  const maxVendas = vendas.length ? Math.max(...vendas) : null;
  const minVendas = vendas.length ? Math.min(...vendas) : 0;
  const acima100k = vendas.filter((v) => v >= 100_000).length;

  const adultos = inscritos.reduce((s, i) => s + i.adultos, 0);
  const acompanhantes = Math.max(0, adultos - total);
  const criancasMais10 = inscritos.reduce((s, i) => s + i.criancasMais10, 0);
  const criancasMenos10 = inscritos.reduce((s, i) => s + i.criancasMenos10, 0);
  const comCriancas = inscritos.filter((i) => i.criancasMais10 + i.criancasMenos10 > 0).length;
  const pessoas = adultos + criancasMais10 + criancasMenos10;

  return (
    <>
      <h3>Quem vai e quem respondeu</h3>
      <p className="rr-nota">Números de agora, calculados a partir das inscrições e do patamar e faturação importados da equipa.</p>
      <p>
        <strong>
          {responderam} dos {total} inscritos
        </strong>{" "}
        já responderam ao formulário ({pct(responderam, total)}). Entre os JUNIOR responderam{" "}
        {pct(juniores.responderam, juniores.inscritos)}; nos patamares acima, {pct(experientes.responderam, experientes.inscritos)}.
      </p>

      <div className="rr-tabela-wrap">
        <table className="rr-tabela">
          <thead>
            <tr>
              <th>Patamar</th>
              <th className="rr-num">Inscritos</th>
              <th className="rr-num">Responderam</th>
              <th className="rr-num">Taxa de resposta</th>
            </tr>
          </thead>
          <tbody>
            {patamares.map(([patamar, l]) => (
              <tr key={patamar}>
                <td>{patamar}</td>
                <td className="rr-num">
                  {l.inscritos} <span className="rr-nota">({pct(l.inscritos, total)})</span>
                </td>
                <td className="rr-num">{l.responderam}</td>
                <td className="rr-num">{pct(l.responderam, l.inscritos)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td className="rr-num">{total}</td>
              <td className="rr-num">{responderam}</td>
              <td className="rr-num">{pct(responderam, total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rr-tabela-wrap">
        <table className="rr-tabela">
          <thead>
            <tr>
              <th>Ano de início</th>
              <th className="rr-num">Inscritos</th>
              <th className="rr-num">Responderam</th>
              <th className="rr-num">Taxa de resposta</th>
              <th className="rr-num">Faturação mediana</th>
            </tr>
          </thead>
          <tbody>
            {anos.map(([ano, l]) => {
              const med = mediana(l.vendas);
              return (
                <tr key={ano}>
                  <td>{ano}</td>
                  <td className="rr-num">
                    {l.inscritos} <span className="rr-nota">({pct(l.inscritos, total)})</span>
                  </td>
                  <td className="rr-num">{l.responderam}</td>
                  <td className="rr-num">{pct(l.responderam, l.inscritos)}</td>
                  <td className="rr-num">{med === null ? "—" : euros(med)}</td>
                </tr>
              );
            })}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td className="rr-num">{total}</td>
              <td className="rr-num">{responderam}</td>
              <td className="rr-num">{pct(responderam, total)}</td>
              <td className="rr-num">{medianaVendas === null ? "—" : euros(medianaVendas)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rr-tabela-wrap">
        <table className="rr-tabela">
          <thead>
            <tr>
              <th>Ano de início</th>
              <th>Inscritos que começaram nesse ano</th>
            </tr>
          </thead>
          <tbody>
            {anos.map(([ano, l]) => (
              <tr key={ano}>
                <td style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                  <strong>{ano}</strong> <span className="rr-nota">({l.inscritos})</span>
                </td>
                <td>{[...l.nomes].sort((a, b) => a.localeCompare(b, "pt")).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rr-tabela-wrap">
        <table className="rr-tabela">
          <thead>
            <tr>
              <th>Faturação própria</th>
              <th className="rr-num">Inscritos</th>
              <th className="rr-num">% do total</th>
            </tr>
          </thead>
          <tbody>
            {ESCALOES_FATURACAO.map((e) => {
              const n = vendas.filter(e.cabe).length;
              return (
                <tr key={e.rotulo}>
                  <td>{e.rotulo}</td>
                  <td className="rr-num">{n}</td>
                  <td className="rr-num">{pct(n, total)}</td>
                </tr>
              );
            })}
            {semDadosFaturacao > 0 && (
              <tr>
                <td>Sem dados de faturação</td>
                <td className="rr-num">{semDadosFaturacao}</td>
                <td className="rr-num">{pct(semDadosFaturacao, total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {medianaVendas !== null && maxVendas !== null && (
        <p>
          A faturação vai de {euros(minVendas)} a {euros(maxVendas)}, com mediana de {euros(medianaVendas)}, e {acima100k}{" "}
          {acima100k === 1 ? "pessoa já fatura" : "pessoas já faturam"} 100 mil euros ou mais. Na mesma sala está quem
          começa do zero e quem já vive do negócio há anos.
        </p>
      )}
      <p>
        <strong>Acompanhantes.</strong> Além dos {total} inscritos vêm mais {acompanhantes} adultos acompanhantes (
        {adultos} adultos ao todo) e {criancasMais10 + criancasMenos10} crianças ({criancasMais10} pagantes e{" "}
        {criancasMenos10} não pagantes), trazidas por {comCriancas} dos inscritos: {pessoas} pessoas no total. O dia
        não pode ser só formação em sala.
      </p>
    </>
  );
}
