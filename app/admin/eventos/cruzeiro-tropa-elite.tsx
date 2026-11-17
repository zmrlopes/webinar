import {
  CRUZEIRO_TROPA_ELITE,
  OPCOES_CRUZEIRO_TROPA_ELITE,
  opcaoIncluiCruzeiro,
  resumirVotosCruzeiroTropaElite,
  ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE,
} from "@/lib/cruzeiro-tropa-elite";
import { listarVotosCruzeiroTropaElite } from "@/lib/cruzeiro-tropa-elite-servidor";
import s from "./be-a-rock.module.css";

export async function ResultadosCruzeiroTropaElite() {
  let votos;
  try { votos = await listarVotosCruzeiroTropaElite(); }
  catch (erro) {
    console.error("Falha ao consultar a sondagem do Cruzeiro Tropa de Elite:", erro);
    return <article className="ad-evento-cartao"><h2 className="ad-evento-titulo">{CRUZEIRO_TROPA_ELITE.titulo}</h2><p role="alert">Não foi possível carregar os resultados da sondagem.</p><a href="/admin/eventos">Tentar novamente</a></article>;
  }
  const resultados = resumirVotosCruzeiroTropaElite(votos);
  return <article className="ad-evento-cartao" aria-labelledby="admin-cruzeiro-tropa-elite">
    <p className={s.etiqueta}>SONDAGEM · ENCONTRO DA EQUIPA</p>
    <h2 id="admin-cruzeiro-tropa-elite" className="ad-evento-titulo">{CRUZEIRO_TROPA_ELITE.titulo}</h2>
    <p className="ad-evento-meta">{CRUZEIRO_TROPA_ELITE.dataTexto}</p>
    <p className="ad-evento-numero">{resultados.total} {resultados.total === 1 ? "consultor interessado" : "consultores interessados"}</p>
    {resultados.totalAcompanhantes > 0 && <p className="ad-evento-meta">+{resultados.totalAcompanhantes} {resultados.totalAcompanhantes === 1 ? "acompanhante" : "acompanhantes"} indicados no cruzeiro</p>}
    {OPCOES_CRUZEIRO_TROPA_ELITE.map(opcao => {
      const votosOpcao = resultados[opcao];
      const quantidade = votosOpcao.length;
      const percentagem = resultados.total ? Math.round(quantidade / resultados.total * 100) : 0;
      return <div key={opcao} className={s.zona}>
        <div className={s.total}><strong>{ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE[opcao]}</strong><span>{quantidade} {quantidade === 1 ? "voto" : "votos"} · {percentagem}%</span></div>
        <div className={s.barra} aria-hidden="true"><span style={{ width: `${percentagem}%` }} /></div>
        {quantidade > 0 && <details className={s.detalhes}><summary>Ver quem votou {ROTULO_OPCAO_CRUZEIRO_TROPA_ELITE[opcao]}</summary><ul>{votosOpcao.map(voto => <li key={voto.email}><strong>{voto.nome}</strong><span>{voto.email}{opcaoIncluiCruzeiro(opcao) && voto.acompanhantes > 0 ? ` · +${voto.acompanhantes} acompanhante${voto.acompanhantes === 1 ? "" : "s"}` : ""}</span></li>)}</ul></details>}
      </div>;
    })}
    {resultados.total === 0 && <p className="ad-evento-meta">Ainda não há votos.</p>}
    <a className={s.atualizar} href="/admin/eventos">Atualizar resultados</a>
  </article>;
}
