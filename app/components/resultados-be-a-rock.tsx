import { BE_A_ROCK, ROTULO_ZONA_BE_A_ROCK, ZONAS_BE_A_ROCK, resumirVotosBeARock, type VotoBeARock } from "@/lib/be-a-rock";
import s from "../admin/eventos/be-a-rock.module.css";

/** Apresentação comum; recebe apenas os votos já autorizados e filtrados no servidor. */
export function ContagemBeARock({ votos, equipa }: { votos: VotoBeARock[]; equipa: string }) {
  const resultados = resumirVotosBeARock(votos);
  return <>
    <p className={s.etiqueta}>SONDAGEM · ENCONTRO DA EQUIPA</p>
    <h2 className={s.titulo}>{BE_A_ROCK.titulo}</h2>
    <p className={s.meta}>{BE_A_ROCK.dataTexto}</p>
    <p className={s.meta}>{equipa}</p>
    <p className={s.numero}>{resultados.total} {resultados.total === 1 ? "consultor interessado" : "consultores interessados"}</p>
    {ZONAS_BE_A_ROCK.map(zona => {
      const quantidade = resultados[zona].length;
      const percentagem = resultados.total ? Math.round(quantidade / resultados.total * 100) : 0;
      return <div key={zona} className={s.zona}>
        <div className={s.total}><strong>{ROTULO_ZONA_BE_A_ROCK[zona]}</strong><span>{quantidade} {quantidade === 1 ? "voto" : "votos"} · {percentagem}%</span></div>
        <div className={s.barra} aria-hidden="true"><span style={{ width: `${percentagem}%` }} /></div>
        {quantidade > 0 && <details className={s.detalhes}><summary>Ver quem votou {ROTULO_ZONA_BE_A_ROCK[zona]}</summary><ul>{resultados[zona].map(voto => <li key={voto.email}><strong>{voto.nome}</strong><span>{voto.email}</span></li>)}</ul></details>}
      </div>;
    })}
    {resultados.total === 0 && <p className={s.meta}>Ainda não há votos.</p>}
  </>;
}
