"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { aPartirDoModeloReserva, CAMPOS_RESERVA, ICONES_RESERVA, dadosReservaVazios, dimensoesReserva, elementoReserva, espacoFotoReserva, hotelVazio, manterFotografiasReserva, novoMaterialReserva, precoPessoaReserva, prepararModeloReserva, validarMaterialReserva, type CampoReserva, type DadosReserva, type ElementoReserva, type FormatoReserva, type HotelReserva, type MaterialReserva, type ResumoReserva } from "@/lib/reservas";
import { comprimirImagemReserva, desenharReserva, pngReserva, prepararBaseReserva } from "@/lib/reservas-canvas";
import { CriarReservaOrcamento } from "./reservas-orcamento";
import { AjustesReserva } from "./reservas-ajustes";
import { FONTES_RESERVA } from "@/lib/reservas-fontes";
import { legendaMaterialReserva, novoModeloBaseReserva } from "@/lib/reservas-modelos";
import css from "./reservas.module.css";
import imagemCss from "./reservas-imagem.module.css";
import { CriarPublicacaoImagem } from "./reservas-imagem";

const API = "/api/consultor/nova-area/reservas";
const CAMPOS: Record<CampoReserva, string> = {livre: "Texto livre", destino: "Destino", frase: "Frase promocional", partida: "Cidade de partida", datas: "Datas", ida: "Data de ida", regresso: "Data de regresso", noites: "Número de noites", viajantes: "Número de viajantes", voo: "Voo", preco: "Preço por pessoa", total: "Preço total", hotel: "Nome do hotel", quarto: "Quarto", regime: "Regime alimentar", bagagem: "Bagagem", transfer: "Transfer", condicoes: "Condições"};
interface Foto {titulo: string; url: string; origem: string; credito: string}
interface Registo {id: string; tipo: "modelo" | "material"; material: MaterialReserva}
const nomeFicheiro = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 70) || "promocao";
function descarregar(blob: Blob, nome: string) {const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);}
function Campo({titulo, valor, alterar, tipo = "text"}: {titulo: string; valor: string | number | null; alterar: (v: string) => void; tipo?: "text" | "date" | "number"}) {
  return <label className={css.campo}><span>{titulo}</span><input type={tipo} value={valor ?? ""} min={tipo === "number" ? 0 : undefined} step={tipo === "number" ? "any" : undefined} onChange={e => alterar(e.target.value)} /></label>;
}

export function ReservasNovaArea({email}: {email: string}) {
  const [anteriores, setAnteriores] = useState(false);
  return <><CriarPublicacaoImagem key={email} email={email}/><details className={imagemCss.anteriores} onToggle={e => setAnteriores(e.currentTarget.open)}><summary>Editor e materiais anteriores</summary>{anteriores && <EditorReservasAnterior key={email} email={email}/>}</details></>;
}
function EditorReservasAnterior({email}: {email: string}) {
  const [aba, setAba] = useState<"orcamento" | "criar" | "modelos" | "historico">("orcamento");
  const [material, setMaterial] = useState<MaterialReserva>(() => novoMaterialReserva());
  const [registo, setRegisto] = useState<{id: string; tipo: "modelo" | "material"} | null>(null);
  const [lista, setLista] = useState<ResumoReserva[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [importadas, setImportadas] = useState<DadosReserva[]>([]);
  const [fotografias, setFotografias] = useState<Foto[]>([]);
  const [termoFoto, setTermoFoto] = useState("");
  const [ia, setIA] = useState(true);
  const [carregado, setCarregado] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [revisado, setRevisado] = useState(false);
  const [compararReferencia, setCompararReferencia] = useState(false);
  const [resultadoSimples, setResultadoSimples] = useState(false);
  const [modoBase,setModoBase]=useState(false),[guiaSobreposta,setGuiaSobreposta]=useState(false);
  const [modeloParaUsar,setModeloParaUsar]=useState<{id:string;material:MaterialReserva}|null>(null);
  const [erroPreview, setErroPreview] = useState("");
  const [podeDesfazer,setPodeDesfazer]=useState(false);
  const anteriores=useRef<MaterialReserva[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const referenciaInput = useRef<HTMLInputElement>(null), pdfInput = useRef<HTMLInputElement>(null), fotoInput = useRef<HTMLInputElement>(null);
  const fotoDestino = useRef<string | null>(null);
  const baseInput=useRef<HTMLInputElement>(null),guiaInput=useRef<HTMLInputElement>(null);
  const arrasto=useRef<{id:string;x:number;y:number;inicioX:number;inicioY:number;w:number;h:number;redimensionar?:boolean;tamanho:number;antes:MaterialReserva;guardou:boolean}|null>(null);
  const previewSequencia = useRef(0);

  async function pedir<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
    const resposta = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao, ...extra})});
    const corpo = await resposta.json();
    if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível concluir o pedido.");
    return corpo as T;
  }
  async function carregarLista() {
    const corpo = await pedir<{registos: ResumoReserva[]; ia: boolean}>("listar"); setLista(corpo.registos); setIA(corpo.ia); setCarregado(true);
  }
  useEffect(() => {
    let cancelado = false;
    fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao: "listar"})}).then(async r => {const c = await r.json(); if (!r.ok) throw new Error(c.erro); if (!cancelado) {setLista(c.registos); setIA(c.ia); setCarregado(true);}}).catch(e => {if (!cancelado) setErro(e instanceof Error ? e.message : "Não foi possível carregar o histórico.");});
    return () => {cancelado = true;};
  }, [email]);
  useEffect(() => {
    const sequencia = ++previewSequencia.current;
    const timer = setTimeout(async () => {
      try {
        const auxiliar = document.createElement("canvas"); await desenharReserva(auxiliar, material, !resultadoSimples);
        if (sequencia !== previewSequencia.current || !canvas.current) return;
        canvas.current.width = auxiliar.width; canvas.current.height = auxiliar.height; canvas.current.getContext("2d")?.drawImage(auxiliar, 0, 0);
        setErroPreview("");
      } catch (e) {if (sequencia === previewSequencia.current) setErroPreview(e instanceof Error ? e.message : "Não foi possível mostrar a pré-visualização.");}
    }, 100);
    return () => clearTimeout(timer);
  }, [material, aba, resultadoSimples]);
  useEffect(() => {
    if (!alterado) return;
    const proteger = (e: BeforeUnloadEvent) => {e.preventDefault(); e.returnValue = "";};
    window.addEventListener("beforeunload", proteger); return () => window.removeEventListener("beforeunload", proteger);
  }, [alterado]);

  function lembrar(m:MaterialReserva){if(anteriores.current.at(-1)!==m)anteriores.current=[...anteriores.current.slice(-29),m];setPodeDesfazer(true);}
  function limparDesfazer(){anteriores.current=[];setPodeDesfazer(false);arrasto.current=null;}
  function desfazer(){const m=anteriores.current.pop();if(m){setMaterial(m);setAlterado(true);setRevisado(false);setMensagem("");setSelecionado(id=>m.elementos.some(e=>e.id===id)?id:null);}setPodeDesfazer(anteriores.current.length>0);}
  function atualizar(alterar: (m: MaterialReserva) => MaterialReserva,guardar=true) {if(guardar)lembrar(material);setMaterial(alterar); setAlterado(true); setRevisado(false); setMensagem("");}
  function dados<K extends keyof DadosReserva>(chave: K, valor: DadosReserva[K]) {atualizar(m => ({...m, dados: {...m.dados, [chave]: valor}}));}
  function hotel<K extends keyof HotelReserva>(i: number, chave: K, valor: HotelReserva[K]) {atualizar(m => ({...m, dados: {...m.dados, hoteis: m.dados.hoteis.map((h, n) => n === i ? {...h, [chave]: valor} : h)}}));}
  function elemento(patch: Partial<ElementoReserva>) {atualizar(m => ({...m, elementos: m.elementos.map(e => {
    if (e.id !== selecionado || e.tipo === "marca") return e;
    const proximo = {...e, ...patch}; proximo.w = Math.min(proximo.w, 100 - proximo.x); proximo.h = Math.min(proximo.h, 100 - proximo.y);
    if (proximo.recorte) proximo.recorte = {...proximo.recorte, w: Math.min(proximo.recorte.w, 100 - proximo.recorte.x), h: Math.min(proximo.recorte.h, 100 - proximo.recorte.y)};
    return proximo;
  })}));}
  async function executar(titulo: string, acao: () => Promise<void>) {
    if (ocupado) return; setOcupado(titulo); setErro(""); setMensagem("");
    try {await acao();} catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível concluir o pedido.");} finally {setOcupado("");}
  }
  function podeSubstituir() {return !alterado || window.confirm("Tens alterações por guardar. Queres abrir outro material e descartar essas alterações?");}
  function novo() {if (!podeSubstituir()) return; limparDesfazer(); setModoBase(false);setGuiaSobreposta(false);setCompararReferencia(false);setMaterial(novoMaterialReserva(material.formato)); setResultadoSimples(false); setRegisto(null); setSelecionado(null); setAlterado(false); setRevisado(false); setAvisos([]); setImportadas([]); setFotografias([]); setErro(""); setMensagem(""); setAba("criar");}
  function iniciarModeloBase() {
    if(!podeSubstituir())return;
    limparDesfazer();
    setMaterial(novoModeloBaseReserva("story"));setModoBase(true);setResultadoSimples(false);setRegisto(null);setSelecionado(null);setAlterado(false);setRevisado(false);setCompararReferencia(false);setGuiaSobreposta(false);setAvisos([]);setImportadas([]);setFotografias([]);setErro("");setMensagem("");setAba("criar");
  }
  async function carregarBase(e:ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0];e.target.value="";if(!f)return;
    await executar("A carregar a base do Canva…",async()=>{
      const base=await prepararBaseReserva(f);
      if(material.baseFixa&&base.formato!==material.formato)throw new Error("O formato desta base é diferente. Cria um novo modelo para manter as posições do modelo atual.");
      const m=material.baseFixa?{...material,baseFixa:base.imagem}:{...novoModeloBaseReserva(base.formato,base.imagem),nome:material.nome};
      atualizar(()=>m);setModoBase(true);setSelecionado(m.elementos.find(e=>e.campo==="destino")?.id??null);setMensagem("Base carregada. Arrasta os campos para os lugares certos e guarda o modelo.");
    });
  }
  async function carregarGuia(e:ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0];e.target.value="";if(!f)return;
    await executar("A carregar o exemplo completo…",async()=>{const referencia=await comprimirImagemReserva(f);atualizar(m=>({...m,referencia}));setGuiaSobreposta(true);setCompararReferencia(false);});
  }
  function receberTemplate(m: MaterialReserva) {
    if (!podeSubstituir()) return;
    limparDesfazer();
    setMaterial(m);setModoBase(!!m.baseFixa);setGuiaSobreposta(false); setRegisto(null); setSelecionado(null); setAlterado(true); setRevisado(false); setCompararReferencia(false); setResultadoSimples(true); setAba("criar"); setAvisos([]); setImportadas([]); setFotografias([]); setErro(""); setMensagem("Template criado a partir do orçamento. Revê o resultado antes de descarregar.");
  }
  async function carregarReferencia(e: ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0]; e.target.value = ""; if (!ficheiro) return;
    await executar("A reconstruir a tua referência…", async () => {
      const referencia = await comprimirImagemReserva(ficheiro);
      const resultado = await pedir<{material: MaterialReserva}>("referencia", {referencia, formato: material.formato});
      const reconstruido = validarMaterialReserva(resultado.material);
      // Mantém os dados introduzidos; nunca perde hotéis ao mudar para uma referência menor.
      if (material.dados.hoteis.length > reconstruido.maxHoteis && material.dados.hoteis.some(h => h.nome || h.total !== null || h.precoPessoa !== null)) {
        setImportadas([material.dados]); setAvisos(["A nova referência tem menos espaços para hotéis. Escolhe abaixo quais as opções que queres colocar."]);
      }
      reconstruido.dados = {...material.dados, hoteis: Array.from({length: reconstruido.maxHoteis}, (_, i) => material.dados.hoteis[i] ?? hotelVazio())};
      limparDesfazer(); setMaterial(reconstruido); setRegisto(null); setSelecionado(null); setAlterado(true); setRevisado(false); setFotografias([]);
      setMensagem(`Referência reconstruída. O modelo tem espaço para ${reconstruido.maxHoteis} ${reconstruido.maxHoteis === 1 ? "hotel" : "hotéis"}. Revê o desenho e ajusta os elementos.`);
    });
  }
  async function reanalisar() {
    await executar("A adaptar a referência…", async () => {
      const resposta = await pedir<{material: MaterialReserva}>("referencia", {referencia: material.referencia, formato: material.formato});
      const m = validarMaterialReserva(resposta.material); m.dados = {...material.dados, hoteis: Array.from({length: m.maxHoteis}, (_, i) => material.dados.hoteis[i] ?? hotelVazio())};
      m.elementos = manterFotografiasReserva(material.elementos, m.elementos);
      if (material.dados.hoteis.length > m.maxHoteis) {setImportadas([material.dados]); setAvisos(["A referência adaptada tem menos espaços. Escolhe as opções abaixo para manter todos os hotéis disponíveis."]);}
      limparDesfazer(); setMaterial(m); setSelecionado(null); setAlterado(true); setRevisado(false); setMensagem("Referência reanalisada. Compara a composição com a imagem original. As fotografias que carregaste foram mantidas.");
    });
  }
  async function importarPDF(e: ChangeEvent<HTMLInputElement>) {
    const ficheiros = Array.from(e.target.files ?? []); e.target.value = ""; if (!ficheiros.length) return;
    await executar("A ler os orçamentos…", async () => {
      const propostas: DadosReserva[] = [], alertas: string[] = [];
      for (const ficheiro of ficheiros) {
        if (ficheiro.size > 4_000_000) {alertas.push(`${ficheiro.name}: excede 4 MB.`); continue;}
        const form = new FormData(); form.set("email", email); form.set("ficheiro", ficheiro);
        try {
          const r = await fetch(API, {method: "POST", body: form}), corpo = await r.json();
          if (!r.ok) throw new Error(corpo.erro);
          propostas.push(...corpo.propostas); alertas.push(...corpo.avisos);
        } catch (erro) {alertas.push(`${ficheiro.name}: ${erro instanceof Error ? erro.message : "Não foi possível importar."}`);}
      }
      setImportadas(propostas); setAvisos(alertas);
      if (!propostas.length) throw new Error(alertas.join(" ") || "Não foram encontradas propostas.");
      if (!material.dados.destino && !material.dados.hoteis.some(h => h.nome)) aplicarProposta(propostas[0], 0);
      setMensagem(`${propostas.length} ${propostas.length === 1 ? "proposta importada" : "propostas importadas"}. Confirma os preços, datas e serviços antes de descarregar.`);
    });
  }
  function aplicarProposta(proposta: DadosReserva | undefined, inicio: number) {
    if (!proposta) return;
    atualizar(m => ({...m, nome: proposta.destino ? `Promoção ${proposta.destino}` : m.nome, dados: {...proposta, frase: proposta.frase || "", hoteis: proposta.hoteis.slice(inicio, inicio + m.maxHoteis)}}));
    setFotografias([]); setTermoFoto(proposta.destino);
  }
  async function guardar(tipo: "modelo" | "material", copia = false) {
    await executar(tipo === "modelo" ? "A guardar o modelo…" : "A guardar o material…", async () => {
      let pronto = validarMaterialReserva(material);
      if(modoBase&&!pronto.baseFixa)throw new Error("Carrega a base do Canva antes de guardar.");
      if (tipo === "modelo") pronto = prepararModeloReserva(pronto);
      const r = await pedir<{id: string; tipo: "modelo" | "material"}>("guardar", {tipo, material: pronto, ...(!copia && registo?.tipo === tipo ? {id: registo.id} : {})});
      if (!copia) {setRegisto(r); setAlterado(tipo === "modelo" && !!(material.dados.destino || material.dados.partida || material.dados.ida || material.dados.viajantes || material.dados.hoteis.some(h => h.nome || h.total !== null || h.precoPessoa !== null)));}
      await carregarLista(); setMensagem(tipo === "modelo" ? "Modelo guardado na tua conta. Os dados deste orçamento não fazem parte do modelo." : "Material guardado no teu histórico privado.");
      if(tipo==="modelo"&&pronto.baseFixa)setModeloParaUsar({id:r.id,material:pronto});
    });
  }
  async function abrir(item: ResumoReserva, acao: "editar" | "usar" | "duplicar") {
    if (!podeSubstituir()) return;
    await executar("A abrir…", async () => {
      const r = await pedir<Registo>("abrir", {id: item.id}); const m = validarMaterialReserva(r.material);
      if(acao==="usar"&&m.baseFixa){setModeloParaUsar({id:r.id,material:m});setAba("orcamento");return;}
      limparDesfazer();
      setModoBase(!!m.baseFixa);setGuiaSobreposta(false);setCompararReferencia(false);
      setMaterial(acao === "usar" ? aPartirDoModeloReserva(m) : acao === "duplicar" ? {...m, nome: `${m.nome.slice(0, 110)} — cópia`} : m);
      setRegisto(acao === "editar" ? {id: r.id, tipo: r.tipo} : null); setAlterado(acao !== "editar"); setRevisado(false); setResultadoSimples(false); setSelecionado(null); setImportadas([]); setAvisos([]); setFotografias([]); setTermoFoto(acao === "usar" ? "" : m.dados.destino); setAba("criar");
    });
  }
  async function exportar() {
    await executar("A preparar o PNG…", async () => {const pronto = validarMaterialReserva(material); descarregar(await pngReserva(pronto), `${nomeFicheiro(pronto.nome)}-${pronto.formato}.png`); setMensagem("PNG descarregado. Podes guardar o material no histórico para voltar a editá-lo.");});
  }
  async function exportarHistorico() {
    await executar("A preparar os materiais…", async () => {
      const {default: JSZip} = await import("jszip"), zip = new JSZip();
      const itens = lista.filter(r => r.tipo === "material");
      for (const [i, item] of itens.entries()) {const r = await pedir<Registo>("abrir", {id: item.id}); zip.file(`${i + 1}-${nomeFicheiro(item.nome)}.png`, await pngReserva(validarMaterialReserva(r.material)));}
      descarregar(await zip.generateAsync({type: "blob"}), "materiais-reservas.zip");
    });
  }
  async function sugerirFoto() {
    await executar("A procurar fotografias…", async () => {
      const r = await pedir<{fotografias: Foto[]}>("fotografias", {destino: termoFoto || material.dados.destino}); setFotografias(r.fotografias);
      if (!r.fotografias.length) setMensagem("Não encontrámos sugestões de domínio público para este termo. Experimenta outro nome ou carrega uma fotografia tua.");
    });
  }
  async function usarFoto(foto: Foto) {
    await executar("A carregar a fotografia…", async () => {
      const r = await pedir<{imagem: string}>("usar-foto", {url: foto.url});
      const alvo = selecionado && material.elementos.find(e => e.id === selecionado && e.tipo === "foto") ? selecionado : material.elementos.find(e => e.tipo === "foto")?.id;
      aplicarImagem(r.imagem, alvo, foto.credito, foto.origem); setFotografias([]);
    });
  }
  async function carregarFoto(e: ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0]; e.target.value = ""; if (!ficheiro) return;
    await executar("A preparar a fotografia…", async () => {
      const imagem = await comprimirImagemReserva(ficheiro), alvo = fotoDestino.current || material.elementos.find(e => e.tipo === "foto")?.id;
      aplicarImagem(imagem, alvo);
    });
  }
  function aplicarImagem(imagem: string, alvo?: string | null, credito?: string, origem?: string) {
    const novo = elementoReserva("foto","Fotografia do destino",espacoFotoReserva(material));
    atualizar(m=>({...m,elementos:alvo ? m.elementos.map(e=>e.id===alvo&&(e.tipo==="foto"||e.tipo==="grafico")?{...e,imagem,recorte:undefined,icone:undefined,credito,origem}:e) : [...m.elementos.filter(e=>e.tipo==="forma"),{...novo,imagem,credito,origem},...m.elementos.filter(e=>e.tipo!=="forma")]}));
    setSelecionado(alvo||novo.id);
  }
  function adicionar(tipo: "texto" | "forma" | "foto") {
    const e = elementoReserva(tipo, tipo === "texto" ? "Novo texto" : tipo === "forma" ? "Nova forma" : "Nova fotografia", {x: 10, y: 40, w: 80, h: tipo === "texto" ? 8 : 25});
    if (tipo === "texto") e.texto = "Edita este texto";
    if (tipo === "forma") {e.cor = "#4b5320"; e.opacidade = .8;}
    atualizar(m => ({...m, elementos: [...m.elementos.filter(e => e.tipo !== "marca"), e, ...m.elementos.filter(e => e.tipo === "marca")]})); setSelecionado(e.id);
  }
  function adicionarCampo(campo:CampoReserva) {
    const e={...elementoReserva("texto",CAMPOS[campo],{x:8,y:45,w:84,h:6}),campo,texto:CAMPOS[campo],fonte:"geometrica" as const,alinhar:"left" as const,sombra:true};
    atualizar(m=>({...m,elementos:[...m.elementos,e]}));setSelecionado(e.id);
  }
  function selecionarCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
    const encontrado = [...material.elementos].reverse().find(e => e.tipo !== "marca" && x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h);
    setSelecionado(encontrado?.id ?? null);
    if(encontrado){arrasto.current={id:encontrado.id,x:encontrado.x,y:encontrado.y,inicioX:e.clientX,inicioY:e.clientY,w:encontrado.w,h:encontrado.h,tamanho:encontrado.tamanho,antes:material,guardou:false};e.currentTarget.setPointerCapture(e.pointerId);}
  }
  function redimensionarCampo(e:React.PointerEvent<HTMLButtonElement>){
    const v=material.elementos.find(v=>v.id===selecionado);if(!v||v.tipo==="marca")return;
    e.preventDefault();e.stopPropagation();arrasto.current={id:v.id,x:v.x,y:v.y,w:v.w,h:v.h,inicioX:e.clientX,inicioY:e.clientY,tamanho:v.tamanho,redimensionar:true,antes:material,guardou:false};e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverCampo(e:React.PointerEvent<HTMLElement>) {
    const a=arrasto.current;if(!a||ocupado)return;
    const r=canvas.current?.getBoundingClientRect();if(!r)return;
    const dx=(e.clientX-a.inicioX)/r.width*100,dy=(e.clientY-a.inicioY)/r.height*100;
    if(Math.abs(dx)+Math.abs(dy)<.05)return;
    if(!a.guardou){lembrar(a.antes);a.guardou=true;}
    const x=Math.max(0,Math.min(100-a.w,a.x+dx)),y=Math.max(0,Math.min(100-a.h,a.y+dy));
    const w=Math.max(.5,Math.min(100-a.x,a.w+dx)),h=Math.max(.5,Math.min(100-a.y,a.h+dy));
    atualizar(m=>({...m,elementos:m.elementos.map(v=>v.id!==a.id?v:a.redimensionar?{...v,w,h,...v.tipo==="texto"?{tamanho:Math.max(.5,Math.min(25,a.tamanho*Math.min(w/a.w,h/a.h)))}:{}}:{...v,x,y})}),false);
  }
  const atual = material.elementos.find(e => e.id === selecionado && e.tipo !== "marca");
  const numeroInput = (valor: string) => valor === "" ? null : Number(valor);
  const dimensoes = dimensoesReserva(material.formato);
  const registosAba = lista.filter(r => r.tipo === (aba === "modelos" ? "modelo" : "material"));

  return <section className={css.pagina} aria-label="Reservas e templates">
    <header className={css.intro}><span>RESERVAS</span><h1>Do orçamento à publicação.</h1><p>Carrega o orçamento, escolhe o teu modelo e ajusta o resultado com um clique.</p><button type="button" className={css.criarBase} disabled={!!ocupado} onClick={iniciarModeloBase}>Criar modelo do Canva</button></header>
    <div className={css.abas} role="tablist" aria-label="Reservas">{([['orcamento', 'Criar com orçamento'], ['criar', 'Editor de templates'], ['modelos', 'Os meus modelos'], ['historico', 'Histórico']] as const).map(([id, titulo]) => <button type="button" role="tab" aria-selected={aba === id} aria-controls="reservas-painel" key={id} disabled={!!ocupado} onClick={() => {setAba(id); if (id === "criar") setResultadoSimples(false);}}>{titulo}{(id === "modelos" || id === "historico") && <span>{lista.filter(r => r.tipo === (id === "modelos" ? "modelo" : "material")).length}</span>}</button>)}</div>
    <div aria-live="polite" className={css.mensagens}>{ocupado && <p role="status">{ocupado}</p>}{mensagem && <p className={css.sucesso}>{mensagem}</p>}{erro && <p role="alert" className={css.erro}>{erro}</p>}</div>
    <input ref={referenciaInput} className={css.inputOculto} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void carregarReferencia(e)} aria-label="Carregar referência" />
    <input ref={pdfInput} className={css.inputOculto} type="file" accept="application/pdf,.pdf" multiple onChange={e => void importarPDF(e)} aria-label="Importar orçamentos em PDF" />
    <input ref={fotoInput} className={css.inputOculto} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void carregarFoto(e)} aria-label="Carregar fotografia" />
    <input ref={baseInput} className={css.inputOculto} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void carregarBase(e)} aria-label="Carregar base fixa do Canva" />
    <input ref={guiaInput} className={css.inputOculto} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void carregarGuia(e)} aria-label="Carregar exemplo completo do Canva" />
    <div id="reservas-painel" role="tabpanel">
    <div hidden={aba !== "orcamento"}><CriarReservaOrcamento email={email} ia={ia} ocupado={ocupado} onOcupado={setOcupado} onGerar={receberTemplate} modelos={lista.filter(r=>r.tipo==="modelo"&&r.baseFixa)} modeloParaUsar={modeloParaUsar} onConfigurar={iniciarModeloBase} /></div>
    {aba === "orcamento" ? null : aba === "criar" ? <fieldset className={css.editorCompleto} disabled={!!ocupado}>
      {(modoBase||material.baseFixa)?<div className={css.iniciar} hidden={resultadoSimples}>
        <div><h2>O teu desenho do Canva · base fixa</h2><p>Carrega a versão sem os textos que mudam entre viagens. O fundo, as cores e a decoração ficam na imagem original. Os campos que colocares por cima recebem os dados do PDF.</p></div>
        <div className={css.acoes}><button type="button" className={css.primario} onClick={()=>baseInput.current?.click()}>{material.baseFixa?"Trocar base do Canva":"Carregar base do Canva"}</button><button type="button" onClick={iniciarModeloBase}>Novo modelo</button></div>
        <div className={css.linha}><Campo titulo="Nome do modelo ou material" valor={material.nome} alterar={v=>atualizar(m=>({...m,nome:v.slice(0,120)}))}/><div><strong>{material.formato==="story"?"Story · 1080 × 1920":"Feed · 1080 × 1350"}</strong><p>O formato é identificado na imagem. Exporta o PNG nestas dimensões, até 1,5 MB. Para outro formato, cria outro modelo.</p></div></div>
        {material.baseFixa&&<div className={css.referencia}><img src={material.baseFixa} alt="Base fixa do teu template"/><div><strong>1. Base carregada · 2. Posiciona os campos · 3. Guarda o modelo</strong><p>A versão completa do Canva pode servir de guia enquanto posicionas os campos. A guia fica fora da imagem exportada.</p><div className={css.acoes}><button type="button" onClick={()=>guiaInput.current?.click()}>{material.referencia?"Trocar exemplo completo":"Carregar exemplo completo · opcional"}</button>{material.referencia&&<button type="button" onClick={()=>{atualizar(m=>({...m,referencia:""}));setGuiaSobreposta(false);setCompararReferencia(false);}}>Remover guia</button>}</div></div></div>}
      </div>:<div className={css.iniciar} hidden={resultadoSimples}>
        <div><h2>1. Escolhe o desenho</h2><p>Carrega uma imagem do material final: PNG, JPG ou WebP. Os textos passam a campos editáveis.</p></div>
        <div className={css.acoes}><button className={css.primario} type="button" disabled={!ia} onClick={() => referenciaInput.current?.click()}>{material.referencia ? "Mudar referência" : "Carregar referência"}</button><button type="button" onClick={novo}>Começar de novo</button></div>
        <div className={css.linha}><Campo titulo="Nome do modelo ou material" valor={material.nome} alterar={v => atualizar(m => ({...m, nome: v.slice(0,120)}))} /><label className={css.campo}><span>Formato</span><select value={material.formato} onChange={e => atualizar(m => ({...m, formato: e.target.value as FormatoReserva}))}><option value="story">Story · 1080 × 1920</option><option value="feed">Feed · 1080 × 1350</option></select></label></div>
        {material.referencia && <div className={css.referencia}><img src={material.referencia} alt="A tua referência original" /><div><strong>Referência original</strong><p>Compara o resultado e ajusta os elementos. Se a foto da referência tiver texto por cima, carrega a fotografia original para evitar repetir textos antigos.</p><button type="button" disabled={!ia} onClick={() => void reanalisar()}>Reanalisar referência</button></div></div>}
        {!ia && <p className={css.nota}>A análise automática precisa de ser configurada. O editor manual, os modelos e a exportação continuam disponíveis.</p>}
      </div>}
      <div hidden={modoBase&&!material.baseFixa} className={`${css.workspace} ${resultadoSimples ? css.resultadoWorkspace : ""} ${material.baseFixa?css.workspaceBase:""}`}>
        <aside className={css.preview} aria-label="Pré-visualização do material"><div className={css.previewTopo}><strong>Pré-visualização</strong><span>{dimensoes.largura} × {dimensoes.altura}</span></div>
          {material.referencia && <button type="button" aria-pressed={compararReferencia} onClick={() => setCompararReferencia(v => !v)}>{compararReferencia ? "Ver template criado" : "Comparar com a referência"}</button>}
          {material.baseFixa&&material.referencia&&!resultadoSimples&&<button type="button" aria-pressed={guiaSobreposta} onClick={()=>{setGuiaSobreposta(v=>!v);setCompararReferencia(false);}}>{guiaSobreposta?"Esconder guia sobreposta":"Sobrepor guia para alinhar"}</button>}
          <div className={css.canvasWrap}><canvas ref={canvas} style={{display: compararReferencia && material.referencia ? "none" : undefined,touchAction:selecionado?"none":"pan-y"}} width={1080} height={dimensoes.altura} onPointerDown={selecionarCanvas} onPointerMove={moverCampo} onPointerUp={()=>{arrasto.current=null;}} onPointerCancel={()=>{arrasto.current=null;}} aria-label="Template editável. Clica num texto ou imagem para ajustar." />{compararReferencia && material.referencia && <img src={material.referencia} alt="Referência para comparar com o template criado" className={css.comparacao} />}{material.baseFixa&&material.referencia&&guiaSobreposta&&!resultadoSimples&&!compararReferencia&&<img className={css.guiaSobreposta} src={material.referencia} alt="Guia de alinhamento; não faz parte do PNG"/>}{atual && !compararReferencia && <div className={css.selecao} style={{left: `${atual.x}%`, top: `${atual.y}%`, width: `${atual.w}%`, height: `${atual.h}%`}}><button type="button" className={css.redimensionar} aria-label="Redimensionar elemento" title="Arrasta para redimensionar" onPointerDown={redimensionarCampo} onPointerMove={moverCampo} onPointerUp={()=>{arrasto.current=null;}} onPointerCancel={()=>{arrasto.current=null;}}/></div>}</div>
          {erroPreview && <p className={css.erro} role="alert">{erroPreview}</p>}
          <p className={css.nota}>{resultadoSimples ? "Clica num texto para mudar a letra ou o conteúdo. Revê o resultado e descarrega." : material.baseFixa?"Clica e arrasta os campos. Usa o canto para redimensionar. As linhas de seleção não aparecem no PNG.":"Clica num elemento da imagem ou escolhe-o na lista para editar. A marca iCliGo está protegida."}</p>
          {material.referencia && !material.baseFixa && !resultadoSimples && <p className={css.nota}>Os campos ainda vazios mostram exemplos da referência apenas nesta pré-visualização. O PNG usa os dados da tua viagem.</p>}
          <label className={css.confirmar}><input type="checkbox" checked={revisado} onChange={e => setRevisado(e.target.checked)} />Confirmei os dados, os preços e o desenho.</label>
          <button className={css.primario} type="button" disabled={!revisado || !!erroPreview} onClick={() => void exportar()}>Descarregar PNG</button>
          <div className={css.acoes}><button type="button" onClick={() => void guardar("material")}>Guardar no histórico</button><button type="button" onClick={() => void guardar("modelo")}>Guardar modelo</button></div>
          {material.baseFixa&&registo?.tipo==="modelo"&&!alterado&&<button type="button" onClick={()=>{setModeloParaUsar({id:registo.id,material:prepararModeloReserva(material)});setAba("orcamento");setMensagem("");}}>Usar este modelo com um orçamento</button>}
          <small>{alterado ? "Tens alterações por guardar." : registo ? "Guardado na tua conta." : "O teu material ainda não foi guardado."}</small>
        </aside>
        <div className={css.editorLateral}>
        <AjustesReserva material={material} selecionado={selecionado} selecionar={setSelecionado} alterar={elemento} dados={patch=>atualizar(m=>({...m,dados:{...m.dados,...patch}}))} foto={()=>{fotoDestino.current=selecionado;fotoInput.current?.click();}} desfazer={desfazer} podeDesfazer={podeDesfazer}/>
        {resultadoSimples&&<div className={css.cartao}><p className={css.nota}>O template já usa o orçamento confirmado. As alterações que fizeres aqui também atualizam o texto da publicação.</p><details className={css.servicosOrcamento}><summary>Texto para acompanhar a publicação</summary><p className={css.legendaPublicacao}>{legendaMaterialReserva(material)}</p><button type="button" onClick={()=>void executar("A copiar o texto…",async()=>{await navigator.clipboard.writeText(legendaMaterialReserva(material));setMensagem("Texto da publicação copiado.");})}>Copiar texto</button></details><button type="button" className={css.botaoTexto} onClick={()=>setAba("orcamento")}>Criar outro template com o orçamento</button></div>}
        <details className={css.avancados}><summary>Mais opções: dados, elementos e desenho</summary>
        <div className={`${css.formulario} ${material.baseFixa?css.formularioBase:""}`}>
          <article className={css.cartao}><div className={css.tituloLinha}><div><span className={css.passinho}>2</span><h2>Dados da viagem</h2></div><button type="button" disabled={!ia} onClick={() => pdfInput.current?.click()}>Importar PDF MyOffice</button></div>
            <p className={css.nota}>Podes importar uma ou várias propostas em PDF (até 4 MB cada) ou preencher tudo à mão. Confirma sempre os dados extraídos.</p>
            {avisos.length > 0 && <ul className={css.avisos}>{avisos.map((v,i) => <li key={i}>{v}</li>)}</ul>}
            {importadas.length > 0 && <div className={css.importadas}><strong>Opções importadas</strong>{importadas.map((p,i) => <div key={i}><p>{p.destino || `Proposta ${i+1}`} · {p.hoteis.length} {p.hoteis.length === 1 ? "hotel" : "hotéis"}</p>{Array.from({length: Math.ceil(p.hoteis.length / material.maxHoteis)}, (_, grupo) => <button type="button" key={grupo} onClick={() => aplicarProposta(p, grupo * material.maxHoteis)}>{p.hoteis.slice(grupo * material.maxHoteis, (grupo + 1) * material.maxHoteis).map(h => h.nome || "Hotel por confirmar").join(" + ")}</button>)}</div>)}</div>}
            <div className={css.grelha}><Campo titulo="Destino" valor={material.dados.destino} alterar={v => dados("destino", v)} /><Campo titulo="Cidade de partida" valor={material.dados.partida} alterar={v => dados("partida", v)} /><Campo titulo="Ida" tipo="date" valor={material.dados.ida} alterar={v => dados("ida",v)} /><Campo titulo="Regresso" tipo="date" valor={material.dados.regresso} alterar={v => dados("regresso",v)} /></div>
            <label className={css.campo}><span>Frase promocional</span><textarea rows={2} value={material.dados.frase} onChange={e => dados("frase",e.target.value)} /></label>
            <button type="button" disabled={!ia || !material.dados.destino.trim()} onClick={() => void executar("A sugerir uma frase…", async () => {const r = await pedir<{frase: string}>("frase", {destino: material.dados.destino}); dados("frase",r.frase);})}>Sugerir frase</button>
            <div className={css.grelha}><Campo titulo="Voo / horários" valor={material.dados.voo} alterar={v => dados("voo",v)} /><Campo titulo="Viajantes incluídos no total" tipo="number" valor={material.dados.viajantes} alterar={v => dados("viajantes",numeroInput(v))} /><Campo titulo="Bagagem" valor={material.dados.bagagem} alterar={v => dados("bagagem",v)} /><Campo titulo="Transfer" valor={material.dados.transfer} alterar={v => dados("transfer",v)} /></div>
            <p className={css.nota}>A referência tem espaço para {material.maxHoteis} {material.maxHoteis === 1 ? "hotel" : "hotéis"}. Se houver crianças ou preços diferentes por viajante, confirma e ajusta o preço por pessoa.</p>
            {material.dados.hoteis.map((h,i) => <div className={css.hotel} key={i}><h3>{material.maxHoteis > 1 ? `Opção ${i+1}` : "Hotel"}</h3><Campo titulo="Nome do hotel" valor={h.nome} alterar={v => hotel(i,"nome",v)} /><div className={css.grelha}><Campo titulo="Quarto" valor={h.quarto} alterar={v => hotel(i,"quarto",v)} /><Campo titulo="Regime alimentar" valor={h.regime} alterar={v => hotel(i,"regime",v)} /><Campo titulo="Total desta opção (€)" tipo="number" valor={h.total} alterar={v => hotel(i,"total",numeroInput(v))} /><Campo titulo="Preço por pessoa (€) · opcional" tipo="number" valor={h.precoPessoa} alterar={v => hotel(i,"precoPessoa",numeroInput(v))} /></div><p className={css.preco}>Por pessoa <strong>{precoPessoaReserva(material.dados,h)?.toLocaleString("pt-PT", {style:"currency", currency:"EUR"}) ?? "Por confirmar"}</strong><small>{h.precoPessoa !== null ? "Valor indicado manualmente ou no PDF" : "Total ÷ viajantes, quando ambos estão preenchidos"}</small></p></div>)}
            <label className={css.campo}><span>Condições / notas a mostrar</span><textarea rows={2} value={material.dados.condicoes} onChange={e => dados("condicoes",e.target.value)} /></label>
          </article>
          <article className={css.cartao}><div className={css.tituloLinha}><div><span className={css.passinho}>3</span><h2>Fotografia</h2></div><button type="button" onClick={() => {fotoDestino.current = atual?.tipo === "foto" ? atual.id : null; fotoInput.current?.click();}}>Carregar fotografia</button></div>
            <Campo titulo="Destino ou termo para procurar" valor={termoFoto || material.dados.destino} alterar={setTermoFoto} /><button type="button" disabled={!material.dados.destino && !termoFoto} onClick={() => void sugerirFoto()}>Sugerir fotografias</button>
            <p className={css.nota}>A fotografia aplica-se ao espaço selecionado ou à primeira fotografia do desenho. As sugestões são de domínio público; os créditos acompanham o PNG.</p>
            {fotografias.length > 0 && <div className={css.fotos}>{fotografias.map(f => <div key={f.url}><img src={f.url} alt={f.titulo} loading="lazy" /><small>{f.credito}</small><a href={f.origem} target="_blank" rel="noopener noreferrer">Ver origem</a><button type="button" onClick={() => void usarFoto(f)}>Usar fotografia</button></div>)}</div>}
          </article>
          <article className={css.cartao}><div className={css.tituloLinha}><div><span className={css.passinho}>4</span><h2>Ajustar o desenho</h2></div></div>
            {material.baseFixa&&<><p className={css.nota}>Escolhe o campo, arrasta-o na imagem e ajusta as medidas. Ao guardar, as posições ficam iguais para os próximos orçamentos.</p><label className={css.campo}><span>Adicionar campo do orçamento</span><select value="" disabled={material.elementos.length>=79} onChange={e=>{if(e.target.value)adicionarCampo(e.target.value as CampoReserva);}}><option value="">Escolher campo…</option>{CAMPOS_RESERVA.filter(c=>c!=="livre").map(c=><option key={c} value={c}>{CAMPOS[c]}</option>)}</select></label><label className={css.confirmar}><input type="checkbox" checked={!!material.baseSobreFotos} onChange={e=>atualizar(m=>({...m,baseSobreFotos:e.target.checked}))}/>A base tem áreas transparentes: colocar as fotografias por trás da base.</label><p className={css.nota}>Usa “+ Fotografia” se a imagem do destino deve mudar. Uma fotografia incluída na própria base mantém-se fixa.</p></>}
            <div className={css.cores}><label className={css.campo}><span>Fundo</span><input type="color" value={material.fundo} onChange={e => atualizar(m => ({...m, fundo:e.target.value}))} /></label><label className={css.campo}><span>Fim do degradé</span><input type="color" value={material.fundoFinal} onChange={e => atualizar(m => ({...m, fundoFinal:e.target.value}))} /></label></div>
            <label className={css.campo}><span>Elemento a editar</span><select value={selecionado ?? ""} onChange={e => setSelecionado(e.target.value || null)}><option value="">Escolhe um elemento</option>{material.elementos.filter(e => e.tipo !== "marca").map(e => <option key={e.id} value={e.id}>{e.nome} · {e.tipo}</option>)}</select></label>
            <div className={css.acoes}><button type="button" disabled={material.elementos.length >= 79} onClick={() => adicionar("texto")}>+ Texto</button><button type="button" disabled={material.elementos.length >= 79} onClick={() => adicionar("forma")}>+ Forma</button><button type="button" disabled={material.elementos.length >= 79} onClick={() => adicionar("foto")}>+ Fotografia</button></div>
            {atual && <div className={css.elementoEditor}><Campo titulo="Nome do elemento" valor={atual.nome} alterar={v => elemento({nome:v})} />
              {atual.tipo === "texto" && <><label className={css.campo}><span>Conteúdo</span><select value={atual.campo} onChange={e => elemento({campo: e.target.value as CampoReserva})}>{CAMPOS_RESERVA.map(c => <option key={c} value={c}>{CAMPOS[c]}</option>)}</select></label>{atual.campo === "livre" ? <label className={css.campo}><span>Texto</span><textarea rows={2} value={atual.texto} onChange={e => elemento({texto:e.target.value})} /></label> : <p className={css.nota}>Este elemento usa o campo “{CAMPOS[atual.campo]}” dos dados da viagem. Altera esse campo acima para atualizar a imagem.</p>}
              {atual.campo !== "livre" && <div className={css.grelha}><Campo titulo="Texto antes do valor" valor={atual.prefixo ?? ""} alterar={v => elemento({prefixo:v})} /><Campo titulo="Texto depois do valor" valor={atual.sufixo ?? ""} alterar={v => elemento({sufixo:v})} /></div>}
              {["hotel","quarto","regime","preco","total"].includes(atual.campo) && material.maxHoteis > 1 && <label className={css.campo}><span>Opção de hotel</span><select value={atual.hotel} onChange={e => elemento({hotel:Number(e.target.value)})}>{Array.from({length: material.maxHoteis}, (_,i) => <option value={i} key={i}>Opção {i+1}</option>)}</select></label>}
              <div className={css.grelha}><Campo titulo="Tamanho do texto (% da largura)" tipo="number" valor={atual.tamanho} alterar={v => elemento({tamanho:Math.max(.5,Math.min(25,Number(v)))})} /><label className={css.campo}><span>Fonte</span><select value={atual.fonte} onChange={e => elemento({fonte:e.target.value as ElementoReserva["fonte"]})}>{FONTES_RESERVA.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label><label className={css.campo}><span>Alinhamento</span><select value={atual.alinhar} onChange={e => elemento({alinhar:e.target.value as ElementoReserva["alinhar"]})}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><label className={css.confirmar}><input type="checkbox" checked={atual.negrito} onChange={e => elemento({negrito:e.target.checked})} />Negrito</label></div></>}
              {atual.tipo === "texto" && <label className={css.confirmar}><input type="checkbox" checked={atual.capitalizacao === "maiusculas"} onChange={e => elemento({capitalizacao:e.target.checked?"maiusculas":"normal"})} />Mostrar em maiúsculas</label>}
              {atual.tipo === "texto" && <><label className={css.campo}><span>Alinhamento vertical</span><select value={atual.vertical ?? "middle"} onChange={e => elemento({vertical:e.target.value as ElementoReserva["vertical"]})}><option value="top">Topo</option><option value="middle">Centro</option><option value="bottom">Base</option></select></label><label className={css.confirmar}><input type="checkbox" checked={!!atual.sombra} onChange={e => elemento({sombra:e.target.checked})} />Sombra no texto</label></>}
              {(atual.tipo === "texto" || atual.tipo === "forma" || atual.icone) && <label className={css.campo}><span>Cor do elemento</span><input type="color" value={atual.cor} onChange={e => elemento({cor:e.target.value})} /></label>}
              {atual.tipo === "grafico" && <label className={css.campo}><span>Ícone editável</span><select value={atual.icone ?? ""} onChange={e => elemento({icone: e.target.value ? e.target.value as ElementoReserva["icone"] : undefined})}><option value="">Usar imagem / recorte</option>{ICONES_RESERVA.map(i => <option key={i} value={i}>{i === "aviao" ? "Avião" : i === "refeicao" ? "Refeição" : i === "calendario" ? "Calendário" : i === "ligacao" ? "Ligação" : i.charAt(0).toUpperCase()+i.slice(1)}</option>)}</select></label>}
              <div className={css.grelha}>{([['x','Posição horizontal (%)'],['y','Posição vertical (%)'],['w','Largura (%)'],['h','Altura (%)']] as const).map(([chave,titulo]) => <Campo key={chave} titulo={titulo} tipo="number" valor={atual[chave]} alterar={v => elemento({[chave]: Math.max(chave === "w" || chave === "h" ? .5 : 0,Math.min(chave === "x" || chave === "y" ? 99 : 100,Number(v)))})} />)}<Campo titulo="Opacidade (0 a 1)" tipo="number" valor={atual.opacidade} alterar={v => elemento({opacidade:Math.max(0,Math.min(1,Number(v)))})} /><Campo titulo="Cantos arredondados (%)" tipo="number" valor={atual.raio} alterar={v => elemento({raio:Math.max(0,Math.min(50,Number(v)))})} /></div>
              {atual.tipo === "forma" && <label className={css.campo}><span>Forma</span><select value={atual.figura} onChange={e => elemento({figura:e.target.value as ElementoReserva["figura"]})}><option value="retangulo">Retângulo</option><option value="elipse">Elipse</option></select></label>}
              {atual.tipo === "forma" && <><label className={css.confirmar}><input type="checkbox" checked={!!atual.corFinal} onChange={e => elemento({corFinal:e.target.checked?atual.cor:undefined,opacidadeFinal:e.target.checked?1:undefined})} />Degradé na forma</label>{atual.corFinal && <div className={css.grelha}><label className={css.campo}><span>Cor no fim do degradé</span><input type="color" value={atual.corFinal} onChange={e => elemento({corFinal:e.target.value})} /></label><Campo titulo="Opacidade no fim do degradé" tipo="number" valor={atual.opacidadeFinal ?? 1} alterar={v => elemento({opacidadeFinal:Math.max(0,Math.min(1,Number(v)))})} /></div>}</>}
              {(atual.tipo === "foto" || atual.tipo === "grafico") && <button type="button" onClick={() => {fotoDestino.current=atual.id; fotoInput.current?.click();}}>{atual.tipo === "foto" ? "Substituir esta fotografia" : "Substituir este gráfico"}</button>}
              {atual.recorte && !atual.imagem && <details><summary>Recorte da referência</summary><div className={css.grelha}>{([['x','Início horizontal (%)'],['y','Início vertical (%)'],['w','Largura do recorte (%)'],['h','Altura do recorte (%)']] as const).map(([chave,titulo]) => <Campo key={chave} titulo={titulo} tipo="number" valor={atual.recorte![chave]} alterar={v => elemento({recorte:{...atual.recorte!,[chave]:Math.max(chave==='w'||chave==='h'?.5:0,Math.min(chave==='x'||chave==='y'?99:100,Number(v)))}})} />)}</div></details>}
              <div className={css.acoes}><button type="button" onClick={() => atualizar(m => {const es=m.elementos.filter(e=>e.id!==atual.id&&e.tipo!=="marca");return {...m,elementos:[atual,...es,...m.elementos.filter(e=>e.tipo==="marca")]};})}>Enviar para trás</button><button type="button" onClick={() => atualizar(m => ({...m,elementos:[...m.elementos.filter(e=>e.id!==atual.id&&e.tipo!=="marca"),atual,...m.elementos.filter(e=>e.tipo==="marca")]}))}>Trazer para a frente</button><button type="button" className={css.remover} onClick={() => {atualizar(m=>({...m,elementos:m.elementos.filter(e=>e.id!==atual.id)}));setSelecionado(null);}}>Remover elemento</button></div>
            </div>}
            <p className={css.marcaProtegida}>🔒 Logótipo e nome iCliGo protegidos. A identidade da marca acompanha todos os materiais.</p>
            {material.baseFixa&&<details><summary>Posicionar a marca protegida</summary><p className={css.nota}>A plataforma aplica a marca iCliGo. Posiciona-a no local reservado no teu desenho.</p><div className={css.grelha}>{([['x','Marca: posição horizontal (%)'],['y','Marca: posição vertical (%)'],['w','Marca: largura (%)'],['h','Marca: altura (%)']] as const).map(([chave,titulo])=><Campo key={chave} titulo={titulo} tipo="number" valor={material.elementos.find(e=>e.tipo==="marca")![chave]} alterar={v=>atualizar(m=>({...m,elementos:m.elementos.map(e=>{if(e.tipo!=="marca")return e;const n={...e,[chave]:Math.max(chave==="x"||chave==="y"?0:.5,Math.min(chave==="x"||chave==="y"?99:100,Number(v)))};return {...n,w:Math.min(n.w,100-n.x),h:Math.min(n.h,100-n.y)};})}))}/>)}</div></details>}
            <label className={css.campo}><span>Apresentação da marca</span><select value={material.marcaEstilo ?? "cartao"} onChange={e => atualizar(m => ({...m,marcaEstilo:e.target.value as MaterialReserva["marcaEstilo"]}))}><option value="cartao">Sobre cartão branco</option><option value="clara">Clara · fundo transparente</option><option value="escura">Escura · fundo transparente</option></select></label>
          </article>
        </div></details></div>
      </div>
    </fieldset> : <div className={css.biblioteca}><div className={css.tituloLinha}><h2>{aba === "modelos" ? "Os teus modelos reutilizáveis" : "Os teus materiais guardados"}</h2>{aba === "historico" && registosAba.length > 0 && <button type="button" disabled={!!ocupado} onClick={() => void exportarHistorico()}>Descarregar todos (.zip)</button>}</div><p>Estes registos pertencem à tua conta. Podes voltar ao editor sem perder o material que estás a preparar.</p>
      {!carregado ? <p>A carregar…</p> : !registosAba.length ? <div className={css.vazio}><strong>{aba === "modelos" ? "Ainda não guardaste modelos." : "Ainda não guardaste materiais."}</strong><p>Cria o teu primeiro desenho e guarda-o para o voltar a usar.</p><button type="button" onClick={() => setAba("criar")}>Ir para o editor</button></div> : <div className={css.lista}>{registosAba.map(item => <article key={item.id}><div className={css.formatoIcone}>{item.formato === "story" ? "9:16" : "4:5"}</div><div><h3>{item.nome}</h3><p>{item.formato === "story" ? "Story" : "Feed"} · {new Date(item.atualizadoEm).toLocaleString("pt-PT")}</p></div><div className={css.acoes}>{aba === "modelos" && <button className={css.primario} disabled={!!ocupado} type="button" onClick={() => void abrir(item,"usar")}>Usar modelo</button>}<button disabled={!!ocupado} type="button" onClick={() => void abrir(item,"editar")}>Editar</button><button disabled={!!ocupado} type="button" onClick={() => void abrir(item,"duplicar")}>Duplicar</button><button className={css.remover} disabled={!!ocupado} type="button" onClick={() => {if (window.confirm(`Apagar “${item.nome}” da tua conta?`)) void executar("A apagar…",async()=>{await pedir("apagar",{id:item.id});if(registo?.id===item.id){setRegisto(null);setAlterado(true);}await carregarLista();});}}>Apagar</button></div></article>)}</div>}
    </div>}
    </div>
  </section>;
}
