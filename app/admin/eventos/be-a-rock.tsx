import { BE_A_ROCK } from "@/lib/be-a-rock";
import { ContagemBeARock } from "../../components/resultados-be-a-rock";
import { listarVotosBeARock } from "@/lib/be-a-rock-servidor";
import s from "./be-a-rock.module.css";

export async function ResultadosBeARock() {
  let votos;
  try { votos = await listarVotosBeARock(); }
  catch (erro) {
    console.error("Falha ao consultar a sondagem do Be a Rock:", erro);
    return <article className="ad-evento-cartao"><h2 className="ad-evento-titulo">{BE_A_ROCK.titulo}</h2><p role="alert">Não foi possível carregar os resultados da sondagem.</p><a href="/admin/eventos">Tentar novamente</a></article>;
  }
  return <article className="ad-evento-cartao" aria-label="Resultados Be a Rock">
    <ContagemBeARock votos={votos} equipa="A tua equipa · sem a equipa da Ana Custódia" />
    <a className={s.atualizar} href="/admin/eventos">Atualizar resultados</a>
  </article>;
}
