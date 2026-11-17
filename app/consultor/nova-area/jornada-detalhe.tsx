"use client";

import { useEffect, useRef, useState } from "react";
import type { CandidatoJornada, DetalheJornada } from "@/lib/consultor-jornada-equipa";
import type { CaminhoJornada } from "@/lib/consultor-jornada-comparacoes";
import { FONTE_CRITERIOS_PATAMARES, nomePatamarQuantidade } from "@/lib/patamares-carreira";
import s from "./jornada-detalhe.module.css";

const n = (valor: number) => valor.toLocaleString("pt-PT", {maximumFractionDigits: 2});
const faltaApoio = (c: CandidatoJornada) => c.criteriosEmFalta.map(r => `${r.quantidade} ${nomePatamarQuantidade(r.patamar, r.quantidade)} em linhas distintas`).join(" e ");

function OpcaoCaminho({caminho: c, indice, selecionada, escolher}: {caminho: CaminhoJornada; indice: number; selecionada: boolean; escolher: () => void}) {
  return <button type="button" className={`${s.opcao} ${selecionada ? s.escolhida : ""}`} aria-pressed={selecionada} aria-controls="plano-jornada" onClick={escolher}>
    <span className={s.etiqueta}>OPÇÃO {indice + 1}{indice === 0 ? " · SUGESTÃO INICIAL" : " · ALTERNATIVA"}</span>
    <strong className={s.tituloOpcao}>{c.id === "manter" ? "Manter as linhas que já contam" : c.id === "reorganizar" ? "Ajustar quem conta em cada linha" : "Acompanhar outras pessoas"}</strong>
    <span>{c.passos.length ? `Apoiar ${c.passos.length} ${c.passos.length === 1 ? "pessoa a chegar ao patamar indicado:" : "pessoas a chegar aos patamares indicados:"}` : "As pessoas identificadas já têm os patamares necessários."}</span>
    <span className={s.pessoasOpcao}>{c.passos.slice(0, 3).map(p => <span key={`${p.id}:${p.objetivo}`}><strong>{p.nome}</strong><span>{p.patamarAtual} → {p.objetivo} · {p.faltamPontos > 0 ? `faltam ${n(p.faltamPontos)} pontos` : "pontos já atingidos"}</span></span>)}</span>
    {c.passos.length > 3 && <span>+ {c.passos.length - 3} {c.passos.length - 3 === 1 ? "pessoa" : "pessoas"} na lista completa desta opção.</span>}
    {c.requisitosEmFalta > 0 && <span>Também é preciso desenvolver as equipas destas pessoas. Vê o que falta abaixo.</span>}
    {c.vagasSemCandidato > 0 && <span className={s.incompleta}>Por completar: falta identificar quem pode contar em {c.vagasSemCandidato} {c.vagasSemCandidato === 1 ? "linha" : "linhas"}.</span>}
    <span className={s.selecionar}>{selecionada ? "✓ Estás a ver esta opção" : "Ver o que fazer nesta opção →"}</span>
  </button>;
}

function CartaoCandidato({candidato: c, contavaPara}: {candidato: CandidatoJornada; contavaPara?: string | null}) {
  return <article className={s.candidato}>
    <span className={s.etiqueta}>LINHA DE {c.linhaNome}</span>
    <h3>{c.nome}</h3>
    <p className={s.motivo}>{contavaPara ? <>A linha de {c.linhaNome} já conta como <strong>{contavaPara}</strong>. Nesta opção, o objetivo é que {c.nome} chegue a <strong>{c.objetivo}</strong> e a linha passe a contar para esse patamar.</> : <>Quando {c.nome} atingir <strong>{c.objetivo}</strong>, a linha de {c.linhaNome} pode ajudar a cumprir esse requisito da tua equipa.</>}</p>
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
  const explicacao = useRef<HTMLDivElement>(null);
  useEffect(() => {
    titulo.current?.focus({preventScroll: true});
    titulo.current?.scrollIntoView({block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }, []);
  useEffect(() => {
    if (caminhoId === null) return;
    explicacao.current?.focus({preventScroll: true});
    explicacao.current?.scrollIntoView({block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }, [caminhoId]);
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
  const numeroOpcao = caminho ? comparacoes.indexOf(caminho) + 1 : 1;
  const linhasMantidas = caminho?.linhas.filter(l => !l.aDesenvolver && l.contavaPara === l.contaPara) ?? [];
  const linhasSubstituidas = usados.filter(l => !caminho?.linhas.some(prevista => prevista.id === l.id));
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
        <p className={s.nota}>Uma linha é um TP direto teu e toda a equipa abaixo dele. Cada linha só conta uma vez, mesmo que tenha várias pessoas qualificadas. Um patamar superior também cumpre os anteriores.</p>

        {comparacoes.length > 0 && <div className={s.comparacao}>
          <h3>Por onde começar</h3>
          <p className={s.introducao}>{comparacoes.length > 1 ? <>Há várias formas de completar a tua equipa. <strong>São alternativas para o mesmo objetivo: basta seguir uma.</strong> Começa por esta sugestão ou vê outras pessoas que podes acompanhar.</> : "Esta é a sugestão que foi possível identificar com os dados atuais da tua equipa."}</p>
          <OpcaoCaminho caminho={comparacoes[0]!} indice={0} selecionada={caminho?.id === comparacoes[0]!.id} escolher={() => setCaminhoId(comparacoes[0]!.id)} />
          {comparacoes.length > 1 && <details className={s.outrasOpcoes}>
            <summary>Ver {comparacoes.length - 1 === 1 ? "outra opção" : `outras ${comparacoes.length - 1} opções`}{numeroOpcao > 1 ? ` · estás a ver a opção ${numeroOpcao}` : ""}</summary>
            <p className={s.introducao}>Podes chegar ao mesmo objetivo apoiando outras pessoas ou mudando o patamar para o qual cada linha conta. Escolhe uma opção para veres a respetiva lista de ações abaixo.</p>
            <div className={s.opcoes}>{comparacoes.slice(1).map((c, i) => <OpcaoCaminho key={c.id} caminho={c} indice={i + 1} selecionada={c.id === caminho?.id} escolher={() => setCaminhoId(c.id)} />)}</div>
          </details>}
          {caminho && <div ref={explicacao} tabIndex={-1} aria-live="polite" aria-atomic="true" className={s.explicacao}>
            <strong>O que muda na opção {numeroOpcao}</strong>
            {linhasMantidas.length > 0 && <p>Manténs {linhasMantidas.length} {linhasMantidas.length === 1 ? "linha que já conta" : "linhas que já contam"} para o teu objetivo.</p>}
            {caminho.linhas.filter(l => l.contavaPara && l.contavaPara !== l.contaPara).map(l => <p key={l.id}>A linha de <strong>{l.nome}</strong> conta hoje como {l.contavaPara}. Nesta opção, passaria a contar como <strong>{l.contaPara}</strong>{l.aDesenvolver ? <>, quando <strong>{l.representante?.nome}</strong> atingir esse patamar</> : ", usando uma pessoa que já tem esse patamar"}. O requisito de {l.contavaPara} terá de ser assegurado noutra linha.</p>)}
            {linhasSubstituidas.map(l => <p key={l.id}>Nesta opção, deixas de usar a linha de <strong>{l.nome}</strong> para cumprir {l.contaPara} e procuras completar esse requisito noutra linha.</p>)}
            {caminho.passos.length > 0 && <p>A seguir, vê o que falta a cada pessoa na lista de acompanhamento.</p>}
            {caminho.vagasSemCandidato > 0 && <p><strong>Esta opção ainda está incompleta:</strong> falta identificar quem pode contar em {caminho.vagasSemCandidato} {caminho.vagasSemCandidato === 1 ? "linha" : "linhas"}. Os pontos dessas pessoas ainda não podem ser calculados.</p>}
            <details className={s.distribuicao}><summary>Ver a equipa completa nesta opção ({caminho.linhas.length}/{estrutura.linhasNecessarias} linhas)</summary>
              <div className={s.tabela}><table><caption>Como a tua equipa ficaria se todos os objetivos desta opção fossem cumpridos</caption><thead><tr><th>Linha direta</th><th>Pessoa que conta</th><th>Patamar necessário</th><th>Situação</th></tr></thead><tbody>{caminho.linhas.map(l => <tr key={l.id}><td>{l.nome}</td><td>{l.representante?.nome}</td><td>{l.contaPara}</td><td>{l.aDesenvolver ? "Ainda por atingir" : "Já tem o patamar"}</td></tr>)}</tbody></table></div>
            </details>
          </div>}
          <details className={s.criteriosComparacao}><summary>Porque aparece esta sugestão primeiro?</summary><p>Primeiro procuramos uma pessoa para cada linha necessária. Entre as opções encontradas, damos prioridade às que têm menos requisitos de equipa por cumprir e, depois, menos pontos em falta nas pessoas a acompanhar.</p><p>Na opção {numeroOpcao}, faltam {n(caminho!.pontosEmFalta)} pontos no conjunto das pessoas indicadas. {jornada.faltam === null ? "A tua meta de pontos aparece no topo da página." : `Para a tua própria meta, faltam ${n(jornada.faltam)} pontos, apresentados no topo da página.`} Estes totais têm funções diferentes. Linhas sem pessoa identificada ficam fora desta soma.</p></details>
          <p className={s.nota}>Escolher uma opção só muda a lista que estás a ver. Combina com cada pessoa se quer avançar; as sugestões não preveem a sua atividade nem confirmam promoções.</p>
        </div>}
        <div id="plano-jornada">{plano.length > 0 && <><h3>Quem acompanhar · opção {numeroOpcao}</h3><p className={s.introducao}>Para cada pessoa, vê o patamar a atingir, os pontos em falta e o que precisa de desenvolver na sua própria equipa. Estes objetivos são dessa pessoa; a tua meta de pontos está no topo da página.</p><ol className={s.candidatos}>{plano.map((c, i) => <li key={`${c.id}:${c.objetivo}`}><span className={s.passo}>PESSOA {i + 1} DE {plano.length}</span><CartaoCandidato candidato={c} contavaPara={dados!.linhas.find(l => l.id === c.linhaId)?.contaPara} /></li>)}</ol></>}</div>
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
