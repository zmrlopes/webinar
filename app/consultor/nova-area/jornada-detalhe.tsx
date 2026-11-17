"use client";

import { useEffect, useRef, useState } from "react";
import type { CandidatoJornada, DetalheJornada } from "@/lib/consultor-jornada-equipa";
import { FONTE_CRITERIOS_PATAMARES, nomePatamarQuantidade } from "@/lib/patamares-carreira";
import s from "./jornada-detalhe.module.css";

const n = (valor: number) => valor.toLocaleString("pt-PT", {maximumFractionDigits: 2});
const faltaApoio = (c: CandidatoJornada) => c.criteriosEmFalta.map(r => `${r.quantidade} ${nomePatamarQuantidade(r.patamar, r.quantidade)} em linhas distintas`).join(" e ");

function CartaoCandidato({candidato: c, contavaPara}: {candidato: CandidatoJornada; contavaPara?: string | null}) {
  return <article className={s.candidato}>
    <span className={s.etiqueta}>LINHA DE {c.linhaNome}</span>
    <h3>{c.nome}</h3>
    <p className={s.motivo}>{contavaPara ? <>Esta linha já conta para <strong>{contavaPara}</strong>. Para passar a ocupar uma vaga de <strong>{c.objetivo}</strong>, é preciso assegurar as restantes vagas noutras linhas.</> : <>Esta linha ainda não ocupa uma das vagas atuais. Ao atingir <strong>{c.objetivo}</strong>, pode passar a contar para essa vaga.</>}</p>
    <p className={s.patamar}>{c.patamarAtual} <span aria-hidden="true">→</span> Objetivo: <strong>{c.objetivo}</strong></p>
    <div className={s.pontos}><strong>{n(c.pontos)}</strong> / {n(c.metaPontos)} pontos</div>
    <p className={s.faltam}>{c.faltamPontos > 0 ? <>{c.faltamPontos === 1 ? "Falta" : "Faltam"} <strong>{n(c.faltamPontos)} {c.faltamPontos === 1 ? "ponto" : "pontos"}</strong> para {c.objetivo}.</> : <>Pontos para {c.objetivo} já cumpridos; patamar registado: {c.patamarAtual}.</>}</p>
    {c.criteriosEmFalta.length > 0 && <p className={s.apoio}>Na organização de {c.nome.split(" ")[0]}, {c.criteriosEmFalta.reduce((total, r) => total + r.quantidade, 0) === 1 ? "falta" : "faltam"} também <strong>{faltaApoio(c)}</strong>.</p>}
    <p className={s.acao}>{c.faltamPontos > 0 ? `Combina um objetivo de pontos e acompanha as próximas ações com ${c.nome.split(" ")[0]}.` : c.criteriosEmFalta.length ? "Foca o acompanhamento nas linhas e pessoas que faltam para este objetivo." : "Revê a atualização do patamar com este TP: os pontos necessários já estão registados."}</p>
    {c.estado !== "ACTIVE" && <p className={s.nota}>Conta sem estado ativo: confirma primeiro se este TP pretende retomar a atividade.</p>}
  </article>;
}

export function DetalheJornadaNovaArea({email}: {email: string}) {
  const [dados, setDados] = useState<DetalheJornada | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [limite, setLimite] = useState(12);
  const [caminhoId, setCaminhoId] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus({preventScroll: true});
    titulo.current?.scrollIntoView({block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let ocupado = false;
    async function carregar() {
      if (ocupado || document.visibilityState === "hidden") return;
      ocupado = true;
      try {
        const r = await fetch("/api/consultor/nova-area/jornada", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, detalhe: true}), signal: controller.signal});
        const corpo = await r.json();
        if (!r.ok || !corpo.detalhe) throw new Error(corpo.erro ?? "Não foi possível carregar os requisitos da tua organização.");
        if (!controller.signal.aborted) {setDados(corpo.detalhe); setErro("");}
      } catch (falha) {if (!controller.signal.aborted) setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");}
      finally {ocupado = false;}
    }
    const aoVoltar = () => {void carregar();};
    void carregar(); const intervalo = setInterval(aoVoltar, 60_000);
    window.addEventListener("focus", aoVoltar); document.addEventListener("visibilitychange", aoVoltar);
    return () => {controller.abort(); clearInterval(intervalo); window.removeEventListener("focus", aoVoltar); document.removeEventListener("visibilitychange", aoVoltar);};
  }, [email, tentativa]);
  const jornada = dados?.jornada, estrutura = jornada?.estrutura;
  const usados = dados?.linhas.filter(l => l.contaPara) ?? [];
  const comparacoes = dados?.comparacoes ?? [];
  const caminho = comparacoes.find(c => c.id === caminhoId) ?? comparacoes[0];
  const plano = caminho?.passos ?? dados?.plano ?? [];
  const planoIds = new Set(plano.map(c => `${c.id}:${c.objetivo}`));
  const alternativas = dados?.proximos.filter(c => !planoIds.has(`${c.id}:${c.objetivo}`)) ?? [];

  return <section className={s.raiz} aria-labelledby="titulo-detalhe-jornada">
    <h2 ref={titulo} tabIndex={-1} id="titulo-detalhe-jornada">O que falta para {jornada?.proximoPatamar ?? "o próximo patamar"}</h2>
    {erro && <p className={s.erro} role="alert">{erro} <button type="button" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button></p>}
    {!dados && !erro && <p role="status">A analisar as linhas da tua organização…</p>}
    {jornada && <>
      <div className={s.resumo}>
        <article><span>Patamar atual</span><strong>{jornada.patamarAtual ?? "Por atualizar"}</strong></article>
        <article><span>Pontos atuais</span><strong>{jornada.pontos === null ? "Por atualizar" : n(jornada.pontos)}</strong></article>
        <article><span>Pontos em falta</span><strong>{jornada.faltam === null ? "—" : n(jornada.faltam)}</strong>{jornada.metaPontos !== null && <small>Meta: {n(jornada.metaPontos)}</small>}</article>
      </div>
      {estrutura ? <>
        <h3>Requisitos da organização para {jornada.proximoPatamar}</h3>
        <div className={s.requisitos}>{estrutura.requisitos.map(r => <article key={r.patamar}>
          <strong>{r.cumpridos} / {r.necessarios}</strong><span>linhas com {r.patamar} ou superior</span>
          <p>{r.faltam === 0 ? "Cumprido" : `${r.faltam === 1 ? "Falta" : "Faltam"} ${r.faltam} ${nomePatamarQuantidade(r.patamar, r.faltam!)} em ${r.faltam === 1 ? "nova linha" : "linhas distintas"}`}</p>
        </article>)}</div>
        <p className={s.nota}>Cada linha direta conta uma única vez. Um TP qualificado pode estar mais abaixo nessa linha. Um patamar superior também cumpre os patamares anteriores.</p>

        {comparacoes.length > 0 && <div className={s.comparacao}>
          <h3>Comparar caminhos</h3>
          <p className={s.introducao}>Até três caminhos com os dados disponíveis: manter a distribuição atual ou trocar as vagas entre linhas. A ordem dá prioridade a cobrir mais vagas, depois a menos requisitos de equipa por cumprir e, por fim, à menor soma de pontos em falta.</p>
          <div className={s.opcoes} role="group" aria-label="Escolher um caminho para comparar">
            {comparacoes.map((c, i) => <button key={c.id} type="button" className={`${s.opcao} ${c.id === caminho?.id ? s.escolhida : ""}`} aria-pressed={c.id === caminho?.id} onClick={() => setCaminhoId(c.id)}>
              <span className={s.etiqueta}>{i === 0 ? "PRIMEIRO NA COMPARAÇÃO" : `CAMINHO ${i + 1}`}</span>
              <strong className={s.tituloOpcao}>{c.titulo}</strong>
              <span className={s.totalOpcao}>{n(c.pontosEmFalta)} <small>pontos em falta nos TPs deste caminho</small></span>
              <span>{c.passos.length} {c.passos.length === 1 ? "pessoa a acompanhar" : "pessoas a acompanhar"} · {c.linhas.length}/{estrutura.linhasNecessarias} vagas com pessoa identificada</span>
              <span>{c.requisitosEmFalta ? `${c.requisitosEmFalta} requisitos de equipa adicionais nos TPs` : "Sem requisitos de equipa adicionais nos TPs"}</span>
              <span className={s.selecionar}>{c.id === caminho?.id ? "Caminho selecionado" : "Ver este caminho →"}</span>
            </button>)}
          </div>
          <p className={s.nota}>A soma compara os pontos que faltam às pessoas indicadas. Não é uma previsão nem substitui os {jornada.faltam === null ? "pontos em falta na tua meta" : `${n(jornada.faltam)} pontos que faltam na tua própria meta`}. Os requisitos de equipa dos candidatos também têm de ser cumpridos. Confirma com cada pessoa a disponibilidade e o interesse em avançar.</p>
          {comparacoes.length === 1 && <p className={s.nota}>Com os dados atuais, só foi identificado este caminho distinto.</p>}
          {caminho && <div aria-live="polite" aria-atomic="true" className={s.explicacao}>
            <strong>{caminho.titulo}</strong>
            {caminho.linhas.filter(l => l.contavaPara && l.contavaPara !== l.contaPara).map(l => <p key={l.id}>A linha de <strong>{l.nome}</strong> passa da vaga de {l.contavaPara} para a de <strong>{l.contaPara}</strong>. As restantes vagas são redistribuídas entre as outras linhas deste caminho.</p>)}
            {!caminho.linhas.some(l => l.contavaPara && l.contavaPara !== l.contaPara) && <p>As vagas que já contam mantêm-se. O acompanhamento indicado procura completar as restantes linhas.</p>}
            {caminho.vagasSemCandidato > 0 && <p>Ainda {caminho.vagasSemCandidato === 1 ? "falta identificar uma pessoa para 1 vaga" : `faltam identificar pessoas para ${caminho.vagasSemCandidato} vagas`}. Este caminho está incompleto; os pontos apresentados não incluem essas vagas.</p>}
            <details className={s.distribuicao}><summary>Ver como ficariam as linhas ({caminho.linhas.length}/{estrutura.linhasNecessarias})</summary>
              <div className={s.tabela}><table><caption>Distribuição prevista se os objetivos deste caminho forem atingidos</caption><thead><tr><th>Linha direta</th><th>Pessoa que conta</th><th>Vaga</th><th>Situação</th></tr></thead><tbody>{caminho.linhas.map(l => <tr key={l.id}><td>{l.nome}</td><td>{l.representante?.nome}</td><td>{l.contaPara}</td><td>{l.aDesenvolver ? "Por atingir" : "Já qualificada"}</td></tr>)}</tbody></table></div>
            </details>
          </div>}
        </div>}
        {plano.length > 0 && <><h3>Quem acompanhar neste caminho</h3><p className={s.introducao}>Uma pessoa por linha, com o motivo da escolha e o que ainda falta para o objetivo. As promoções são possibilidades de desenvolvimento; os patamares registados mantêm-se.</p><div className={s.candidatos}>{plano.map(c => <CartaoCandidato key={`${c.id}:${c.objetivo}`} candidato={c} contavaPara={dados!.linhas.find(l => l.id === c.linhaId)?.contaPara} />)}</div></>}
        {dados!.linhasPorCriar > 0 && <p className={s.aviso}>Precisas de desenvolver mais {dados!.linhasPorCriar} {dados!.linhasPorCriar === 1 ? "linha direta" : "linhas diretas"} para ter as {estrutura.linhasNecessarias} linhas distintas exigidas.</p>}
        {estrutura.faltamLinhas! > 0 && plano.length === 0 && dados!.linhasPorCriar === 0 && <p className={s.aviso}>Ainda não há candidatos com patamar e pontos conhecidos nas linhas necessárias para sugerir um acompanhamento. Revê os dados da equipa e as linhas que podes desenvolver.</p>}
        {estrutura.faltamLinhas === 0 && <p className={s.sucesso}>Os requisitos de linhas estão cumpridos nos dados atuais.</p>}

        {usados.length > 0 && <details className={s.linhas}><summary>Linhas que já contam · {usados.length}</summary><ul>{usados.map(l => <li key={l.id}><strong>Linha de {l.nome}</strong><span>{l.representante!.nome} · {l.representante!.patamar}</span><small>Conta para: {l.contaPara}</small></li>)}</ul></details>}
        {alternativas.length > 0 && <><h3>Outras pessoas próximas do objetivo</h3><p className={s.introducao}>Alternativas com até 15% do intervalo de pontos em falta, ou até 3 pontos para Master. Podem exigir outra distribuição de vagas. Pessoas da mesma linha são alternativas; não contam como linhas diferentes.</p><div className={s.candidatos}>{alternativas.slice(0, limite).map(c => <CartaoCandidato key={`${c.id}:${c.objetivo}`} candidato={c} contavaPara={dados!.linhas.find(l => l.id === c.linhaId)?.contaPara} />)}</div>{alternativas.length > limite && <button type="button" className={s.mais} onClick={() => setLimite(l => l + 12)}>Mostrar mais pessoas ({alternativas.length - limite})</button>}</>}
        {(dados!.semPatamar > 0 || dados!.semPontos > 0) && <p className={s.nota}>Há registos por completar: {dados!.semPatamar} sem patamar reconhecido e {dados!.semPontos} sem pontos. Não são inferidas qualificações a partir de dados em falta.</p>}
      </> : <p className={s.aviso}>{jornada.proximoPatamar ? "Este próximo patamar não tem novos requisitos de linhas. Acompanha a tua meta de pontos na barra e nos Mapas." : jornada.estado === "ultimo-patamar" ? "Já estás no último patamar desta escada." : "Atualiza o patamar e os pontos da tua conta para veres o objetivo seguinte."}</p>}
      <p className={s.fonte}>Análise da tua organização atual, com os patamares registados na equipa{(estrutura?.atualizadoEm ?? jornada.atualizadoEm) && <> · Dados de {new Date((estrutura?.atualizadoEm ?? jornada.atualizadoEm)!).toLocaleDateString("pt-PT", {timeZone: "Europe/Lisbon"})}</>}. <a href={FONTE_CRITERIOS_PATAMARES} target="_blank" rel="noopener noreferrer">Consultar os critérios do plano</a>.</p>
    </>}
  </section>;
}
