"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  euros, juntarLeituras, MAX_OPCOES_PROPOSTA, opcaoVazia, pendentesProposta,
  type LeituraPDF, type OpcaoProposta, type Proposta, type ResumoProposta,
} from "@/lib/proposta";
import { dataPlanner, ESTILOS_PLANNER, MARCA_PADRAO, vooVazio, type FotoPlanner, type MarcaPlanner, type VooPlanner } from "@/lib/travel-planner";
import { Campo, comprimirFoto, EditorCores, EnquadrarFoto, Miniatura } from "./travel-planner";
import css from "./travel-planner.module.css";

const API = "/api/consultor/nova-area/proposta";
type Passo = "pdfs" | "conteudo" | "entregar";
const PASSOS: [Passo, string][] = [["pdfs", "1. PDFs e opções"], ["conteudo", "2. Conteúdo"], ["entregar", "3. Entregar"]];
const LETRAS = ["A", "B", "C"];
/** Onde vai a fotografia: capa, hotel de uma opção ou um destaque. */
type AlvoFoto = "capa" | `hotel-${number}` | `destaque-${number}`;
interface Foto { titulo: string; url: string; credito: string }

const hoje = () => new Date().toISOString().slice(0, 10);
const linhasDe = (texto: string) => texto.split("\n").map(l => l.trim()).filter(Boolean);

export function PropostaNovaArea({email, abrirPlanner}: {email: string; abrirPlanner: () => void}) {
  const [lista, setLista] = useState<ResumoProposta[] | null>(null);
  const [ia, setIa] = useState(false);
  const [marca, setMarca] = useState<MarcaPlanner>(MARCA_PADRAO);
  const [telemovel, setTelemovel] = useState("");
  const [editarCores, setEditarCores] = useState(false);
  const [p, setP] = useState<Proposta | null>(null);
  const [passo, setPasso] = useState<Passo>("pdfs");
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [avisosPDF, setAvisosPDF] = useState<string[]>([]);
  const [fotos, setFotos] = useState<{alvo: AlvoFoto; lista: Foto[]} | null>(null);
  const [enquadrar, setEnquadrar] = useState<AlvoFoto | null>(null);
  const [ponto, setPonto] = useState<{opcao: number; termo: string; resultados: {nome: string; lat: number; lng: number}[] | null} | null>(null);
  const [previa, setPrevia] = useState<{paginas: string[]; assinatura: string} | null>(null);
  const [aGerarPrevia, setAGerarPrevia] = useState(false);
  const [erroPrevia, setErroPrevia] = useState("");
  const [paginaAberta, setPaginaAberta] = useState<number | null>(null);
  const [opcaoPlanner, setOpcaoPlanner] = useState(0);

  async function pedir<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
    const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao, ...extra})});
    const c = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(c.erro ?? "Não foi possível concluir o pedido.");
    return c as T;
  }
  async function executar(mensagem: string, tarefa: () => Promise<void>) {
    setOcupado(mensagem); setErro(""); setAviso("");
    try { await tarefa(); } catch (e) { setErro(e instanceof Error ? e.message : "Falha de ligação. Tenta novamente."); } finally { setOcupado(""); }
  }
  async function carregarLista() {
    const c = await pedir<{propostas: ResumoProposta[]; ia: boolean; marca: MarcaPlanner; perfil: {telemovel: string}}>("listar");
    setLista(c.propostas); setIa(c.ia); setMarca(c.marca); setTelemovel(c.perfil.telemovel);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void executar("A carregar…", carregarLista); }, []);

  async function guardar(atual = p): Promise<Proposta | null> {
    if (!atual) return null;
    const c = await pedir<{proposta: Proposta}>("guardar", {proposta: atual});
    setP(c.proposta);
    return c.proposta;
  }
  const assinatura = (x: Proposta | null) => JSON.stringify([x && {...x, atualizadoEm: undefined}, marca, telemovel]);
  async function gerarPrevia(atual = p) {
    if (!atual) return;
    setAGerarPrevia(true); setErroPrevia("");
    try {
      const c = await pedir<{paginas: string[]}>("previsualizar", {proposta: atual});
      setPrevia({paginas: c.paginas, assinatura: assinatura(atual)});
    } catch (e) { setErroPrevia(e instanceof Error ? e.message : "Não foi possível criar a pré-visualização."); }
    finally { setAGerarPrevia(false); }
  }
  function irPara(proximo: Passo) {
    void executar("A guardar…", async () => {
      const guardado = await guardar(); setPasso(proximo);
      if (proximo === "entregar" && guardado && previa?.assinatura !== assinatura(guardado)) void gerarPrevia(guardado);
    });
  }

  const alterarViagem = (campo: keyof Proposta["viagem"], valor: string) => setP(a => a && {...a, viagem: {...a.viagem,
    [campo]: campo === "viajantes" ? (valor ? Math.max(1, Math.round(Number(valor))) || null : null) : valor}});
  const alterarOpcao = (i: number, mudanca: Partial<OpcaoProposta>) => setP(a => a && {...a, opcoes: a.opcoes.map((o, j) => j === i ? {...o, ...mudanca} : o)});
  const numeroOuNulo = (v: string) => { const n = Number(v.replace(",", ".")); return v.trim() && Number.isFinite(n) ? n : null; };
  const alterarVoo = (i: number, campo: keyof VooPlanner, valor: string) => setP(a => a && {...a, voos: a.voos.map((v, j) => j === i
    ? {...v, [campo]: campo === "origem" || campo === "destino" ? valor.toUpperCase().slice(0, 4) : valor,
      ...(campo === "origem" ? {origemLat: null, origemLng: null} : campo === "destino" ? {destinoLat: null, destinoLng: null} : {})} : v)});

  // ---------- PDFs ----------
  function importar(e: ChangeEvent<HTMLInputElement>) {
    const ficheiros = Array.from(e.target.files ?? []).slice(0, MAX_OPCOES_PROPOSTA);
    e.target.value = "";
    if (!ficheiros.length || !p) return;
    void executar(`A ler ${ficheiros.length} PDF${ficheiros.length > 1 ? "s" : ""}… pode demorar até um minuto por PDF.`, async () => {
      const leituras: LeituraPDF[] = [], falhas: string[] = [];
      for (const [k, f] of ficheiros.entries()) {
        setOcupado(`A ler ${f.name} (${k + 1} de ${ficheiros.length})…`);
        const form = new FormData(); form.set("email", email); form.set("ficheiro", f);
        const r = await fetch(API, {method: "POST", body: form}), c = await r.json().catch(() => ({}));
        if (r.ok) leituras.push(c.leitura); else falhas.push(`${f.name}: ${c.erro ?? "não foi possível ler"}`);
      }
      if (!leituras.length) throw new Error(falhas.join(" "));
      const j = juntarLeituras(leituras);
      setP({...p, viagem: j.viagem, opcoes: j.opcoes, incluido: j.incluido, naoIncluido: j.naoIncluido, condicoes: j.condicoes || p.condicoes, validade: j.validade, recomendada: null});
      setAvisosPDF([...falhas, ...j.avisos]);
      setAviso(`Juntámos ${leituras.length} PDF${leituras.length > 1 ? "s" : ""} em ${j.opcoes.length} ${j.opcoes.length === 1 ? "opção" : "opções"}. Confirma os dados.`);
    });
  }

  // ---------- fotografias ----------
  const fotoDe = (alvo: AlvoFoto): FotoPlanner | null => {
    if (!p) return null;
    if (alvo === "capa") return p.foto;
    const [tipo, n] = alvo.split("-") as [string, string];
    return tipo === "hotel" ? p.opcoes[Number(n)]?.foto ?? null : p.destaques[Number(n)]?.foto ?? null;
  };
  const definirFoto = (alvo: AlvoFoto, foto: FotoPlanner | null) => setP(a => {
    if (!a) return a;
    if (alvo === "capa") return {...a, foto};
    const [tipo, n] = alvo.split("-") as [string, string];
    return tipo === "hotel" ? {...a, opcoes: a.opcoes.map((o, j) => j === Number(n) ? {...o, foto} : o)} : {...a, destaques: a.destaques.map((d, j) => j === Number(n) ? {...d, foto} : d)};
  });
  function procurar(alvo: AlvoFoto) {
    if (!p) return;
    const [tipo, n] = alvo.split("-") as [string, string];
    const termo = alvo === "capa" ? p.viagem.destino.split(",")[0]! : tipo === "hotel" ? p.opcoes[Number(n)]!.hotel : p.destaques[Number(n)]!.pesquisa || p.destaques[Number(n)]!.titulo;
    void executar("A procurar fotografias…", async () => {
      const c = await pedir<{fotografias: Foto[]}>("fotografias", {termo});
      setFotos({alvo, lista: c.fotografias});
      if (!c.fotografias.length) setAviso("Não encontrámos fotografias livres. Podes carregar uma tua.");
    });
  }
  function siteOficial(i: number) {
    if (!p) return;
    const o = p.opcoes[i]!;
    void executar("A procurar a fotografia do hotel…", async () => {
      const c = await pedir<{foto: FotoPlanner | null}>("foto-hotel", {hotel: o.hotel, zona: o.zona, destino: p.viagem.destino.split(",")[0]});
      if (c.foto) definirFoto(`hotel-${i}`, c.foto); else setAviso("Não encontrámos uma fotografia deste hotel. Carrega uma tua ou procura nas livres.");
    });
  }
  function carregar(alvo: AlvoFoto, e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void executar("A preparar a fotografia…", async () => definirFoto(alvo, {url: await comprimirFoto(f), credito: ""}));
  }
  function linhaFoto(alvo: AlvoFoto, titulo: string, extra?: React.ReactNode) {
    const foto = fotoDe(alvo);
    return <div className={css.linhaFoto} key={alvo}>
      <Miniatura foto={foto} legenda={titulo} />
      <div><strong>{titulo}</strong>{foto?.credito && <small>{foto.credito}</small>}</div>
      <div className={css.acoes}>
        {extra}
        <button type="button" onClick={() => procurar(alvo)}>Fotos livres</button>
        <label className={css.botaoFicheiro}>Carregar minha<input type="file" accept="image/*" onChange={e => carregar(alvo, e)} /></label>
        {foto && <button type="button" aria-expanded={enquadrar === alvo} onClick={() => setEnquadrar(enquadrar === alvo ? null : alvo)}>Enquadrar</button>}
        {foto && <button type="button" className={css.remover} onClick={() => definirFoto(alvo, null)}>Retirar</button>}
      </div>
      {enquadrar === alvo && foto && <EnquadrarFoto foto={foto} alterar={f => definirFoto(alvo, f)} />}
      {fotos?.alvo === alvo && !!fotos.lista.length && <div className={css.fotos}>{fotos.lista.map(f => <button type="button" key={f.url} className={foto?.url === f.url ? css.fotoAtiva : css.foto}
        onClick={() => { definirFoto(alvo, {url: f.url, credito: f.credito}); setFotos(null); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.url} alt={f.titulo} loading="lazy" /></button>)}</div>}
    </div>;
  }

  function descarregarPDF() {
    if (!p) return;
    void executar("A criar o PDF… pode demorar até um minuto.", async () => {
      const guardado = await guardar();
      const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "pdf", id: guardado!.id})});
      if (!r.ok) { const c = await r.json().catch(() => ({})); throw new Error(c.erro ?? "Não foi possível criar o PDF."); }
      const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "proposta.pdf";
      const url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
      a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      setAviso("PDF descarregado. Já o podes enviar ao cliente.");
    });
  }

  const editorCores = editarCores && <EditorCores marca={marca} ocupado={!!ocupado} aoFechar={() => setEditarCores(false)}
    aoGuardar={m => void executar("A guardar as cores…", async () => {
      const r = await fetch("/api/consultor/nova-area/travel-planner", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "guardar-marca", marca: m})});
      const c = await r.json(); if (!r.ok) throw new Error(c.erro); setMarca(c.marca); setEditarCores(false); setAviso("Cores guardadas.");
    })} />;
  const botaoCores = <button type="button" className={css.botaoCores} onClick={() => setEditarCores(!editarCores)}>
    <span>{[marca.principal, marca.destaque, marca.escura].map(cor => <i key={cor} style={{background: cor}} />)}</span>As minhas cores</button>;

  // ---------- lista ----------
  if (!p) {
    return <section className={css.planner}>
      <div className={css.cabecalho}>
        <div><h2>Propostas de orçamento</h2><p>Junta até 3 PDFs da iCliGo da mesma viagem (com hotéis diferentes) numa proposta bonita, com as opções lado a lado, o que está incluído e o QR para o teu WhatsApp.</p></div>
        <button type="button" className={css.primario} disabled={!!ocupado} onClick={() => void executar("A preparar…", async () => { const c = await pedir<{proposta: Proposta}>("novo"); setP(c.proposta); setPasso("pdfs"); setPrevia(null); setAvisosPDF([]); })}>Nova proposta</button>
      </div>
      <div className={css.barraCores}>{botaoCores}</div>
      {erro && <p className={css.erro} role="alert">{erro}</p>}
      {aviso && <p className={css.sucesso} role="status">{aviso}</p>}
      {ocupado && <p className={css.estado} role="status">{ocupado}</p>}
      {editorCores}
      {lista && !lista.length && <div className={css.vazio}><strong>Ainda não criaste nenhuma proposta.</strong><p>Começa com os PDFs da iCliGo de cada hotel.</p></div>}
      {!!lista?.length && <div className={css.lista}>{lista.map(item => <article key={item.id}>
        <div><h3>{item.nome}</h3><p>{[item.destino, item.ida && dataPlanner(item.ida), `${item.opcoes} ${item.opcoes === 1 ? "opção" : "opções"}`].filter(Boolean).join(" · ")} · editada {new Date(item.atualizadoEm).toLocaleDateString("pt-PT")}</p></div>
        <div className={css.acoes}>
          <button type="button" className={css.primario} disabled={!!ocupado} onClick={() => void executar("A abrir…", async () => { const c = await pedir<{proposta: Proposta}>("abrir", {id: item.id}); setP(c.proposta); setPasso(c.proposta.dicas.length ? "entregar" : "pdfs"); setPrevia(null); setAvisosPDF([]); if (c.proposta.dicas.length) void gerarPrevia(c.proposta); })}>Abrir</button>
          <button type="button" className={css.remover} disabled={!!ocupado} onClick={() => { if (window.confirm(`Apagar “${item.nome}”?`)) void executar("A apagar…", async () => { await pedir("apagar", {id: item.id}); await carregarLista(); }); }}>Apagar</button>
        </div>
      </article>)}</div>}
    </section>;
  }

  const pendentes = pendentesProposta(p);
  const validadePassada = p.validade && p.validade < hoje();

  return <section className={css.planner}>
    <div className={css.cabecalho}>
      <div><h2>{p.nome || (p.viagem.destino ? `Proposta ${p.viagem.destino}` : "Nova proposta")}</h2><p>As alterações são guardadas quando mudas de passo.</p></div>
      <button type="button" disabled={!!ocupado} onClick={() => void executar("A guardar…", async () => { await guardar(); setP(null); await carregarLista(); })}>Guardar e voltar à lista</button>
    </div>
    <nav className={css.passos} aria-label="Passos da proposta">{PASSOS.map(([id, titulo]) =>
      <button key={id} type="button" aria-current={passo === id ? "step" : undefined} className={passo === id ? css.passoAtivo : css.passo} disabled={!!ocupado} onClick={() => irPara(id)}>{titulo}</button>)}</nav>
    {erro && <p className={css.erro} role="alert">{erro}</p>}
    {aviso && <p className={css.sucesso} role="status">{aviso}</p>}
    {ocupado && <p className={css.estado} role="status">{ocupado}</p>}

    <fieldset className={css.painel} disabled={!!ocupado}>
      {passo === "pdfs" && <>
        <h3>PDFs da iCliGo</h3>
        <div className={css.origem}>
          <label className={css.ficheiro}>Escolher até 3 PDFs<input type="file" accept="application/pdf" multiple onChange={importar} /></label>
          <span>Um PDF por hotel, da mesma viagem. Também podes preencher tudo à mão.</span>
        </div>
        {avisosPDF.map(a => <p key={a} className={css.ajuda}>⚠️ {a}</p>)}

        <h3>A viagem</h3>
        <div className={css.grelha}>
          <Campo titulo="Destino" valor={p.viagem.destino} alterar={v => alterarViagem("destino", v)} />
          <Campo titulo="Partida de" valor={p.viagem.partida} alterar={v => alterarViagem("partida", v)} />
          <Campo titulo="Data de ida" tipo="date" valor={p.viagem.ida} alterar={v => alterarViagem("ida", v)} />
          <Campo titulo="Data de regresso" tipo="date" valor={p.viagem.regresso} alterar={v => alterarViagem("regresso", v)} />
          <Campo titulo="Viajantes" tipo="number" valor={p.viagem.viajantes} alterar={v => alterarViagem("viajantes", v)} />
          <Campo titulo="Bagagem" valor={p.viagem.bagagem} alterar={v => alterarViagem("bagagem", v)} />
          <Campo titulo="Transfer" valor={p.viagem.transfer} alterar={v => alterarViagem("transfer", v)} />
        </div>
        <Campo titulo="Voos (companhia, horários, escalas)" grande valor={p.viagem.voo} alterar={v => alterarViagem("voo", v)} />

        <h3>Opções de alojamento ({p.opcoes.length} de {MAX_OPCOES_PROPOSTA})</h3>
        {p.opcoes.map((o, i) => <article key={i} className={css.voo}>
          <div className={css.tituloLinha}>
            <strong>Opção {LETRAS[i]}{o.ficheiro ? ` · ${o.ficheiro}` : ""}</strong>
            <button type="button" className={css.remover} onClick={() => setP({...p, opcoes: p.opcoes.filter((_, j) => j !== i), recomendada: p.recomendada === i ? null : p.recomendada !== null && p.recomendada > i ? p.recomendada - 1 : p.recomendada})}>Remover</button>
          </div>
          <div className={css.grelha}>
            <Campo titulo="Hotel" valor={o.hotel} alterar={v => alterarOpcao(i, {hotel: v, lat: null, lng: null})} />
            <Campo titulo="Quarto" valor={o.quarto} alterar={v => alterarOpcao(i, {quarto: v})} />
            <Campo titulo="Regime" valor={o.regime} alterar={v => alterarOpcao(i, {regime: v})} />
            <Campo titulo="Preço total (€)" valor={o.total === null ? "" : String(o.total)} alterar={v => alterarOpcao(i, {total: numeroOuNulo(v)})} />
            <Campo titulo="Preço por pessoa (€)" valor={o.precoPessoa === null ? "" : String(o.precoPessoa)} alterar={v => alterarOpcao(i, {precoPessoa: numeroOuNulo(v)})} />
          </div>
          <Campo titulo="O que muda nesta opção (além do hotel)" grande valor={o.diferencas} alterar={v => alterarOpcao(i, {diferencas: v})} />
        </article>)}
        {p.opcoes.length < MAX_OPCOES_PROPOSTA && <button type="button" onClick={() => setP({...p, opcoes: [...p.opcoes, opcaoVazia()]})}>+ Acrescentar opção à mão</button>}

        <h3>O que está incluído</h3>
        <div className={css.grelha}>
          <label className={css.campo}><span>Incluído (um por linha)</span><textarea rows={6} value={p.incluido.join("\n")} onChange={e => setP({...p, incluido: e.target.value.split("\n")})} onBlur={e => setP({...p, incluido: linhasDe(e.target.value)})} /></label>
          <label className={css.campo}><span>Não incluído (um por linha)</span><textarea rows={6} value={p.naoIncluido.join("\n")} onChange={e => setP({...p, naoIncluido: e.target.value.split("\n")})} onBlur={e => setP({...p, naoIncluido: linhasDe(e.target.value)})} /></label>
        </div>
        <Campo titulo="Condições (cancelamento, pagamento)" grande valor={p.condicoes} alterar={v => setP({...p, condicoes: v})} />
        <div className={css.grelha}>
          <Campo titulo="Proposta válida até" tipo="date" valor={p.validade} alterar={v => setP({...p, validade: v})} />
          <Campo titulo="Nome da proposta (só para ti)" valor={p.nome} alterar={v => setP({...p, nome: v})} />
        </div>
        {validadePassada && <p className={css.erro}>A data de validade já passou. Atualiza-a antes de enviar ao cliente.</p>}
        <div className={css.rodape}><button type="button" className={css.primario} disabled={!p.viagem.destino || !p.opcoes.length} onClick={() => irPara("conteudo")}>Seguinte: conteúdo</button></div>
      </>}

      {passo === "conteudo" && <>
        <div className={css.tituloLinha}>
          <h3>Preparar com IA</h3>
          <button type="button" className={css.primario} disabled={!ia} onClick={() => {
            if (p.destaques.length && !window.confirm("Preparar de novo substitui os destaques, os voos e as dicas. Continuar?")) return;
            void executar("A IA está a preparar destaques, voos, dicas e fotografias dos hotéis… pode demorar até dois minutos.", async () => {
              const c = await pedir<{proposta: Proposta}>("gerar", {proposta: p});
              await guardar(c.proposta);
              setAviso("Conteúdo preparado. Revê tudo e confirma as secções marcadas “A confirmar”.");
            });
          }}>{p.destaques.length ? "Preparar de novo" : "Preparar com IA"}</button>
        </div>
        <p className={css.ajuda}>Cria os destaques do destino, os cartões de embarque, as dicas (documentos, saúde, moeda, clima…), encontra a localização e uma fotografia de cada hotel.</p>

        {!!p.destaques.length && <>
          <h3>Destaques do destino</h3>
          {p.destaques.map((d, i) => <article key={i} className={css.dia}>
            <div className={css.tituloLinha}><strong>{i + 1}. {d.titulo || "Destaque"}</strong>
              <button type="button" className={css.remover} onClick={() => setP({...p, destaques: p.destaques.filter((_, j) => j !== i)})}>Remover</button></div>
            <Campo titulo="Título" valor={d.titulo} alterar={v => setP({...p, destaques: p.destaques.map((x, j) => j === i ? {...x, titulo: v} : x)})} />
            <Campo titulo="Texto" grande valor={d.texto} alterar={v => setP({...p, destaques: p.destaques.map((x, j) => j === i ? {...x, texto: v} : x)})} />
          </article>)}
        </>}

        {(p.voos.length > 0 || p.destaques.length > 0) && <>
          <h3>Voos (cartões de embarque)</h3>
          {p.voos.map((v, i) => <article key={i} className={css.voo}>
            <div className={css.tituloLinha}><strong>{v.sentido === "ida" ? "Ida" : "Volta"} · {v.origem || "?"} → {v.destino || "?"}</strong>
              <button type="button" className={css.remover} onClick={() => setP({...p, voos: p.voos.filter((_, j) => j !== i)})}>Remover</button></div>
            <div className={css.grelhaVoo}>
              <label className={css.campo}><span>Sentido</span><select value={v.sentido} onChange={e => alterarVoo(i, "sentido", e.target.value)}><option value="ida">Ida</option><option value="volta">Volta</option></select></label>
              <Campo titulo="Companhia" valor={v.companhia} alterar={x => alterarVoo(i, "companhia", x)} />
              <Campo titulo="N.º do voo" valor={v.numero} alterar={x => alterarVoo(i, "numero", x)} />
              <Campo titulo="Data" tipo="date" valor={v.data} alterar={x => alterarVoo(i, "data", x)} />
              <Campo titulo="De (código)" valor={v.origem} alterar={x => alterarVoo(i, "origem", x)} />
              <Campo titulo="Partida" valor={v.partida} alterar={x => alterarVoo(i, "partida", x)} />
              <Campo titulo="Para (código)" valor={v.destino} alterar={x => alterarVoo(i, "destino", x)} />
              <Campo titulo="Chegada" valor={v.chegada} alterar={x => alterarVoo(i, "chegada", x)} />
            </div>
          </article>)}
          {p.voos.length < 6 && <button type="button" onClick={() => setP({...p, voos: [...p.voos, vooVazio(p.voos.some(v => v.sentido === "ida") ? "volta" : "ida")]})}>+ Acrescentar voo</button>}
        </>}

        {!!p.dicas.length && <>
          <h3>Dicas práticas</h3>
          {p.dicas.map((d, i) => <article key={i} className={d.sensivel && !d.confirmado ? css.dicaPendente : css.dica}>
            <div className={css.tituloLinha}><strong>{d.titulo}</strong>
              {d.sensivel && <span className={d.confirmado ? css.etiquetaOk : css.etiqueta}>{d.confirmado ? "Confirmado" : "A confirmar"}</span>}</div>
            <textarea rows={4} value={d.texto} aria-label={d.titulo} onChange={e => setP({...p, dicas: p.dicas.map((x, j) => j === i ? {...x, texto: e.target.value} : x)})} />
            {d.sensivel && <label className={css.confirmar}><input type="checkbox" checked={d.confirmado} onChange={e => setP({...p, dicas: p.dicas.map((x, j) => j === i ? {...x, confirmado: e.target.checked} : x)})} /> Confirmei esta informação nas fontes oficiais</label>}
          </article>)}
          <h3>Emergência no destino</h3>
          <article className={p.emergencia.texto && !p.emergencia.confirmado ? css.dicaPendente : css.dica}>
            <textarea rows={3} value={p.emergencia.texto} aria-label="Emergência no destino" onChange={e => setP({...p, emergencia: {...p.emergencia, texto: e.target.value}})} />
            {p.emergencia.texto && <label className={css.confirmar}><input type="checkbox" checked={p.emergencia.confirmado} onChange={e => setP({...p, emergencia: {...p.emergencia, confirmado: e.target.checked}})} /> Confirmei os números e a morada da embaixada</label>}
          </article>
        </>}
        <div className={css.rodape}><button type="button" onClick={() => irPara("pdfs")}>Anterior</button><button type="button" className={css.primario} onClick={() => irPara("entregar")}>Seguinte: entregar</button></div>
      </>}

      {passo === "entregar" && <>
        <div className={css.tituloLinha}>
          <h3>Pré-visualização</h3>
          <button type="button" className={previa && previa.assinatura !== assinatura(p) ? css.primario : undefined} disabled={aGerarPrevia} onClick={() => void gerarPrevia()}>
            {aGerarPrevia ? "A criar…" : previa ? "Atualizar pré-visualização" : "Ver pré-visualização"}</button>
        </div>
        {previa && previa.assinatura !== assinatura(p) && !aGerarPrevia && <p className={css.ajuda}>Fizeste alterações. Carrega em “Atualizar pré-visualização” para as ver.</p>}
        {erroPrevia && <p className={css.erro}>{erroPrevia}</p>}
        {aGerarPrevia && !previa && <p className={css.estado}>A desenhar as páginas… pode demorar alguns segundos.</p>}
        {previa && <div className={css.previaPaginas} aria-busy={aGerarPrevia}>{previa.paginas.map((src, i) => <button type="button" key={i} onClick={() => setPaginaAberta(i)} aria-label={`Abrir página ${i + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Página ${i + 1}`} /><span>{i + 1}</span></button>)}</div>}
        {previa && paginaAberta !== null && <div className={css.paginaAberta} role="dialog" aria-modal="true" aria-label={`Página ${paginaAberta + 1}`} onClick={() => setPaginaAberta(null)}>
          <div onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previa.paginas[paginaAberta]} alt={`Página ${paginaAberta + 1}`} />
            <div className={css.acoes}>
              <button type="button" disabled={paginaAberta === 0} onClick={() => setPaginaAberta(paginaAberta - 1)}>← Anterior</button>
              <span>{paginaAberta + 1} / {previa.paginas.length}</span>
              <button type="button" disabled={paginaAberta === previa.paginas.length - 1} onClick={() => setPaginaAberta(paginaAberta + 1)}>Seguinte →</button>
              <button type="button" className={css.primario} onClick={() => setPaginaAberta(null)}>Fechar</button>
            </div>
          </div>
        </div>}

        <h3>A nossa escolha</h3>
        <p className={css.ajuda}>Destaca a opção que recomendas (aparece com a etiqueta “A nossa escolha”), ou deixa todas iguais.</p>
        <div className={css.paletas}>
          <button type="button" aria-pressed={p.recomendada === null} onClick={() => setP({...p, recomendada: null})}>Nenhuma</button>
          {p.opcoes.map((o, i) => <button type="button" key={i} aria-pressed={p.recomendada === i} onClick={() => setP({...p, recomendada: i})}>{LETRAS[i]} · {o.hotel || "Opção"} · {euros(o.total ?? o.precoPessoa)}</button>)}
        </div>

        <h3>O teu WhatsApp</h3>
        <p className={css.ajuda}>Aparece num QR code no fim da proposta: o cliente aponta a câmara e abre uma conversa contigo. Fica guardado para as próximas propostas.</p>
        <div className={css.acoes}>
          <input className={css.inputLinha} value={telemovel} inputMode="tel" placeholder="912 345 678" aria-label="Telemóvel" onChange={e => setTelemovel(e.target.value)} />
          <button type="button" onClick={() => void executar("A guardar…", async () => { const c = await pedir<{perfil: {telemovel: string}}>("perfil", {perfil: {telemovel}}); setTelemovel(c.perfil.telemovel); setAviso(c.perfil.telemovel ? "Telemóvel guardado." : "Telemóvel retirado: a proposta sai sem QR."); })}>Guardar telemóvel</button>
        </div>

        <div className={css.tituloLinha}><h3>Cores</h3>{botaoCores}</div>
        {editorCores}
        <h3>Estilo</h3>
        <div className={css.estilos}>{ESTILOS_PLANNER.map(e => <button type="button" key={e.id} aria-pressed={p.estilo === e.id} className={p.estilo === e.id ? css.estiloAtivo : css.estilo} onClick={() => setP({...p, estilo: e.id})}>
          <span className={css[`amostra_${e.id}`]} aria-hidden="true" /><strong>{e.nome}</strong><small>{e.descricao}</small></button>)}</div>

        <h3>Fotografias</h3>
        {linhaFoto("capa", "Capa")}
        {p.opcoes.map((o, i) => linhaFoto(`hotel-${i}`, `Opção ${LETRAS[i]} · ${o.hotel || "hotel"}`, <button type="button" onClick={() => siteOficial(i)}>Site oficial</button>))}
        {p.destaques.map((d, i) => linhaFoto(`destaque-${i}`, `Destaque · ${d.titulo}`))}

        <h3>Hotéis no mapa</h3>
        {p.opcoes.map((o, i) => <div key={i} className={css.ponto}>
          <span className={o.lat !== null ? css.pontoNoMapa : css.pontoFora}>{LETRAS[i]}</span>
          <div><strong>{o.hotel || `Opção ${LETRAS[i]}`}</strong><small>{o.lat !== null && o.lng !== null ? `No mapa · ${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}` : "Fora do mapa"}</small></div>
          <div className={css.acoes}>
            <button type="button" onClick={() => setPonto(ponto?.opcao === i ? null : {opcao: i, termo: [o.hotel, p.viagem.destino.split(",")[0]].filter(Boolean).join(", "), resultados: null})}>{o.lat !== null ? "Corrigir" : "Pôr no mapa"}</button>
            {o.lat !== null && <button type="button" className={css.remover} onClick={() => alterarOpcao(i, {lat: null, lng: null})}>Retirar do mapa</button>}
          </div>
          {ponto?.opcao === i && <div className={css.pontoProcura}>
            <div className={css.acoes}>
              <input value={ponto.termo} aria-label="Local a procurar" onChange={e => setPonto({...ponto, termo: e.target.value})} />
              <button type="button" className={css.primario} onClick={() => void executar("A procurar…", async () => { const c = await pedir<{locais: {nome: string; lat: number; lng: number}[]}>("localizar", {termo: ponto.termo}); setPonto({...ponto, resultados: c.locais}); })}>Procurar</button>
            </div>
            {ponto.resultados && !ponto.resultados.length && <p className={css.ajuda}>Não encontrámos. Experimenta com a cidade.</p>}
            {ponto.resultados?.map((l, k) => <button type="button" key={k} className={css.resultado} onClick={() => { alterarOpcao(i, {lat: l.lat, lng: l.lng}); setPonto(null); }}>{l.nome}</button>)}
          </div>}
        </div>)}

        <h3>Descarregar</h3>
        {pendentes.length > 0 ? <p className={css.erro}>Antes de enviar ao cliente, confirma no passo 2: {pendentes.join(", ")}.</p>
          : validadePassada ? <p className={css.erro}>A validade da proposta já passou — atualiza-a no passo 1.</p>
          : <p className={css.ajuda}>Capa, voos, o que está incluído, as opções, a comparação com mapa, destaques, dicas e o fecho com o teu WhatsApp.</p>}
        <div className={css.rodape}>
          <button type="button" onClick={() => irPara("conteudo")}>Anterior</button>
          <button type="button" className={css.primario} disabled={pendentes.length > 0} onClick={descarregarPDF}>Descarregar PDF</button>
        </div>

        {p.opcoes.length > 0 && <>
          <h3>O cliente escolheu?</h3>
          <p className={css.ajuda}>Cria o travel planner com a opção reservada: passam a viagem, o hotel, os voos, as dicas já confirmadas e as cores.</p>
          <div className={css.acoes}>
            <select className={css.inputLinha} value={opcaoPlanner} onChange={e => setOpcaoPlanner(Number(e.target.value))} aria-label="Opção escolhida pelo cliente">
              {p.opcoes.map((o, i) => <option key={i} value={i}>{LETRAS[i]} · {o.hotel || "Opção"}</option>)}
            </select>
            <button type="button" className={css.primario} onClick={() => void executar("A criar o travel planner…", async () => {
              const guardado = await guardar();
              await pedir("criar-planner", {id: guardado!.id, opcao: opcaoPlanner});
              setAviso("Travel planner criado. Abre-o em Reservas → Travel planner.");
              abrirPlanner();
            })}>Criar travel planner</button>
          </div>
        </>}
      </>}
    </fieldset>
  </section>;
}
