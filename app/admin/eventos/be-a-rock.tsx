import { BE_A_ROCK, ZONAS_BE_A_ROCK, resumirVotosBeARock } from "@/lib/be-a-rock";
import { listarVotosBeARock } from "@/lib/be-a-rock-servidor";
import s from "./be-a-rock.module.css";

export async function ResultadosBeARock() {
  let votos;
  try { votos = await listarVotosBeARock(); }
  catch (erro) {
    console.error("Falha ao consultar a sondagem do Be a Rock:", erro);
    return <article className="ad-evento-cartao"><h2 className="ad-evento-titulo">{BE_A_ROCK.titulo}</h2><p role="alert">Não foi possível carregar os resultados da sondagem.</p><a href="/admin/eventos">Tentar novamente</a></article>;
  }
  const resultados = resumirVotosBeARock(votos);
  return <article className="ad-evento-cartao" aria-labelledby="admin-be-a-rock">
    <p className={s.etiqueta}>SONDAGEM · ENCONTRO DA EQUIPA</p>
    <h2 id="admin-be-a-rock" className="ad-evento-titulo">{BE_A_ROCK.titulo}</h2>
    <p className="ad-evento-meta">{BE_A_ROCK.dataTexto}</p>
    <p className="ad-evento-numero">{resultados.total} {resultados.total === 1 ? "consultor interessado" : "consultores interessados"}</p>
    {ZONAS_BE_A_ROCK.map(zona => {
      const quantidade = resultados[zona].length;
      const percentagem = resultados.total ? Math.round(quantidade / resultados.total * 100) : 0;
      return <div key={zona} className={s.zona}>
        <div className={s.total}><strong>{zona}</strong><span>{quantidade} {quantidade === 1 ? "voto" : "votos"} · {percentagem}%</span></div>
        <div className={s.barra} aria-hidden="true"><span style={{ width: `${percentagem}%` }} /></div>
        {quantidade > 0 && <details className={s.detalhes}><summary>Ver quem votou {zona}</summary><ul>{resultados[zona].map(voto => <li key={voto.email}><strong>{voto.nome}</strong><span>{voto.email}</span></li>)}</ul></details>}
      </div>;
    })}
    {resultados.total === 0 && <p className="ad-evento-meta">Ainda não há votos.</p>}
    <a className={s.atualizar} href="/admin/eventos">Atualizar resultados</a>
  </article>;
}
