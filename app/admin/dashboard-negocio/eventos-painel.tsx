import { resumirEventos, type DadosEventos, type MembroEventos } from "@/lib/eventos-dashboard";
import { CongressosNomes } from "./congressos-nomes";
import { EventosConsultores } from "./eventos-consultores";
import { EventosGraficos } from "./eventos-graficos";
import styles from "./eventos.module.css";

export function EventosPainel({ dados, equipa }: { dados: DadosEventos; equipa: MembroEventos[] }): React.JSX.Element {
  const resumo = resumirEventos(dados, equipa);
  const indisponiveis = dados.eventos.filter(e => (e.tipo === "Congresso" || e.tipo === "Convenção") && e.pessoas === null && e.inicio.slice(0, 10) <= new Date().toISOString().slice(0, 10)).length;
  return <div className={styles.panel}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Congressos e convenção</p>
      <h2>Eventos, faturação e criação de TPs</h2>
      <p>Compara a faturação e os TPs diretos da equipa com e sem inscrição em congressos e convenção.</p>
      <div className={styles.meta}><span><strong>{resumo.eventos.length}</strong> eventos com lista disponível</span><span><strong>{resumo.comparaveis}</strong> consultores na comparação</span></div>
    </header>
    {!resumo.eventos.length || !resumo.comparaveis ? <p className={styles.empty}>Ainda não há dados suficientes para comparar inscrições e resultados.</p> : <EventosGraficos grupos={resumo.grupos} linhas={resumo.linhas} />}
    <p className={styles.readingNote}>Inscrição não confirma presença. «Sem inscrição localizada» significa que não há registo nas listas disponíveis.</p>
    <details className={styles.details}>
      <summary>Resultados por consultor <span>{resumo.comparaveis}</span></summary>
      <div className={styles.detailsBody}><EventosConsultores consultores={resumo.consultores} /></div>
    </details>
    <CongressosNomes dados={dados} />
    <details className={styles.details}>
      <summary>Como é feita a comparação</summary>
      <div className={styles.method}>
        <p>A mesma população em todos os grupos: consultores ativos, com pelo menos um ano de registo e data de entrada conhecida. As tuas contas ficam excluídas.</p>
        <p>Contam apenas congressos e convenções já iniciados com lista disponível. Cada consultor conta uma vez por evento. Foram localizados {resumo.pessoas} consultores nas listas; só os que cumprem os critérios acima entram nos resultados.</p>
        <p>Os TPs (Travel Partners) diretos incluem membros recentes e inativos ligados ao consultor na última importação. Este valor mede recrutamento direto acumulado; não mede o tamanho total da rede nem o crescimento após o evento.</p>
        <p>As listas podem ser parciais.{indisponiveis > 0 && ` Há ${indisponiveis} evento(s) com lista indisponível, excluído(s) da contagem.`} A comparação mostra uma associação entre inscrição e resultados; não permite atribuir os resultados aos eventos.</p>
        <p>O multiplicador é a média do grupo com inscrição dividida pela média do grupo sem inscrição localizada. Por exemplo, 3× corresponde ao triplo da média (+200%). Cada escalão usa a mesma referência. Uma referência de zero ou um grupo sem consultores não permite calcular o multiplicador.</p>
        <p>Listas consultadas em {new Date(dados.atualizadoEm).toLocaleDateString("pt-PT", { timeZone: "UTC" })}. Faturação e relações de equipa vêm da última importação.</p>
      </div>
    </details>
  </div>;
}
