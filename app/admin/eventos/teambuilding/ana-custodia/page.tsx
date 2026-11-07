import Link from "next/link";
import { reconhecimentoAnaCustodia } from "@/lib/reconhecimento-ana-custodia";
import s from "./pagina.module.css";

export const dynamic = "force-dynamic";
const numero = (v: number | null, casas = 2) => v === null ? "Sem dados" : new Intl.NumberFormat("pt-PT", {maximumFractionDigits: casas, minimumFractionDigits: casas}).format(v);
const data = (v: Date | string | null) => v ? new Intl.DateTimeFormat("pt-PT", {timeZone: "Europe/Lisbon"}).format(new Date(v)) : "Sem data";

export default async function ReconhecimentoAna() {
  const {perfil, pontos, organizacao} = await reconhecimentoAnaCustodia();
  return <main className={s.pagina}>
    <Link href="/admin/eventos/teambuilding" className={s.voltar}>← Voltar ao evento</Link>
    <header className={s.cabecalho}>
      <p className={s.etiqueta}>Teambuilding · 14 de novembro de 2026 · Reconhecimento</p>
      <h1>Ana Custódia</h1><p className={s.subtitulo}>A chegada a Diretora</p>
      <p>Uma conquista construída com liderança e crescimento da organização.</p>
      <p className={s.nota}>Entrada na iCliGo: {data(perfil?.data_registo ?? null)} · Patamar registado: {perfil?.nivel ?? "Sem dados"}</p>
    </header>
    <section className={s.destaque} aria-labelledby="crescimento-ana">
      <div><p className={s.etiqueta}>Pontos de carreira · crescimento desde o fecho de 2025</p>
        <h2 id="crescimento-ana">{pontos.crescimento === null ? "Sem comparação disponível" : `+${numero(pontos.crescimento, 1)}%`}</h2>
        <p>Do acumulado em 31/12/2025 ao acumulado de 2026 até {pontos.ate ?? "à última recolha"}.</p>
      </div>
      <div className={s.comparacao}>
        {[{nome: "Fecho de 2025", valor: pontos.base}, {nome: "Acumulado de 2026", valor: pontos.atuais}].map(l => <div key={l.nome}>
          <div className={s.rotulo}><span>{l.nome}</span><strong>{numero(l.valor)} pontos</strong></div>
          <div className={s.trilho} aria-hidden="true"><div style={{width: `${l.valor !== null && pontos.atuais ? Math.min(100, l.valor / pontos.atuais * 100) : 0}%`}} /></div>
        </div>)}
      </div>
    </section>
    <section className={s.metricas} aria-label="Números do reconhecimento">
      <article><p>Pontos conquistados em 2026</p><strong>{numero(pontos.ano)}</strong><small>Até {pontos.ate ?? "à última recolha"}</small></article>
      <article><p>Da carreira, conquistados em 2026</p><strong>{numero(pontos.pesoAno, 1)}%</strong><small>Percentagem dos pontos acumulados atuais</small></article>
      <article><p>Faturação da organização em 2026</p><strong>{organizacao.volume === null ? "Sem dados" : `${numero(organizacao.volume)} €`}</strong><small>Consultora e descendência · até {data(organizacao.ate)}</small></article>
      <article><p>Consultores ativos na organização</p><strong>{numero(organizacao.ativos, 0)}</strong><small>{numero(organizacao.total, 0)} consultores no total · hierarquia atual, sem contar a Ana · dados de {data(organizacao.atualizadoEm)}</small></article>
    </section>
    {pontos.ano !== null && pontos.base !== null && pontos.ano > pontos.base && <section className={s.frase}>
      <h2>Mais pontos num ano do que em todos os anteriores juntos.</h2>
      <p>Até {pontos.ate}, a Ana conquistou {numero(pontos.ano)} pontos em 2026, superando os {numero(pontos.base)} pontos acumulados até ao fim de 2025.</p>
    </section>}
    <section className={s.metodo}>
      <h2>Como é calculado o crescimento?</h2>
      <p>({numero(pontos.atuais)} − {numero(pontos.base)}) ÷ {numero(pontos.base)} × 100 = <strong>{numero(pontos.crescimento, 1)}%</strong>.</p>
      <p>A base de 2025 é calculada pelos pontos de carreira atuais menos os pontos conquistados em 2026, usando a mesma recolha do dashboard.</p>
      <p>Esta percentagem mede o aumento dos pontos acumulados desde o fecho de 2025. Não compara a produção anual de 2026 com a produção anual de 2025, nem representa o crescimento da faturação. Para essas comparações é necessária a recolha dos períodos correspondentes.</p>
      <p className={s.nota}>Fontes: Mapas do dashboard, Analisador de Organização do MyOffice e registo da equipa. Os valores são lidos no servidor e acompanham as atualizações dessas fontes.</p>
    </section>
  </main>;
}
