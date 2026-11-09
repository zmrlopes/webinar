import { FORMATOS_CONTEUDO, NOMES_FORMATOS } from "@/lib/calendario-criativo";
import { listarRankingCalendarioCriativo } from "@/lib/calendario-criativo-registos";
import css from "./ranking.module.css";

export const dynamic = "force-dynamic";

export default async function RankingCalendarioCriativo() {
  const ranking = await listarRankingCalendarioCriativo();
  const totalPossivel = ranking[0]?.totalPossivel ?? 0;

  return (
    <section className={css.pagina}>
      <span className={css.etiqueta}>FORMAÇÃO E EVENTOS · CALENDÁRIO CRIATIVO</span>
      <h1>Ranking do calendário criativo</h1>
      <p>
        Consultores ordenados pelo número de publicações marcadas como “Já publiquei”, com a contagem
        por área (Reel, Carrossel, Fotografia e Post estático). {totalPossivel > 0 && `Total possível: ${totalPossivel} publicações.`}
      </p>
      {ranking.length ? (
        <div className={css.tabela}>
          <table>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Consultor</th>
                <th>Total</th>
                {FORMATOS_CONTEUDO.map(formato => <th key={formato}>{NOMES_FORMATOS[formato]}</th>)}
              </tr>
            </thead>
            <tbody>
              {ranking.map((c, i) => (
                <tr key={c.email}>
                  <td className={css.posicao}>{i + 1}</td>
                  <td>
                    <strong>{c.nome}</strong>
                    <small>{c.email}</small>
                  </td>
                  <td>
                    <strong>{c.total}</strong>
                    <small>{c.percentagem}% de {c.totalPossivel}</small>
                  </td>
                  {FORMATOS_CONTEUDO.map(formato => <td key={formato}>{c.porFormato[formato]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={css.vazio}>Ainda ninguém marcou publicações no calendário criativo.</p>
      )}
      <p className={`${css.nota} ${css.etiqueta}`} style={{ color: "#55574f", fontWeight: 400, letterSpacing: "normal" }}>
        Só consultores com pelo menos uma publicação marcada aparecem na lista.
      </p>
    </section>
  );
}
