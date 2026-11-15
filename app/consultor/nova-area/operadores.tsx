"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { ResultadoOperador, ResultadoPesquisa } from "@/lib/operadores-destinos";
import s from "./operadores.module.css";

const API = "/api/consultor/nova-area/operadores";
const ATALHOS = ["Punta Cana", "Cabo Verde", "Maiorca", "Egito", "Brasil", "Fim de Ano"];
const LINHAS_VISIVEIS = 8;

interface Inicio {
  sugestoes: string[];
  operadores: Pick<ResultadoOperador, "id" | "nome" | "motor" | "sinal" | "atualizado" | "faq" | "resumo">[];
  regras: string[];
  revistoEm: string;
  centroAjuda: string;
}

async function pedir<T>(corpo: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo), signal });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof c.erro === "string" ? c.erro : "Não foi possível concluir o pedido. Tenta novamente.");
  return c as T;
}

function Modo({ motor }: { motor: boolean }) {
  return motor
    ? <span className={s.modo} data-motor="true">No motor do MyOffice</span>
    : <span className={s.modo}>Só reserva manual</span>;
}

function CartaoOperador({ o }: { o: ResultadoOperador }) {
  const [todas, setTodas] = useState(false);
  const visiveis = todas ? o.linhas : o.linhas.slice(0, LINHAS_VISIVEIS);
  const blocos = [...new Set(visiveis.map(l => l.bloco ?? ""))];
  return <article id={`operador-${o.id}`} className={s.operador} data-tipo={o.tipo}>
    <header className={s.topoOperador}>
      <div>
        <h3>{o.nome}</h3>
        <p>{o.tipo === "motor" ? "Disponibilidade a confirmar no motor iCliGo." : o.resumo}</p>
      </div>
      <Modo motor={o.motor} />
    </header>
    {o.tipo === "todo-o-site"
      ? <p className={s.todoSite}>Todo o produto do site da {o.nome} é autorizado. <strong>Confirma no site se tem este destino</strong> e reserva pelo formulário manual.</p>
      : o.tipo === "motor" ? <>
        <p className={s.dica}><strong>Pesquisa este destino no motor de operadores da iCliGo.</strong> Podes reservar os pacotes que aparecerem nos resultados, já validados com voos charter ou especiais.</p>
        <p className={s.nota}>Para uma reserva manual, confirma que o pacote cumpre as condições da FAQ. Se não aparecer no motor, confirma também com o Departamento de Reservas antes de submeter o formulário.</p>
      </> : <>
        {o.motor && <p className={s.dica}>Pesquisa primeiro no motor de operadores: tudo o que aparece nos resultados pode ser reservado. Se não aparecer, usa o formulário manual com esta programação.</p>}
        {blocos.map(bloco => <div key={bloco} className={s.bloco}>
          {bloco && <h4>{bloco}</h4>}
          <ul className={s.linhas}>
            {visiveis.filter(l => (l.bloco ?? "") === bloco).map((l, i) => <li key={i}>
              <strong>{l.nomeDestino}</strong>
              {(l.origem || l.companhia || l.dias || l.periodo) && <span className={s.factos}>
                {l.origem && <span>✈ {l.origem}</span>}
                {l.companhia && <span>{l.companhia}</span>}
                {l.dias && <span>{l.dias}</span>}
                {l.periodo && <span className={s.periodo}>{l.periodo}</span>}
              </span>}
              {l.detalhe && <span className={s.detalhe}>{l.detalhe}</span>}
            </li>)}
          </ul>
        </div>)}
        {o.linhas.length > LINHAS_VISIVEIS && <button type="button" className={s.botaoTexto} onClick={() => setTodas(v => !v)} aria-expanded={todas}>
          {todas ? "Mostrar menos" : `Ver as ${o.linhas.length} opções`}
        </button>}
      </>}
    {!!o.avisos.length && <ul className={s.avisos}>{o.avisos.map(a => <li key={a}>{a}</li>)}</ul>}
    <details className={s.regrasOperador}>
      <summary>Regras da {o.nome}</summary>
      <div className={s.colunas}>
        <div><h5>Podes reservar</h5><ul>{o.permitido.map(p => <li key={p}>{p}</li>)}</ul></div>
        {!!o.proibido.length && <div><h5>{o.motor ? "Restrições no formulário manual" : "Não é permitido"}</h5><ul data-proibido="true">{o.proibido.map(p => <li key={p}>{p}</li>)}</ul></div>}
      </div>
    </details>
    <footer className={s.rodapeOperador}>
      <span>Sinal: <strong>{o.sinal}</strong></span>
      {o.atualizado !== "—" && <span>FAQ atualizada a {o.atualizado}</span>}
      <a href={o.faq} target="_blank" rel="noreferrer">Abrir FAQ ↗</a>
    </footer>
  </article>;
}

export function OperadoresNovaArea({ email }: { email: string }) {
  const listaId = useId();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [erroInicio, setErroInicio] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [termo, setTermo] = useState("");
  const [destino, setDestino] = useState("");
  const [resultado, setResultado] = useState<ResultadoPesquisa | null>(null);
  const [aProcurar, setAProcurar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setErroInicio("");
    pedir<Inicio>({ email, acao: "inicio" }, controller.signal).then(setInicio).catch(e => {
      if (!controller.signal.aborted) setErroInicio(e instanceof Error ? e.message : "Não foi possível carregar.");
    });
    return () => controller.abort();
  }, [email, tentativa]);

  async function pesquisar(texto: string, filtro = "") {
    const limpo = texto.trim();
    if (limpo.length < 2) { setErro("Escreve pelo menos 2 letras do destino."); return; }
    setTermo(limpo); setDestino(filtro); setAProcurar(true); setErro("");
    try {
      // Sem filtro pedimos a lista completa, para manter os destinos encontrados como opções.
      const [completo, filtrado] = await Promise.all([
        pedir<ResultadoPesquisa>({ email, acao: "pesquisar", termo: limpo }),
        filtro ? pedir<ResultadoPesquisa>({ email, acao: "pesquisar", termo: limpo, destino: filtro }) : null,
      ]);
      setResultado({ ...(filtrado ?? completo), destinos: completo.destinos });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível pesquisar.");
    } finally { setAProcurar(false); }
  }

  function submeter(e: FormEvent) { e.preventDefault(); void pesquisar(termo); }

  const comProgramacao = resultado?.operadores.filter(o => o.tipo === "programacao") ?? [];
  const noMotor = resultado?.operadores.filter(o => o.tipo === "motor") ?? [];
  const todoOSite = resultado?.operadores.filter(o => o.tipo === "todo-o-site") ?? [];
  const opcoesReserva = [...comProgramacao, ...noMotor];

  return <section className={s.raiz} aria-label="Onde posso vender">
    <header className={s.intro}>
      <span className={s.etiqueta}>RESERVAS</span>
      <h1>Onde posso vender<span>?</span></h1>
      <p>Pesquisa um destino e consulta as opções no motor iCliGo e a programação autorizada para reserva manual, segundo as FAQs da iCliGo.</p>
    </header>

    <form className={s.pesquisa} onSubmit={submeter} role="search">
      <label htmlFor={`${listaId}-campo`} className={s.rotulo}>Destino, país, ilha ou código do aeroporto</label>
      <div className={s.campoLinha}>
        <input id={`${listaId}-campo`} list={`${listaId}-sugestoes`} value={termo} onChange={e => setTermo(e.target.value)}
          placeholder="Ex.: Punta Cana, Cabo Verde, Maiorca, PUJ…" autoComplete="off" maxLength={80} />
        <button type="submit" className={s.primario} disabled={aProcurar}>{aProcurar ? "A pesquisar…" : "Pesquisar"}</button>
      </div>
      <datalist id={`${listaId}-sugestoes`}>{inicio?.sugestoes.map(x => <option key={x} value={x} />)}</datalist>
      <div className={s.atalhos} aria-label="Pesquisas rápidas">
        {ATALHOS.map(a => <button type="button" key={a} onClick={() => void pesquisar(a)}>{a}</button>)}
      </div>
    </form>

    {erro && <p role="alert" className={s.erro}>{erro}</p>}

    {resultado && !aProcurar && <div className={s.resultados} aria-live="polite">
      {resultado.destinos.length > 1 && <div className={s.filtros} role="group" aria-label="Filtrar por destino">
        <button type="button" aria-pressed={!destino} onClick={() => void pesquisar(resultado.consulta)}>Todos ({resultado.destinos.length})</button>
        {resultado.destinos.map(d => <button type="button" key={d.id} aria-pressed={destino === d.id} onClick={() => void pesquisar(resultado.consulta, d.id)}>{d.nome}</button>)}
      </div>}

      {!resultado.destinos.length ? <div className={s.vazio}>
        <h2>Não encontrámos “{resultado.consulta}” nas FAQs dos operadores</h2>
        <p>Experimenta o nome do país, da ilha ou o código do aeroporto. Se o destino não estiver numa programação autorizada, podes vendê-lo como pacote dinâmico nos motores da plataforma iCliGo (Voo + Hotel, Multidestino…) ou confirmar com o Departamento de Reservas.</p>
      </div> : <>
        <h2 className={s.tituloResultados}>
          Opções de reserva para <strong>{destino ? resultado.destinos.find(d => d.id === destino)?.nome : resultado.consulta}</strong>
        </h2>
        {!comProgramacao.length && <p className={s.nota}>Sem programação manual detalhada para este destino nesta pesquisa.{noMotor.length ? " Pesquisa nos operadores integrados abaixo: podes reservar os pacotes que aparecerem no motor iCliGo." : " Podes pesquisar nos motores Voo + Hotel e Multidestino da iCliGo ou confirmar com o Departamento de Reservas."}{todoOSite.length ? " Confirma também nos operadores onde todo o produto do site é autorizado." : ""}</p>}
        {opcoesReserva.length > 1 && <ul className={s.resumo} aria-label="Resumo por operador">
          {opcoesReserva.map(o => <li key={o.id}><a href={`#operador-${o.id}`}>
            <strong>{o.nome}</strong>
            <span>{o.tipo === "motor" ? "Pesquisar no motor iCliGo" : `${o.linhas.length} ${o.linhas.length === 1 ? "opção" : "opções"} · ${o.motor ? "motor e manual" : "manual"}`}</span>
          </a></li>)}
        </ul>}
        <div className={s.grelha}>{comProgramacao.map(o => <CartaoOperador key={o.id} o={o} />)}</div>
        {!!noMotor.length && <>
          <h3 className={s.subtitulo}>Pesquisar também no motor iCliGo</h3>
          <p className={s.nota}>A integração permite reservar os pacotes apresentados no motor. Confirma aí a disponibilidade para o destino e as datas pretendidas.</p>
          <div className={s.grelha}>{noMotor.map(o => <CartaoOperador key={o.id} o={o} />)}</div>
        </>}
        {!!todoOSite.length && <>
          <h3 className={s.subtitulo}>Também podes confirmar</h3>
          <div className={s.grelha}>{todoOSite.map(o => <CartaoOperador key={o.id} o={o} />)}</div>
        </>}
      </>}
    </div>}

    {!resultado && inicio && <div className={s.operadores}>
      <h2 className={s.subtitulo}>Operadores com regras nas FAQs</h2>
      <ul>
        {inicio.operadores.map(o => <li key={o.id}>
          <div><strong>{o.nome}</strong><span>{o.resumo}</span></div>
          <Modo motor={o.motor} />
        </li>)}
      </ul>
    </div>}
    {erroInicio && <div className={s.erro} role="alert"><p>{erroInicio}</p><button type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div>}

    {inicio && <details className={s.regras}>
      <summary>Regras gerais para reservas com operadores</summary>
      <ul>{inicio.regras.map(r => <li key={r}>{r}</li>)}</ul>
    </details>}

    {inicio && <p className={s.fonte}>
      Fonte: FAQs do Centro de Ajuda iCliGo, revistas a {inicio.revistoEm}. As programações mudam — confirma sempre a FAQ do operador antes de reservar. <a href={inicio.centroAjuda} target="_blank" rel="noreferrer">Centro de Ajuda ↗</a>
    </p>}
  </section>;
}
