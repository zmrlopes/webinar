"use client";

import {useEffect, useRef, useState, type ChangeEvent} from "react";
import {dadosReservaVazios, precoPessoaReserva, validarDadosReserva, validarMaterialReserva, type DadosReserva, type FormatoReserva, type MaterialReserva, type ResumoReserva} from "@/lib/reservas";
import {comprimirImagemReserva} from "@/lib/reservas-canvas";
import {comporModeloReserva, preencherReferenciaReserva, ESTILOS_RESERVA, type EstiloReserva, type FotografiaModeloReserva} from "@/lib/reservas-modelos";
import css from "./reservas.module.css";

const API = "/api/consultor/nova-area/reservas";
const euros = (n: number | null) => n === null ? "Por confirmar" : `${new Intl.NumberFormat("pt-PT",{maximumFractionDigits:2}).format(n)} €`;
type Foto = {titulo: string; url: string; credito: string; origem: string};
type ModeloGuardado = {id:string;material:MaterialReserva};
export function CriarReservaOrcamento({email,ia,ocupado,onOcupado,onGerar,modelos,modeloParaUsar,onConfigurar}: {email:string;ia:boolean;ocupado:string;onOcupado:(v:string)=>void;onGerar:(m:MaterialReserva)=>void;modelos:ResumoReserva[];modeloParaUsar:ModeloGuardado|null;onConfigurar:()=>void}) {
  const [passo,setPasso] = useState<1|2|3>(1);
  const [dados,setDados] = useState<DadosReserva>(()=>({...dadosReservaVazios(),condicoes:""}));
  const [propostas,setPropostas] = useState<DadosReserva[]>([]), [proposta,setProposta] = useState(0), [hotel,setHotel] = useState(0);
  const [ficheiros,setFicheiros] = useState<string[]>([]), [avisos,setAvisos] = useState<string[]>([]), [erro,setErro] = useState("");
  const [manual,setManual] = useState(false), [confirmado,setConfirmado] = useState(false);
  const [formato,setFormato] = useState<FormatoReserva>("story"), [estilo,setEstilo] = useState<EstiloReserva>("elegante");
  const [foto,setFoto] = useState<FotografiaModeloReserva | null>(null);
  const [desenho,setDesenho] = useState<"guardado"|"referencia"|"modelo">("guardado");
  const [modeloGuardado,setModeloGuardado] = useState<ModeloGuardado|null>(null);
  useEffect(()=>{if(modeloParaUsar){setModeloGuardado(structuredClone(modeloParaUsar));setFormato(modeloParaUsar.material.formato);setDesenho("guardado");setPasso(p=>p===3?2:p);}},[modeloParaUsar]);
  const [referencia,setReferencia] = useState<{imagem:string;nome:string}|null>(null);
  const [analise,setAnalise] = useState<{imagem:string;formato:FormatoReserva;material:MaterialReserva}|null>(null);
  const pdfInput = useRef<HTMLInputElement>(null), fotoInput = useRef<HTMLInputElement>(null), referenciaInput = useRef<HTMLInputElement>(null);
  const preco = dados.hoteis[hotel] ? precoPessoaReserva(dados,dados.hoteis[hotel]!) : null;
  async function pedir<T>(acao:string,extra:Record<string,unknown>):Promise<T> {
    const r = await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,acao,...extra})});
    const c = await r.json(); if (!r.ok) throw new Error(c.erro || "Não foi possível concluir o pedido."); return c;
  }
  async function fazer(titulo:string,acao:()=>Promise<void>) {
    if (ocupado) return; setErro(""); onOcupado(titulo);
    try {await acao();} catch(e) {setErro(e instanceof Error?e.message:"Não foi possível concluir.");} finally {onOcupado("");}
  }
  function alterar<K extends keyof DadosReserva>(campo:K,valor:DadosReserva[K]) {setDados(d=>({...d,[campo]:valor}));setConfirmado(false);if(campo==="destino"&&foto?.origem)setFoto(null);}
  function selecionarProposta(i:number) {
    setPropostas(ps=>ps.map((p,n)=>n===proposta?structuredClone(dados):p));
    setProposta(i);setDados(structuredClone(propostas[i]!));setHotel(0);setConfirmado(false);setFoto(null);
  }
  function alterarHotel(campo:"nome"|"regime"|"quarto"|"total"|"precoPessoa",valor:string) {
    alterar("hoteis",dados.hoteis.map((h,i)=>i===hotel?{...h,[campo]:campo==="total"||campo==="precoPessoa"?valor===""?null:Number(valor):valor}:h));
  }
  async function importar(e:ChangeEvent<HTMLInputElement>) {
    const fs=Array.from(e.target.files??[]);e.target.value="";if(!fs.length)return;
    await fazer("A ler o orçamento…",async()=>{
      if(fs.length>6)throw new Error("Carrega até seis PDFs de cada vez.");
      const ps:DadosReserva[]=[],as:string[]=[],nomes:string[]=[];
      for(const f of fs) {
        if(f.size>4_000_000){as.push(`${f.name}: o PDF deve ter até 4 MB.`);continue;}
        const form=new FormData();form.set("email",email);form.set("ficheiro",f);
        try {const r=await fetch(API,{method:"POST",body:form}),c=await r.json();if(!r.ok)throw new Error(c.erro);const novas=(c.propostas as unknown[]).map(validarDadosReserva);ps.push(...novas);as.push(...(Array.isArray(c.avisos)?c.avisos.filter((v:unknown)=>typeof v==="string"):[]));if(novas.length)nomes.push(f.name);}
        catch(ex){as.push(`${f.name}: ${ex instanceof Error?ex.message:"Não foi possível ler."}`);}
      }
      setAvisos(as);if(!ps.length)throw new Error(as.join(" ")||"Não foram encontradas propostas neste PDF.");
      setPropostas(ps);setProposta(0);setHotel(0);setDados(structuredClone(ps[0]!));setFicheiros(nomes);setConfirmado(false);setFoto(null);setPasso(1);
    });
  }
  function continuar() {
    setErro("");
    try {validarDadosReserva(dados);if(!dados.destino.trim())throw new Error("Confirma o destino da viagem.");if(preco===null)throw new Error("Confirma o preço por pessoa, ou o total e o número de viajantes.");if(!confirmado)throw new Error("Confirma os dados do orçamento para continuar.");setPasso(2);}catch(e){setErro(e instanceof Error?e.message:"Revê os dados.");}
  }
  async function carregarFoto(e:ChangeEvent<HTMLInputElement>) {const f=e.target.files?.[0];e.target.value="";if(f)await fazer("A preparar a fotografia…",async()=>setFoto({imagem:await comprimirImagemReserva(f)}));}
  async function carregarReferencia(e:ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0];e.target.value="";if(!f)return;
    await fazer("A preparar a tua referência…",async()=>{const imagem=await comprimirImagemReserva(f);setReferencia({imagem,nome:f.name});setAnalise(null);setDesenho("referencia");});
  }
  async function escolherModelo(id:string) {
    setModeloGuardado(null);
    if(!id)return;
    await fazer("A abrir o teu modelo…",async()=>{
      const r=await pedir<{material:MaterialReserva}>("abrir",{id});
      const material=validarMaterialReserva(r.material);
      if(!material.baseFixa)throw new Error("Escolhe um modelo com base fixa.");
      setModeloGuardado({id,material});setFormato(material.formato);setFoto(null);
    });
  }
  function continuarDesenho() {
    setErro("");
    if(desenho==="guardado"&&(!modeloGuardado||!modelos.some(m=>m.id===modeloGuardado.id))){setErro("Escolhe o teu modelo guardado ou cria um modelo do Canva para continuar.");return;}
    if(desenho==="referencia"&&!referencia){setErro("Carrega a tua referência para continuar ou escolhe um dos modelos disponíveis.");return;}
    setPasso(3);
  }
  async function gerar() {
    await fazer("A compor o teu template…",async()=>{
      const d=validarDadosReserva(dados);if(!confirmado||preco===null)throw new Error("Volta ao orçamento e confirma os dados e o preço.");
      let modelo:MaterialReserva|null=null;
      if(desenho==="guardado") {
        if(!modeloGuardado||!modelos.some(m=>m.id===modeloGuardado.id))throw new Error("Volta ao passo 2 e escolhe o teu modelo.");
        modelo=structuredClone(modeloGuardado.material);
      }
      if(desenho==="referencia") {
        if(!referencia)throw new Error("Volta ao passo 2 e carrega a tua referência.");
        if(analise?.imagem===referencia.imagem&&analise.formato===formato)modelo=analise.material;
        else {
          onOcupado("A adaptar a tua referência ao template…");
          const r=await pedir<{material:MaterialReserva}>("referencia",{referencia:referencia.imagem,formato});
          modelo=validarMaterialReserva(r.material);setAnalise({imagem:referencia.imagem,formato,material:modelo});
        }
      }
      onOcupado("A compor o teu template…");
      let imagem=foto;
      if(!imagem&&(!modelo||modelo.elementos.some(e=>e.tipo==="foto"))) {
        const r=await pedir<{fotografias:Foto[]}>("fotografias",{destino:d.destino});
        const paisagens=r.fotografias.filter(f=>!/(?:map|flag|coat.of.arms|logo|locator|diagram|satellite|insect|butterfly|coin|stamp|seal|bird)/i.test(f.titulo));
        for(const f of paisagens.slice(0,3)) {try {const v=await pedir<{imagem:string}>("usar-foto",{url:f.url});imagem={imagem:v.imagem,credito:f.credito,origem:f.origem};break;}catch{/* Tenta outra fotografia disponível. */}}
        if(!imagem)throw new Error("Não foi possível escolher uma fotografia automaticamente. Volta ao passo 2 e carrega uma fotografia tua.");
        setFoto(imagem);
      }
      onGerar(modelo?preencherReferenciaReserva(modelo,d,hotel,imagem):comporModeloReserva(d,formato,estilo,imagem!,hotel));
    });
  }
  function campo(titulo:string,chave:"destino"|"partida"|"ida"|"regresso"|"bagagem"|"transfer",tipo="text") {return <label className={css.campo}><span>{titulo}</span><input type={tipo} value={dados[chave]} onChange={e=>alterar(chave,e.target.value)} /></label>;}
  const h=dados.hoteis[hotel]!;
  return <div className={css.assistente}>
    <ol className={css.passos} aria-label="Criar template a partir de orçamento">{["Orçamento","Formato e referência","Texto e gerar"].map((nome,i)=><li key={nome} aria-current={passo===i+1?"step":undefined} data-completo={passo>i+1}><span>{i+1}</span><strong>{nome}</strong></li>)}</ol>
    {erro&&<p role="alert" className={css.erro}>{erro}</p>}
    <fieldset disabled={!!ocupado} className={css.editorCompleto}>
      <input ref={pdfInput} className={css.inputOculto} type="file" accept="application/pdf,.pdf" multiple onChange={e=>void importar(e)} aria-label="Orçamentos PDF para gerar template" />
      <input ref={fotoInput} className={css.inputOculto} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void carregarFoto(e)} aria-label="Fotografia do novo template" />
      <input ref={referenciaInput} className={css.inputOculto} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void carregarReferencia(e)} aria-label="Referência para o desenho do novo template" />
      {passo===1&&<div className={css.cartao}>
        <h2>Qual é a viagem que queres divulgar?</h2><p className={css.nota}>Carrega o orçamento do MyOffice ou de outro fornecedor. Os dados da viagem preenchem o template.</p>
        <div className={css.uploadOrcamento}><span className={css.documentoIcone} aria-hidden="true">↥</span><div><strong>Começa pelo orçamento</strong><p>PDF até 4 MB · podes carregar várias propostas</p></div><button type="button" className={css.primario} disabled={!ia} onClick={()=>pdfInput.current?.click()}>{ficheiros.length?"Carregar outro orçamento":"Carregar orçamento PDF"}</button></div>
        {!ia&&<p className={css.nota}>A leitura automática ainda não está configurada. Podes preencher os dados manualmente.</p>}
        {ficheiros.length>0&&<p className={css.ficheiroImportado}>✓ {ficheiros.join(" · ")}</p>}
        {avisos.length>0&&<ul className={css.avisos}>{avisos.map((a,i)=><li key={i}>{a}</li>)}</ul>}
        {propostas.length>1&&<label className={css.campo}><span>Proposta a divulgar</span><select value={proposta} onChange={e=>selecionarProposta(Number(e.target.value))}>{propostas.map((p,i)=><option value={i} key={i}>{p.destino||`Proposta ${i+1}`} · {p.ida||"Data por confirmar"}</option>)}</select></label>}
        {!(propostas.length||manual)?<button type="button" className={css.botaoTexto} onClick={()=>setManual(true)}>Preencher os dados manualmente</button>:<>
          <div className={css.grelha}>{campo("Destino","destino")}{campo("Cidade de partida","partida")}{campo("Ida","ida","date")}{campo("Regresso","regresso","date")}</div>
          <label className={css.campo}><span>Viajantes incluídos no total</span><input type="number" min={1} max={100} value={dados.viajantes??""} onChange={e=>alterar("viajantes",e.target.value===""?null:Number(e.target.value))}/></label>
          {dados.hoteis.length>1&&<label className={css.campo}><span>Hotel a divulgar neste template</span><select value={hotel} onChange={e=>{setHotel(Number(e.target.value));setConfirmado(false);}}>{dados.hoteis.map((v,i)=><option value={i} key={i}>{v.nome||`Hotel ${i+1}`} · {euros(precoPessoaReserva(dados,v))}</option>)}</select></label>}
          <div className={css.hotel}><h3>Hotel e preço da proposta</h3><div className={css.grelha}>{([['nome','Nome do hotel'],['regime','Regime alimentar'],['total','Total desta opção (€)'],['precoPessoa','Preço por pessoa (€) · opcional']] as const).map(([key,nome])=><label key={key} className={css.campo}><span>{nome}</span><input type={key==="total"||key==="precoPessoa"?"number":"text"} min={0} step="any" value={h[key]??""} onChange={e=>alterarHotel(key,e.target.value)} /></label>)}</div><p className={css.preco}>Por pessoa <strong>{euros(preco)}</strong><small>O preço explícito por pessoa prevalece. O total só é dividido pelo número de viajantes confirmado.</small></p></div>
          <details className={css.servicosOrcamento}><summary>Ver serviços e condições extraídos</summary><div className={css.grelha}>{campo("Bagagem","bagagem")}{campo("Transfer","transfer")}</div><label className={css.campo}><span>Condições / notas a mostrar</span><textarea value={dados.condicoes} rows={3} onChange={e=>alterar("condicoes",e.target.value)} /></label></details>
          <label className={css.confirmar}><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/>Confirmei as datas, os viajantes, os preços e os serviços do orçamento.</label>
          <div className={css.rodapePasso}><span>As restantes propostas e hotéis continuam disponíveis nesta seleção.</span><button type="button" className={css.primario} onClick={continuar}>Continuar →</button></div>
        </>}
      </div>}
      {passo===2&&<div className={css.cartao}><h2>Qual é o teu modelo?</h2><p className={css.nota}>Escolhe o teu template do Canva. O fundo e as posições dos campos mantêm-se; os dados vêm do orçamento.</p>
        <div className={css.escolhasFormato}>{([['story','Story','1080 × 1920 · vertical'],['feed','Publicação','1080 × 1350 · feed']] as const).map(([id,nome,desc])=><button key={id} type="button" aria-pressed={formato===id} disabled={desenho==="guardado"} onClick={()=>setFormato(id)}><span className={id==="story"?css.formatoStory:css.formatoFeed} aria-hidden="true"/><strong>{nome}</strong><small>{desc}</small></button>)}</div>
        <div className={css.acoes}><button type="button" aria-pressed={desenho==="guardado"} onClick={()=>{setDesenho("guardado");if(modeloGuardado)setFormato(modeloGuardado.material.formato);setErro("");}}>O meu template do Canva</button><button type="button" aria-pressed={desenho==="referencia"} onClick={()=>{setDesenho("referencia");setErro("");}}>A minha referência</button><button type="button" aria-pressed={desenho==="modelo"} onClick={()=>{setDesenho("modelo");setErro("");}}>Modelos disponíveis</button></div>
        {desenho==="guardado"?<div className={css.referenciaOrcamento}>
          {modeloGuardado&&<img src={modeloGuardado.material.baseFixa} alt="Base fixa do modelo escolhido"/>}
          <div><h3>Os meus modelos do Canva</h3>{modelos.length>0?<label className={css.campo}><span>Modelo guardado</span><select value={modeloGuardado?.id??""} onChange={e=>void escolherModelo(e.target.value)}><option value="">Escolher modelo…</option>{modelos.map(m=><option key={m.id} value={m.id}>{m.nome} · {m.formato==="story"?"Story":"Publicação"}</option>)}</select></label>:<p className={css.nota}>Cria o teu primeiro modelo: carrega a base do Canva, posiciona os campos e guarda. Só precisas de o configurar uma vez.</p>}
          <p className={css.nota}>O formato é o do modelo guardado. A imagem de fundo é preservada sem reconstrução por IA.</p><button type="button" onClick={onConfigurar}>Criar modelo do Canva</button></div>
        </div>:desenho==="referencia"?<div className={css.referenciaOrcamento}>
          {referencia&&<img src={referencia.imagem} alt="A tua referência para o desenho do template"/>}
          <div><h3>{referencia?"Referência escolhida":"Carrega o desenho que queres seguir"}</h3><p className={css.nota}>{referencia?referencia.nome:"PNG, JPG ou WebP · até 15 MB. Usa uma imagem do material final, por exemplo uma exportação do Canva."}</p><div className={css.acoes}><button type="button" className={css.primario} disabled={!ia} onClick={()=>referenciaInput.current?.click()}>{referencia?"Mudar a minha referência":"Carregar a minha referência"}</button>{referencia&&<button type="button" onClick={()=>{setReferencia(null);setAnalise(null);}}>Remover referência</button>}</div><p className={css.nota}>Esta opção reconstrói a imagem com IA e pode alterar o desenho. Para preservar o fundo, usa o teu template do Canva. Os preços, datas e hotéis vêm do orçamento. Podes comparar com a imagem original e ajustar o resultado no editor.</p>{!ia&&<p className={css.nota}>A análise de referências ainda não está configurada. Podes usar os modelos disponíveis.</p>}</div>
        </div>:<><h3 className={css.subtituloPasso}>Estilo do template</h3><div className={css.estilosModelo}>{ESTILOS_RESERVA.map(e=><button key={e.id} type="button" aria-pressed={estilo===e.id} onClick={()=>setEstilo(e.id)}><span className={e.id==="elegante"?css.amostraElegante:css.amostraFotografica} aria-hidden="true"><i/><b>O teu destino</b><em>desde 1.250 €</em></span><strong>{e.nome}</strong><small>{e.descricao}</small></button>)}</div><p className={css.nota}>As miniaturas ilustram o estilo. O resultado utiliza os preços e dados do teu orçamento.</p></>}
        {(desenho!=="guardado"||modeloGuardado?.material.elementos.some(e=>e.tipo==="foto"))&&<div className={css.fotoOrcamento}>{foto&&<img src={foto.imagem} alt="Fotografia escolhida para o template"/>}<div><strong>Fotografia do destino</strong><p className={css.nota}>{foto?"Esta fotografia será usada no template.":"Escolhemos uma fotografia do destino automaticamente. Também podes usar uma fotografia tua."}</p><button type="button" onClick={()=>fotoInput.current?.click()}>{foto?"Mudar fotografia":"Carregar a minha fotografia"}</button></div></div>}
        <div className={css.rodapePasso}><button type="button" onClick={()=>{setPasso(1);setErro("");}}>← Orçamento</button><button type="button" className={css.primario} onClick={continuarDesenho}>Continuar →</button></div>
      </div>}
      {passo===3&&<div className={css.cartao}><h2>Prepara o texto e gera o teu template.</h2><p className={css.nota}>O destino, as datas, o hotel e o preço já vêm do orçamento. Podes acrescentar uma frase de destaque.</p>
        <div className={css.resumoOrcamento}><div><span>DESTINO</span><strong>{dados.destino}</strong><small>{h.nome}</small></div><div><span>POR PESSOA</span><strong>{euros(preco)}</strong><small>{formato==="story"?"Story":"Publicação"} · {desenho==="guardado"?modeloGuardado?.material.nome:desenho==="referencia"?"A minha referência":ESTILOS_RESERVA.find(e=>e.id===estilo)!.nome}</small></div></div>
        {desenho==="guardado"&&modeloGuardado&&<p className={css.nota}>Vamos preencher os campos de “{modeloGuardado.material.nome}” mantendo a base e as posições que guardaste.</p>}
        {desenho==="referencia"&&referencia&&<div className={css.referenciaOrcamento}><img src={referencia.imagem} alt="Referência que será usada para gerar"/><div><strong>{referencia.nome}</strong><p className={css.nota}>Este desenho será preenchido com os dados confirmados. Se tiver vários espaços de hotéis, começa pela opção selecionada e inclui as seguintes opções disponíveis.</p></div></div>}
        <label className={css.campo}><span>Frase de destaque · opcional</span><textarea rows={3} maxLength={500} placeholder="A tua próxima viagem começa aqui." value={dados.frase} onChange={e=>setDados(d=>({...d,frase:e.target.value}))}/></label><button type="button" disabled={!ia} onClick={()=>void fazer("A sugerir uma frase…",async()=>{const r=await pedir<{frase:string}>("frase",{destino:dados.destino});setDados(d=>({...d,frase:r.frase}));})}>Sugerir frase</button>
        <p className={css.marcaProtegida}>A marca iCliGo acompanha o template. Podes ajustar os textos, a fotografia e a composição depois de gerar.</p>
        <div className={css.rodapePasso}><button type="button" onClick={()=>{setPasso(2);setErro("");}}>← Formato e referência</button><button type="button" className={css.primario} onClick={()=>void gerar()}>Gerar template</button></div>
      </div>}
    </fieldset>
  </div>;
}
