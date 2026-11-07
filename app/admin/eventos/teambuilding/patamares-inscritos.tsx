import type { InscritoFaturacao } from "@/lib/teambuilding";
import { progressaoInscrito } from "@/lib/inscritos-patamares";
import { chaveDoPatamar } from "@/lib/trofeus-lista";

const nf = new Intl.NumberFormat("pt-PT", {maximumFractionDigits: 2});
const data = (v: Date | null) => v ? new Intl.DateTimeFormat("pt-PT", {timeZone: "Europe/Lisbon"}).format(new Date(v)) : "Sem data";
export function PatamaresInscritos({inscritos}: {inscritos: InscritoFaturacao[]}) {
  const lista = [...new Map(inscritos.map(i => [i.email.trim().toLowerCase() === "patricia.alxandra.mendonca@gmail.com" ? "wanderlustbypatricia@gmail.com" : i.email.trim().toLowerCase(), i])).values()];
  const novos = lista.filter(i => i.dataRegisto && new Date(i.dataRegisto).getUTCFullYear() === 2026 && chaveDoPatamar(i.nivel) === "patamar-senior");
  const proximos = lista.map(i => ({...i, progressao: progressaoInscrito(i.nivel, i.pontos)}))
    .filter(i => i.progressao?.perto).sort((a,b) => a.progressao!.faltam - b.progressao!.faltam);
  return <section id="patamares-inscritos" aria-labelledby="titulo-patamares-inscritos">
    <h2 id="titulo-patamares-inscritos">Patamares · evolução dos inscritos</h2>
    <p className="ad-legenda">Calculado para todos os inscritos, incluindo quem ainda não respondeu ao questionário dos troféus. Os patamares e pontos vêm da última atualização da equipa; cada linha identifica a data dos seus dados.</p>
    <h3 style={{color: "#4b5320"}}>Entraram em 2026 e já são Sénior · {novos.length}</h3>
    {!novos.length ? <p>Sem casos nos dados disponíveis.</p> : <div className="ad-tabela-wrap"><table className="ad-tabela">
      <thead><tr><th scope="col">Nome</th><th scope="col">Entrada</th><th scope="col">Patamar atual</th><th scope="col">Pontos de carreira</th><th scope="col">Dados de</th></tr></thead>
      <tbody>{novos.map(i => <tr key={i.email}><td>{i.nome}</td><td>{data(i.dataRegisto)}</td><td>{i.nivel}</td><td>{i.pontos === null ? "Sem dados" : nf.format(i.pontos)}</td><td>{data(i.atualizadoEm)}</td></tr>)}</tbody>
    </table></div>}
    <h3 style={{color: "#4b5320", marginTop: 28}}>Perto do próximo patamar · {proximos.length}</h3>
    <p className="ad-legenda">Faltam até 15% do intervalo entre o patamar atual e o seguinte, ou até 3 pontos para um Júnior. Esta proximidade não confirma uma subida até 14/11/2026; depende dos novos pontos e da validação no MyOffice.</p>
    {!proximos.length ? <p>Sem casos com este critério nos dados disponíveis.</p> : <div className="ad-tabela-wrap"><table className="ad-tabela">
      <thead><tr><th scope="col">Nome</th><th scope="col">Entrada</th><th scope="col">Patamar atual</th><th scope="col">Próximo patamar</th><th scope="col">Pontos atuais</th><th scope="col">Meta</th><th scope="col">Faltam pontos</th><th scope="col">Dados de</th></tr></thead>
      <tbody>{proximos.map(i => <tr key={i.email}><td>{i.nome}</td><td>{data(i.dataRegisto)}{i.dataRegisto && new Date(i.dataRegisto).getUTCFullYear() === 2026 && <small style={{display: "block", color: "#4b5320"}}>Entrada em 2026</small>}</td><td>{i.nivel}</td><td>{i.progressao!.proximo}</td><td>{nf.format(i.pontos!)}</td><td>{nf.format(i.progressao!.limiar)}</td><td><strong>{nf.format(i.progressao!.faltam)}</strong></td><td>{data(i.atualizadoEm)}</td></tr>)}</tbody>
    </table></div>}
    <p className="ad-legenda">Atualizar os dados da equipa no MyOffice atualiza estas tabelas na visita seguinte. A lista de troféus pedidos e as respostas do questionário mantêm-se independentes desta análise.</p>
  </section>;
}
