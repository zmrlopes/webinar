import type { InscritoFaturacao } from "@/lib/teambuilding";
import { chaveDoPatamar } from "@/lib/trofeus-lista";
import { PatamaresInscritos } from "./patamares-inscritos";

export function TrofeusInscritos({ inscritos }: { inscritos: InscritoFaturacao[] }) {
  const respondentes = [...new Map(inscritos.filter(i => i.trofeusQuero !== null)
    .map(i => [i.email.trim().toLowerCase(), i])).values()];
  const entrouEsteAno = (i: InscritoFaturacao) => i.dataRegisto !== null &&
    new Date(i.dataRegisto).getUTCFullYear() === 2026;
  const novoJunior = (i: InscritoFaturacao) => entrouEsteAno(i);
  const noPatamar = (chave: string) => (i: InscritoFaturacao) => chaveDoPatamar(i.nivel) === chave;
  const grupos = [
    { titulo: "Juniores que iniciaram em 2026", chave: "patamar-junior", filtro: novoJunior },
    { titulo: "Restantes pedidos de Júnior", chave: "patamar-junior", filtro: (i: InscritoFaturacao) => !novoJunior(i) },
    { titulo: "Sénior", chave: "patamar-senior", filtro: noPatamar("patamar-senior") },
    { titulo: "Master", chave: "patamar-master", filtro: noPatamar("patamar-master") },
    { titulo: "Coordenador", chave: "patamar-coordenador", filtro: noPatamar("patamar-coordenador") },
    { titulo: "Diretor", chave: "patamar-diretor", filtro: noPatamar("patamar-diretor") },
  ];
  return <>
    <PatamaresInscritos inscritos={inscritos} />
    <h2>Troféus pedidos pelos inscritos</h2>
    <p className="ad-legenda">{respondentes.length} inscritos responderam ao inquérito. A partir de Sénior, cada tabela inclui apenas quem pediu esse troféu e está atualmente nesse mesmo patamar. Os pedidos de Júnior mantêm a divisão por ano de entrada, mesmo que a pessoa já tenha subido de patamar. O patamar e a data de entrada são os do registo da equipa.</p>
    {grupos.map(g => {
      const pessoas = respondentes.filter(i => i.trofeusQuero?.includes(g.chave) && g.filtro(i))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
      return <section key={g.titulo}>
        <h3 style={{ color: "#4b5320", marginTop: 28 }}>{g.titulo} · {pessoas.length}</h3>
        {!pessoas.length ? <p className="ad-legenda">Sem pedidos neste grupo.</p> :
          <div className="ad-tabela-wrap"><table className="ad-tabela">
            <thead><tr><th scope="col">Nome</th><th scope="col">Email</th><th scope="col">Patamar atual</th><th scope="col">Data de entrada</th><th scope="col">Observação</th></tr></thead>
            <tbody>{pessoas.map(i => <tr key={i.email}>
              <td>{i.nome}</td><td>{i.email}</td><td>{i.nivel || "Sem patamar disponível"}</td>
              <td>{i.dataRegisto ? new Date(i.dataRegisto).toISOString().slice(0, 10).split("-").reverse().join("/") : "Sem data disponível"}</td>
              <td>{i.trofeusJaTenho?.includes(g.chave) ? "Pediu e declarou já ter este troféu" : "—"}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>;
    })}
  </>;
}
