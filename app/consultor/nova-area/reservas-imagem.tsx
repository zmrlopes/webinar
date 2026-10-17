"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { comprimirImagemReserva } from "@/lib/reservas-canvas";
import { dadosPublicacaoReserva, textosPublicacaoReserva, type PublicacaoImagemReserva, type ReferenciaImagemReserva, type ResumoImagemReserva } from "@/lib/reservas-imagem";
import type { DadosReserva, FormatoReserva } from "@/lib/reservas";
import { CriarReservaOrcamento } from "./reservas-orcamento";
import {EditorRapidoPublicacao} from "./reservas-imagem-editor";
import type {AjustesEditorPublicacao,EditorPublicacaoReserva} from "@/lib/reservas-imagem-editor";
import css from "./reservas.module.css";
import styles from "./reservas-imagem.module.css";

const API = "/api/consultor/nova-area/reservas/imagem";
export function CriarPublicacaoImagem({email}: {email: string}) {
  const [aba, setAba] = useState<"criar" | "historico">("criar"), [passo, setPasso] = useState(1);
  const [lista, setLista] = useState<ResumoImagemReserva[]>([]), [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [referencia, setReferencia] = useState<ReferenciaImagemReserva | null>(null);
  const [rascunho, setRascunho] = useState<{nome: string; imagem: string} | null>(null);
  const [dados, setDados] = useState<DadosReserva | null>(null), [formato, setFormato] = useState<FormatoReserva>("story");
  const [dadosParaRever, setDadosParaRever] = useState<DadosReserva | null>(null);
  const [notas, setNotas] = useState(""), [ajuste, setAjuste] = useState("");
  const [resultado, setResultado] = useState<PublicacaoImagemReserva | null>(null);
  const [ocupado, setOcupado] = useState(""), [erro, setErro] = useState("");
  const [revisto, setRevisto] = useState(false), [verificacao, setVerificacao] = useState<string[] | null>(null);
  const [verificacaoErro, setVerificacaoErro] = useState("");
  const [editor,setEditor]=useState<EditorPublicacaoReserva|null>(null),[editorAberto,setEditorAberto]=useState(false),[editorAlterado,setEditorAlterado]=useState(false);
  const upload = useRef<HTMLInputElement>(null), bloqueado = useRef(false);
  const referencias = lista.filter(r => r.tipo === "referencia");
  async function pedir<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
    const r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email, acao, ...extra})});
    let c; try {c = await r.json();} catch {throw new Error("A ligação foi interrompida. Consulta o histórico para recuperar o resultado.");}
    if (!r.ok) throw new Error(c.erro || "Não foi possível concluir o pedido.");
    return c;
  }
  async function carregarLista() {const r = await pedir<{registos: ResumoImagemReserva[]; disponivel: boolean}>("listar"); setLista(r.registos); setDisponivel(r.disponivel);}
  useEffect(() => {let vivo = true; void pedir<{registos: ResumoImagemReserva[]; disponivel: boolean}>("listar").then(r => {if(vivo){setLista(r.registos);setDisponivel(r.disponivel);}}).catch(e => {if(vivo)setErro(e.message);}); return () => {vivo = false;};}, [email]); // eslint-disable-line react-hooks/exhaustive-deps
  async function fazer(titulo: string, acao: () => Promise<void>) {
    if (bloqueado.current || ocupado) return;
    bloqueado.current = true; setOcupado(titulo); setErro("");
    try {await acao();} catch (e) {setErro(e instanceof Error ? e.message : "Não foi possível concluir.");} finally {bloqueado.current = false; setOcupado("");}
  }
  useEffect(() => {
    if (!ocupado && !editorAlterado) return;
    const proteger = (e: BeforeUnloadEvent) => {e.preventDefault(); e.returnValue = "";};
    window.addEventListener("beforeunload", proteger); return () => window.removeEventListener("beforeunload", proteger);
  }, [ocupado,editorAlterado]);
  useEffect(() => {
    if (resultado?.estado !== "a-gerar" || ocupado) return;
    let vivo = true;
    const timer = setInterval(() => {void pedir<PublicacaoImagemReserva>("abrir", {id: resultado.id}).then(r => {if(vivo){setResultado(r);if(r.estado !== "a-gerar")void carregarLista();}}).catch(() => {/* O histórico permite recuperar após voltar a ter ligação. */});}, 5000);
    return () => {vivo = false; clearInterval(timer);};
  }, [resultado?.id, resultado?.estado, ocupado]); // eslint-disable-line react-hooks/exhaustive-deps
  async function carregarReferencia(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    await fazer("A preparar a tua referência…", async () => setRascunho({nome: f.name.replace(/\.[^.]+$/, "").slice(0,120), imagem: await comprimirImagemReserva(f)}));
  }
  async function usar(id: string) {
    await fazer("A abrir a referência…", async () => {
      const r = await pedir<ReferenciaImagemReserva>("abrir", {id});
      setReferencia(r); setFormato(r.formato); setRascunho(null); setResultado(null); setRevisto(false); setPasso(2); setAba("criar");
    });
  }
  function mostrarResultado(r: PublicacaoImagemReserva) {setResultado(r); setRevisto(false); setVerificacao(r.verificacao?.avisos ?? null); setVerificacaoErro(""); setAjuste("");setEditor(null);setEditorAberto(false);setEditorAlterado(false);}
  async function abrirEditor(){if(!resultado)return;await fazer("A identificar os textos da publicação…",async()=>{let e=editor??await pedir<EditorPublicacaoReserva>("preparar-editor",{id:resultado.id});setEditor(e);if(!e.fundoLimpo||!e.marcaPreparada){setOcupado("A preparar os textos e o logótipo para mover… Só é necessário uma vez por publicação.");e=await pedir<EditorPublicacaoReserva>("limpar-editor",{id:resultado.id});setEditor(e);}setEditorAberto(true);});}
  async function guardarEditor(ajustes:AjustesEditorPublicacao){if(!resultado)return;await fazer("A guardar a versão editada…",async()=>{const r=await pedir<PublicacaoImagemReserva>("guardar-edicao",{id:resultado.id,ajustes});mostrarResultado(r);await carregarLista();});}
  async function verificar(id: string) {
    setVerificacaoErro("");
    try {const r = await pedir<{avisos: string[]}>("verificar", {id}); setVerificacao(r.avisos);}
    catch {setVerificacaoErro("A verificação automática não ficou disponível. Confere os textos da imagem com os dados apresentados ao lado.");}
  }
  async function gerar(ajustar = false, correcao?: string) {
    if (!referencia || !dados) return;
    const id = crypto.randomUUID();
    await fazer(ajustar ? "A ajustar a publicação… Pode demorar alguns minutos." : "A gerar a tua publicação… Pode demorar alguns minutos.", async () => {
      const pedido = {id, referenciaId: referencia.id, dados, formato, notas: ajustar ? correcao ?? ajuste : notas, confirmado: true, ...(ajustar && resultado ? {anteriorId: resultado.id} : {})};
      let r: PublicacaoImagemReserva;
      try {r = await pedir<PublicacaoImagemReserva>("gerar", pedido);} catch (e) {
        // Recupera pelo mesmo identificador; nunca repete automaticamente uma chamada paga.
        try {r = await pedir<PublicacaoImagemReserva>("abrir", {id});} catch {throw e;}
        if (r.estado === "falhou") {await carregarLista(); throw e;}
      }
      mostrarResultado(r); await carregarLista();
      if (r.estado === "falhou") throw new Error(r.erro);
      if (r.estado === "pronta") {setOcupado("A conferir os textos da publicação…"); await verificar(r.id);}
    });
  }
  async function abrirHistorico(id: string) {
    await fazer("A abrir a publicação…", async () => {
      const r = await pedir<PublicacaoImagemReserva>("abrir", {id});
      const ref = await pedir<ReferenciaImagemReserva>("abrir", {id: r.referenciaId});
      mostrarResultado(r); setReferencia(ref); setDados(r.dados); setDadosParaRever(r.dados); setNotas(r.notas); setFormato(r.formato); setPasso(3); setAba("criar");
    });
  }
  async function descarregar() {
    if (!resultado?.imagem || !revisto) return;
    await fazer("A preparar o PNG…", async () => {
      const img = new Image(); img.src = resultado.imagem!; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height; canvas.getContext("2d")!.drawImage(img,0,0);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Não foi possível preparar o PNG.")), "image/png"));
      const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `${resultado.dados.destino.replace(/[^\p{L}\p{N}]+/gu,"-")}-${resultado.formato}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url),10000);
    });
  }
  const resumo = dados ? textosPublicacaoReserva(dados) : null;
  const aGerar = resultado?.estado === "a-gerar";
  return <section className={css.pagina} aria-label="Publicações por referência">
    <header className={css.intro}><span>RESERVAS · CRIAR TEMPLATES</span><h1>O teu desenho. Uma nova viagem.</h1><p>Carrega a referência completa e o orçamento. A IA cria a publicação com o teu estilo e os novos dados.</p></header>
    <div className={css.abas}><button type="button" aria-pressed={aba === "criar"} disabled={!!ocupado||editorAlterado} onClick={() => setAba("criar")}>Criar publicação</button><button type="button" aria-pressed={aba === "historico"} disabled={!!ocupado||editorAlterado} onClick={() => {setAba("historico");void fazer("A abrir o histórico…", carregarLista);}}>As minhas publicações</button></div>
    <div aria-live="polite">{ocupado && <p role="status" className={styles.progresso}>{ocupado}</p>}{erro && <p role="alert" className={css.erro}>{erro}</p>}</div>
    {disponivel === false && <p className={css.avisos}>A geração de imagens ainda precisa de ser ativada na plataforma. As referências e publicações guardadas continuam disponíveis.</p>}
    <div hidden={aba !== "criar"}>
      <ol className={css.passos} aria-label="Criar publicação">{["A tua referência","O orçamento","A publicação"].map((nome,i) => <li key={nome} aria-current={passo === i+1 ? "step" : undefined} data-completo={passo > i+1}><span>{i+1}</span><strong>{nome}</strong></li>)}</ol>
      <fieldset disabled={!!ocupado || !!aGerar} className={css.editorCompleto} hidden={passo !== 1}>
        <div className={css.cartao}><h2>Carrega o desenho que queres seguir</h2><p className={css.nota}>Exporta o teu template completo do Canva, com os textos e as fotografias. PNG, JPG ou WebP, até 15 MB. Só precisas de o guardar uma vez.</p>
          <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" className={css.inputOculto} aria-label="Referência completa do Canva" onChange={e => void carregarReferencia(e)}/>
          <button type="button" className={css.primario} onClick={() => upload.current?.click()}>Carregar referência completa</button>
          {rascunho && <div className={css.referenciaOrcamento}><img src={rascunho.imagem} alt="Referência completa a guardar"/><div><label className={css.campo}><span>Nome da referência</span><input maxLength={120} value={rascunho.nome} onChange={e => setRascunho({...rascunho,nome:e.target.value})}/></label><button type="button" className={css.primario} disabled={!rascunho.nome.trim() || !disponivel} onClick={() => void fazer("A guardar e a compreender o teu desenho…", async () => {const ref = await pedir<ReferenciaImagemReserva>("referencia", rascunho); setReferencia(ref); setFormato(ref.formato); setRascunho(null); setResultado(null); await carregarLista(); setPasso(2);})}>Guardar referência e continuar</button><button type="button" onClick={() => setRascunho(null)}>Cancelar</button></div></div>}
          {referencias.length > 0 && <><h3>As minhas referências</h3><div className={styles.galeria}>{referencias.map(r => <article key={r.id}><button type="button" className={styles.escolher} onClick={() => void usar(r.id)}><img src={r.miniatura} alt={r.nome}/><strong>{r.nome}</strong><small>Usar esta referência</small></button><button type="button" className={css.botaoTexto} onClick={() => {if(window.confirm(`Apagar a referência “${r.nome}”?`))void fazer("A apagar…", async () => {await pedir("apagar", {id:r.id});if(referencia?.id===r.id)setReferencia(null);await carregarLista();});}}>Apagar</button></article>)}</div></>}
        </div>
      </fieldset>
      <div hidden={passo !== 2}>
        {referencia && <div className={styles.selecionada}><img src={referencia.miniatura} alt="Referência selecionada"/><div><strong>{referencia.nome}</strong><p>Vamos seguir este desenho.</p></div><button disabled={!!ocupado} onClick={() => setPasso(1)}>Mudar referência</button></div>}
        <CriarReservaOrcamento email={email} ia={!!disponivel} ocupado={ocupado} onOcupado={setOcupado} onGerar={() => {}} modelos={[]} modeloParaUsar={null} onConfigurar={() => setPasso(1)} dadosParaRever={dadosParaRever} onConfirmarDados={d => {setDados(dadosPublicacaoReserva(d)); setResultado(null); setRevisto(false); setPasso(3);}}/>
      </div>
      <fieldset disabled={!!ocupado || !!aGerar} className={css.editorCompleto} hidden={passo !== 3}>
        {resumo && referencia && <div className={css.cartao}>
          {resultado?.estado === "pronta" && resultado.imagem ? <>
            <h2>A tua publicação está guardada</h2><p className={css.nota}>Corrige ou apaga textos, move o logótipo e escolhe outra imagem de fundo no editor.</p>
            {editorAberto&&editor?<EditorRapidoPublicacao key={resultado.id} email={email} destino={resultado.dados.destino} formato={resultado.formato} editor={editor} ocupado={!!ocupado} onGuardar={guardarEditor} onFechar={()=>setEditorAberto(false)} onAlterado={setEditorAlterado}/>:<div className={styles.resultado}><img className={styles.publicacao} src={resultado.imagem} alt={`Publicação gerada para ${resultado.dados.destino}`}/><div>
              <button type="button" className={css.primario} onClick={()=>void abrirEditor()}>Editar publicação</button>
              <h3>Dados confirmados</h3><p><strong>{resumo.destino}</strong><br/>{resumo.hotel}<br/>{resumo.datas}<br/>{resumo.preco}<br/>{resumo.basePreco}<br/>{resumo.regime}</p>
              <details><summary>Comparar com a referência</summary><img className={styles.comparacao} src={referencia.imagem} alt="Referência original para comparar"/></details>
              {resultado.avisos?.map(a => <p key={a} className={css.nota}>{a}</p>)}
              {verificacao && (verificacao.length ? <div className={css.avisos}><strong>A verificação encontrou pontos a rever:</strong><ul>{verificacao.map(a => <li key={a}>{a}</li>)}</ul></div> : <p className={css.nota}>A verificação automática não assinalou diferenças nos textos. Confere também visualmente.</p>)}
              {!!verificacao?.length && <button type="button" onClick={() => void gerar(true, `Corrige estes pontos, mantendo o desenho: ${verificacao.join("; ")}`.slice(0,1500))}>Corrigir os pontos assinalados</button>}
              {verificacaoErro && <p className={css.avisos}>{verificacaoErro}</p>}
              {verificacao === null && <button type="button" onClick={() => void fazer("A conferir os textos…", () => verificar(resultado.id))}>Conferir textos automaticamente</button>}
              <label className={css.confirmar}><input type="checkbox" checked={revisto} onChange={e => setRevisto(e.target.checked)}/>Conferi a imagem, os preços, as datas e os serviços.</label>
              <button type="button" className={css.primario} disabled={!revisto} onClick={() => void descarregar()}>Descarregar PNG</button>
              <label className={css.campo}><span>O que queres ajustar?</span><textarea rows={3} maxLength={1500} value={ajuste} onChange={e => setAjuste(e.target.value)} placeholder="Por exemplo: aproxima o tipo de letra da referência e aumenta o preço."/></label>
              <button type="button" disabled={!ajuste.trim() || !disponivel} onClick={() => void gerar(true)}>Criar versão com este ajuste</button>
              <p className={css.nota}>A versão atual fica no histórico. Para corrigir dados da viagem, volta ao orçamento.</p>
            </div></div>}
          </> : <>
            <h2>Pronto para criar a publicação</h2>
            <div className={css.referenciaOrcamento}><img src={referencia.miniatura} alt="Referência da publicação"/><div><strong>{resumo.destino} · {resumo.hotel}</strong><p>{resumo.datas}<br/>{resumo.preco}<br/>{resumo.basePreco}</p><small>Referência: {referencia.nome}</small></div></div>
            <label className={css.campo}><span>Formato da publicação</span><select value={formato} onChange={e => setFormato(e.target.value as FormatoReserva)}><option value="story">Story · 1080 × 1920</option><option value="feed">Publicação · 1080 × 1350</option></select></label>
            <label className={css.campo}><span>Indicações para a publicação · opcional</span><textarea rows={3} maxLength={1500} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Por exemplo: dá mais destaque ao destino e mantém as cores da referência."/></label>
            {aGerar && <p role="status">A publicação continua a ser gerada. O resultado aparece aqui e fica guardado no histórico.</p>}
            {resultado?.estado === "falhou" && <p className={css.erro}>{resultado.erro}</p>}
            <p className={css.nota}>A imagem final segue a tua referência e inclui a marca iCliGo protegida. Podes pedir ajustes depois de gerar.</p>
            <button type="button" className={css.primario} disabled={!disponivel} onClick={() => void gerar()}>Gerar publicação</button>
          </>}
          <div className={css.rodapePasso}><button type="button" disabled={editorAlterado} onClick={() => {setEditorAberto(false);setPasso(2);setErro("");}}>← Rever orçamento</button><button type="button" disabled={editorAlterado} onClick={() => {setEditorAberto(false);setPasso(1);setErro("");}}>Escolher outra referência</button></div>
        </div>}
      </fieldset>
    </div>
    {aba === "historico" && <div className={css.cartao}><h2>As minhas publicações</h2><p className={css.nota}>Cada geração fica guardada na tua conta, incluindo as versões com ajustes.</p><div className={styles.galeria}>{lista.filter(r => r.tipo === "publicacao").map(r => <article key={r.id}><button type="button" className={styles.escolher} disabled={!!ocupado} onClick={() => void abrirHistorico(r.id)}>{r.miniatura && <img src={r.miniatura} alt={r.nome}/>}<strong>{r.nome}</strong><small>{r.estado === "a-gerar" ? "A gerar…" : r.estado === "falhou" ? "Geração interrompida · abrir para tentar novamente" : `${r.formato === "story" ? "Story" : "Publicação"} · ${new Date(r.atualizadoEm).toLocaleDateString("pt-PT")}`}</small></button><button type="button" disabled={!!ocupado || r.estado === "a-gerar"} className={css.botaoTexto} onClick={() => {if(window.confirm("Apagar esta publicação do histórico?"))void fazer("A apagar…", async () => {await pedir("apagar", {id:r.id});if(resultado?.id===r.id)setResultado(null);await carregarLista();});}}>Apagar</button></article>)}</div>{!lista.some(r => r.tipo === "publicacao") && <p>Ainda não criaste publicações.</p>}</div>}
  </section>;
}
