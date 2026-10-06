import { dataEvento, resumirEventos, type DadosEventos, type MembroEventos } from "@/lib/eventos-dashboard";

export function EventosPainel({ dados, equipa }: { dados: DadosEventos; equipa: MembroEventos[] }): React.JSX.Element {
  const resumo = resumirEventos(dados, equipa);
  const pessoais = dados.eventos.filter(e => e.reservas > 0).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const hoje = new Date().toISOString().slice(0, 10);
  return <div>
    <div className="dn-stats">
      <div className="dn-stat"><div className="dn-stat-v">{resumo.eventos.length}</div><div className="dn-stat-l">eventos principais com lista de inscritos recuperada</div></div>
      <div className="dn-stat"><div className="dn-stat-v">{resumo.pessoas}</div><div className="dn-stat-l">consultores da equipa com inscrição localizada</div></div>
      <div className="dn-stat"><div className="dn-stat-v">{resumo.inscricoes}</div><div className="dn-stat-l">inscrições únicas por consultor e evento</div></div>
    </div>
    <p className="dn-nota">MyOffice consultado em {new Date(dados.atualizadoEm).toLocaleDateString("pt-PT")}. Há reservas desde 2020. Uma inscrição ou reserva não comprova presença; o check-in é indicado à parte. As contagens abrangem apenas os nomes recuperados, incluindo listas parciais assinaladas abaixo. As listas antigas indisponíveis não são contadas como zero.</p>
    <h2 className="dn-h2">O teu histórico de reservas de eventos</h2>
    <p className="dn-sub">Reservas da tua conta, agrupadas por evento. Packs e compras para outras pessoas não confirmam a tua presença. As datas são as do evento, não as da compra.</p>
    <div className="dn-cartao"><table className="dn-tabela">
      <thead><tr><th>Evento</th><th>Quando</th><th>Comprovativo encontrado</th></tr></thead>
      <tbody>{pessoais.map(e => <tr key={e.id}>
        <td><strong>{e.nome}</strong><div className="dn-sub">{e.local}</div></td>
        <td className="dn-quando">{dataEvento(e)}{e.inicio.slice(0, 10) > hoje && <div>Futuro · reserva antecipada</div>}</td>
        <td>{e.evidenciaPessoal}<div className="dn-sub">{e.reservas} reserva{e.reservas === 1 ? "" : "s"} · {e.pessoas === null ? "lista da equipa indisponível" : e.nota ? "lista da equipa parcial" : "lista da equipa recuperada"}</div></td>
      </tr>)}</tbody>
    </table></div>
    <h2 className="dn-h2">Inscrições e resultados da equipa</h2>
    <p className="dn-sub">A comparação usa os mesmos {resumo.comparaveis} consultores ativos com pelo menos um ano e data de registo conhecida em todos os escalões. Exclui as tuas contas. Inclui congressos, convenções e bootcamps já iniciados; exclui Take Off, seminários, sessões semanais, jantares e extras.</p>
    <div className="dn-cartao"><table className="dn-tabela">
      <thead><tr><th>Inscrições localizadas</th><th className="dn-num">Pessoas</th><th className="dn-num">Faturação própria média</th><th className="dn-num">Recrutas diretos médios</th></tr></thead>
      <tbody>{resumo.linhas.map(l => <tr key={l.escalao}><td>{l.escalao}</td><td className="dn-num">{l.pessoas}</td><td className="dn-num">{l.pessoas ? l.faturacaoMedia.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "—"}</td><td className="dn-num">{l.pessoas ? l.diretosMedia.toLocaleString("pt-PT", { maximumFractionDigits: 1 }) : "—"}</td></tr>)}</tbody>
    </table></div>
    <p className="dn-nota">«Sem inscrição localizada» refere-se apenas às listas recuperadas: não significa que a pessoa nunca tenha ido a eventos. Os valores descrevem uma associação, não demonstram que frequentar eventos cause maior faturação. Faturação e recrutas vêm da última importação da equipa.</p>
  </div>;
}
