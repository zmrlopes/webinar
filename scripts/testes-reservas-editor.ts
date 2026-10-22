import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import sharp from "sharp";
import {createCanvas,loadImage} from "@napi-rs/canvas";
import {db,fecharDb} from "../src/lib/db";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {dadosReservaVazios,hotelVazio} from "../src/lib/reservas";
import {ajustesIniciaisPublicacao,ajustarConteudoTextoPublicacao,desenharEditorPublicacao,prepararTextoEditor,validarAjustesPublicacao,type EditorPublicacaoReserva} from "../src/lib/reservas-imagem-editor";
import {prepararEditorPublicacao,limparFundoEditorPublicacao,guardarEdicaoPublicacao} from "../src/lib/reservas-imagem-editor-servidor";
import {abrirImagemReserva,finalizarImagemReserva,logotipoBrancoReserva,VERSAO_LOGOTIPO_BRANCO_RESERVA} from "../src/lib/reservas-imagem-servidor";
import type {PublicacaoImagemReserva,ReferenciaImagemReserva} from "../src/lib/reservas-imagem";
import {POST} from "../app/api/consultor/nova-area/reservas/imagem/route";
import {harmonizarMarcaPublicacao} from "../src/lib/reservas-imagem-ocr";
import {validarSombreadosPublicacao,desenharSombreadosPublicacao,type SombreadoPublicacao} from "../src/lib/reservas-imagem-sombras";
import {validarFormasPublicacao,estilosFormasPublicacao} from "../src/lib/reservas-imagem-camadas";
async function main(){
 process.env.DATABASE_URL||="postgres://test:test@localhost/test";
 const email=EMAIL_PAINEL_DEMONSTRACAO,pool=db(),originalQuery=pool.query,originalFetch=globalThis.fetch,registos=new Map<string,unknown>();let chamadasIA=0;
 pool.query=(async(sql:string,args:unknown[]=[])=>{const key=String(args[0]);if(sql.startsWith("select"))return{rows:registos.has(key)?[{valor:structuredClone(registos.get(key))}]:[]};if(sql.startsWith("insert")){registos.set(key,JSON.parse(String(args[1])));return{rows:[{chave:key}]};}throw Error("Consulta inesperada");}) as typeof pool.query;
 globalThis.fetch=(async()=>{chamadasIA++;throw Error("O editor preparado não deve chamar IA");}) as typeof fetch;
 try{
  for(const acao of ["preparar-editor","limpar-editor","guardar-edicao"])assert.equal((await POST(new Request("http://localhost/api",{method:"POST",body:JSON.stringify({acao,email:"outra@example.com"})}))).status,403);
  const base=await sharp({create:{width:1080,height:1920,channels:3,background:"#183d52"}}).webp().toBuffer(),url=(b:Buffer)=>`data:image/webp;base64,${b.toString("base64")}`;
  const ref:ReferenciaImagemReserva={id:randomUUID(),tipo:"referencia",nome:"Modelo pessoal",formato:"story",imagem:url(base),miniatura:"",estilo:"Desenho de teste",marca:{x:3,y:2,w:24,h:5}};
  const baseComMarca=await finalizarImagemReserva(base,ref,"story"),arte=createCanvas(1080,1920),arteCtx=arte.getContext("2d");arteCtx.drawImage(await loadImage(baseComMarca),0,0);arteCtx.fillStyle="#ffffff";arteCtx.fillRect(33,39,258,94);arteCtx.font="bold 70px sans-serif";arteCtx.fillText("GRAN CANARIA",54,1310);const source=arte.toBuffer("image/png");
  const r:PublicacaoImagemReserva={id:randomUUID(),tipo:"publicacao",nome:"Gran Canaria",formato:"story",estado:"pronta",criadaEm:new Date().toISOString(),referenciaId:ref.id,dados:{...dadosReservaVazios(),destino:"Gran Canaria",ida:"2026-11-17",regresso:"2026-11-22",viajantes:3,hoteis:[{...hotelVazio(),nome:"Hotel",total:4405}]},notas:"",imagem:url(source)};
  const textos=[{id:"titulo",nome:"Destino",texto:"GRAN CANARIA",fonte:"geometrica" as const,tamanho:70,cor:"#ffffff",negrito:true,italico:false,sombra:true,alinhar:"left" as const,x:5,y:65,w:85,h:7}];
  const logo=await logotipoBrancoReserva(),editor:EditorPublicacaoReserva={versao:1,origemId:r.id,imagemOriginal:r.imagem!,fundoLimpo:url(base),textos,decoracoes:[],sombreados:[],formas:[],graficos:[],camadasPreparadas:true,camadasVersao:2,marca:ref.marca,marcaPreparada:true,marcaSuave:true,logoBranco:`data:image/png;base64,${logo.toString("base64")}`,ajustes:ajustesIniciaisPublicacao(textos)};
  const rgba=await sharp(logo).ensureAlpha().raw().toBuffer();let transparentes=0,brancos=0;for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]===0)transparentes++;if(rgba[i+3]!>200){assert(rgba[i]!>250&&rgba[i+1]!>250&&rgba[i+2]!>250);brancos++;}}assert(transparentes>100&&brancos>100,"Ícone e letras brancos sem cartão opaco");
  assert.equal(createHash("sha256").update(await readFile("public/icligo-logo-branco.png")).digest("hex"),"14dcbf59ddd1d65ce641f09e0a316893a3bfbf79af33105b3f9bb0b5542c70c8","É exatamente o PNG icligo branco fornecido pelo utilizador");
  const metaLogo=await sharp(logo).metadata();assert.equal(metaLogo.width,570);assert.equal(metaLogo.height,184);const ladoIcone=metaLogo.height!,icone=await sharp(logo).extract({left:0,top:0,width:ladoIcone,height:ladoIcone}).ensureAlpha().raw().toBuffer(),opacos=icone.filter((v,i)=>i%4===3&&v>200).length;assert(opacos>1000&&opacos<ladoIcone*ladoIcone/2,"O ícone mantém os detalhes brancos e a transparência do ficheiro fornecido");
  const luminoso=await sharp(base).modulate({brightness:1.8}).webp().toBuffer(),harmonizado=await harmonizarMarcaPublicacao(source,luminoso,ref.marca,1080,1920),amostra=await sharp(harmonizado).extract({left:140,top:80,width:1,height:1}).removeAlpha().raw().toBuffer();assert(Math.abs(amostra[0]!-24)<4&&Math.abs(amostra[1]!-61)<4&&Math.abs(amostra[2]!-82)<4,"A antiga marca fica integrada no tom do fundo original, sem um retângulo mais claro");
  registos.set(`reservas:imagem:v1:${email}:${r.id}`,r);registos.set(`reservas:imagem:v1:${email}:${ref.id}`,ref);registos.set(`reservas:editor:v1:${email}:${r.id}`,editor);
  registos.set(`reservas:editor:v1:${email}:${r.id}`,{...editor,logoBranco:url(base),logoVersao:"anterior"});const atualizadoLogo=await prepararEditorPublicacao(email,r.id);assert.equal(atualizadoLogo.logoBranco,editor.logoBranco);assert.equal(atualizadoLogo.logoVersao,VERSAO_LOGOTIPO_BRANCO_RESERVA);assert.equal(atualizadoLogo.fundoLimpo,editor.fundoLimpo);assert.equal(chamadasIA,0,"Editores guardados recebem o PNG fornecido sem nova análise ou limpeza");
  await assert.rejects(()=>prepararEditorPublicacao("outra@example.com",r.id),/não existe/);
  await assert.rejects(()=>guardarEdicaoPublicacao("outra@example.com",{id:r.id,ajustes:editor.ajustes}),/não existe/);
  assert.equal((await prepararEditorPublicacao(email,r.id)).fundoLimpo,editor.fundoLimpo);assert.equal((await limparFundoEditorPublicacao(email,r.id)).origemId,r.id);assert.equal(chamadasIA,0);
  const canvas=createCanvas(1080,1920),ctx=canvas.getContext("2d"),img=await loadImage(source),limpo=await loadImage(base);
  desenharEditorPublicacao(ctx as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,editor.ajustes,1080,1920);
  const original=createCanvas(1080,1920);original.getContext("2d").drawImage(img,0,0);
  assert(Buffer.from(ctx.getImageData(0,0,1080,1920).data).equals(Buffer.from(original.getContext("2d").getImageData(0,0,1080,1920).data)),"Abrir o editor preserva todos os píxeis");
  const ajustes=structuredClone(editor.ajustes);ajustes.textos[0]!.fonte="condensada";ajustes.textos[0]!.tamanho=96;
  const antes=structuredClone(r),editada=await guardarEdicaoPublicacao(email,{id:r.id,ajustes});assert.notEqual(editada.id,r.id);assert.equal(editada.anteriorId,r.id);assert.deepEqual(editada.dados,r.dados);assert.deepEqual(await abrirImagemReserva(email,r.id),antes);
  const reaberto=await prepararEditorPublicacao(email,editada.id);assert.equal(reaberto.imagemOriginal,r.imagem);assert.equal(reaberto.ajustes.textos[0]!.fonte,"condensada");assert.equal(chamadasIA,0);
  ajustes.textos[0]!.tamanho=80;await guardarEdicaoPublicacao(email,{id:editada.id,ajustes});assert.equal(chamadasIA,0,"Reabrir e continuar a editar não volta a preparar o fundo");
  const corrigidos=structuredClone(editor.ajustes);corrigidos.textos[0]!.texto="Pensão Completa\nBebidas incluídas";
  const ajustado=ajustarConteudoTextoPublicacao(ctx as unknown as CanvasRenderingContext2D,textos[0]!,editor.ajustes.textos[0]!,"Regime: Pensão Completa com bebidas incluídas",1080,1920);assert(ajustado.tamanho<textos[0]!.tamanho);assert(prepararTextoEditor(ctx as unknown as CanvasRenderingContext2D,textos[0]!,ajustado,1080).altura<=textos[0]!.h/100*1920,"Uma correção maior cabe sem invadir a linha seguinte");
  const linhas=prepararTextoEditor(ctx as unknown as CanvasRenderingContext2D,textos[0]!,corrigidos.textos[0]!,1080).linhas;assert.deepEqual(linhas,["Pensão Completa","Bebidas incluídas"]);
  const desenhados:string[]=[],proxy=new Proxy(ctx,{get(target,key){if(key==="fillText")return (s:string,...args:unknown[])=>{desenhados.push(s);return Reflect.apply(target.fillText,target,[s,...args]);};const v=Reflect.get(target,key,target);return typeof v==="function"?v.bind(target):v;},set(target,key,value){return Reflect.set(target,key,value,target);}});
  // Mesmo havendo um recorte das letras antigas, uma correção usa o novo conteúdo.
  desenharEditorPublicacao(proxy as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,corrigidos,1080,1920,new Map([["titulo",img as unknown as CanvasImageSource]]));
  assert.deepEqual(desenhados,linhas);assert(!desenhados.includes("GRAN CANARIA"));
  const corrigida=await guardarEdicaoPublicacao(email,{id:r.id,ajustes:corrigidos});assert.deepEqual(corrigida.dados,r.dados);assert.equal((await prepararEditorPublicacao(email,corrigida.id)).ajustes.textos[0]!.texto,corrigidos.textos[0]!.texto);
  const apagados=structuredClone(corrigidos);apagados.textos[0]!.apagado=true;desenhados.length=0;
  desenharEditorPublicacao(proxy as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,apagados,1080,1920);assert.deepEqual(desenhados,[]);
  const area=[44,1238,938,154] as const,esperado=createCanvas(1080,1920);esperado.getContext("2d").drawImage(limpo,0,0);
  assert(Buffer.from(ctx.getImageData(...area).data).equals(Buffer.from(esperado.getContext("2d").getImageData(...area).data)),"Apagar remove a inscrição antiga e deixa o fundo limpo");
  const apagada=await guardarEdicaoPublicacao(email,{id:corrigida.id,ajustes:apagados}),recuperado=await prepararEditorPublicacao(email,apagada.id);assert.equal(recuperado.ajustes.textos[0]!.apagado,true);assert.equal(recuperado.ajustes.textos[0]!.texto,corrigidos.textos[0]!.texto);
  apagados.textos[0]!.apagado=false;desenhados.length=0;desenharEditorPublicacao(proxy as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,apagados,1080,1920);assert.deepEqual(desenhados,linhas,"Restaurar recupera a correção anterior");
  apagados.textos[0]!.texto="";desenhados.length=0;desenharEditorPublicacao(proxy as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,apagados,1080,1920);assert.deepEqual(desenhados,[]);assert(Buffer.from(ctx.getImageData(...area).data).equals(Buffer.from(esperado.getContext("2d").getImageData(...area).data)),"Esvaziar também remove o texto");
  assert.equal(chamadasIA,0);assert.deepEqual(await abrirImagemReserva(email,r.id),antes);
  const movida=structuredClone(editor.ajustes);movida.marca={x:68,y:88};
  const comMarca=await guardarEdicaoPublicacao(email,{id:r.id,ajustes:movida}),marcaReaberta=await prepararEditorPublicacao(email,comMarca.id);assert.deepEqual(marcaReaberta.ajustes.marca,movida.marca);assert.equal(marcaReaberta.imagemOriginal,editor.imagemOriginal);
  const chaveMovida=`reservas:editor:v1:${email}:${comMarca.id}`,antigo=structuredClone(marcaReaberta);delete antigo.marcaPreparada;delete antigo.logoBranco;registos.set(chaveMovida,antigo);const atualizado=await prepararEditorPublicacao(email,comMarca.id);assert.equal(atualizado.marcaPreparada,true);assert.equal(atualizado.fundoLimpo,editor.fundoLimpo);assert.equal(chamadasIA,0,"Versões antigas reutilizam a limpeza da mesma imagem original");
  const renderMarca=createCanvas(1080,1920),ctxMarca=renderMarca.getContext("2d"),logoImg=await loadImage(logo);
  desenharEditorPublicacao(ctxMarca as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,movida,1080,1920,new Map(),logoImg as unknown as CanvasImageSource);
  assert(Buffer.from(ctxMarca.getImageData(40,50,240,70).data).equals(Buffer.from(esperado.getContext("2d").getImageData(40,50,240,70).data)),"Mover limpa a marca antiga, sem deixar uma cópia");
  const destinoMarca=ctxMarca.getImageData(735,1690,260,90).data;assert(destinoMarca.some((v,i)=>i%4===0&&v>240),"O logótipo branco aparece na posição escolhida");
  for(const marca of [{x:-1,y:0},{x:100,y:0},{x:0,y:100},{x:NaN,y:0},null])assert.throws(()=>validarAjustesPublicacao({...movida,marca},editor));
  for(const invalido of [{texto:123},{texto:"a".repeat(1601)},{apagado:"true"},{id:"marca",texto:"alterar marca"}])assert.throws(()=>validarAjustesPublicacao({...ajustes,textos:[{...ajustes.textos[0],...invalido}]},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,textos:[{...ajustes.textos[0],fonte:"codigo-remoto"}]},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,textos:[{...ajustes.textos[0],tamanho:NaN}]},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,fundo:"https://example.com/fundo.png"},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,fundo:"data:image/svg+xml;base64,PHN2Zz4="},editor));
  await assert.rejects(()=>guardarEdicaoPublicacao(email,{id:r.id,ajustes:{...ajustes,fundo:"data:image/png;base64,aGVsbG8="}}),/fundo/);
  const fundo=await sharp({create:{width:800,height:500,channels:3,background:"#b97732"}}).webp().toBuffer();ajustes.fundo=url(fundo);
  const comFundo=await guardarEdicaoPublicacao(email,{id:r.id,ajustes});const bytes=Buffer.from(comFundo.imagem!.split(",")[1]!,"base64"),meta=await sharp(bytes).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1920);
  const marca=await sharp(bytes).extract({left:33,top:39,width:255,height:90}).raw().toBuffer();assert(marca.some(v=>v>240),"A marca continua aplicada por cima da fotografia");
  const sombreados:SombreadoPublicacao[]=[{x:0,y:50,w:100,h:50,cor:"#000000",direcao:"baixo",paragens:[{posicao:0,opacidade:0},{posicao:1,opacidade:.8}]}];
  assert.deepEqual(validarSombreadosPublicacao(sombreados),sombreados);
  for(const invalido of [null,{},Array(9).fill(sombreados[0]),[{...sombreados[0],x:101}],[{...sombreados[0],cor:"red"}],[{...sombreados[0],direcao:"outra"}],[{...sombreados[0],paragens:[{posicao:0,opacidade:2},{posicao:1,opacidade:0}]}],[{...sombreados[0],paragens:[{posicao:1,opacidade:0},{posicao:0,opacidade:1}]}]])assert.throws(()=>validarSombreadosPublicacao(invalido));
  const editorSombra={...editor,sombreados},ajustesSombra={...structuredClone(editor.ajustes),fundo:url(fundo),escurecimento:0};
  const novaFoto=await loadImage(fundo);
  for(const h of [1920,1350]){
    const render=createCanvas(1080,h),contexto=render.getContext("2d");
    desenharEditorPublicacao(contexto as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,novaFoto as unknown as CanvasImageSource,editorSombra,ajustesSombra,1080,h);
    const cima=contexto.getImageData(100,Math.round(h*.3),1,1).data[0]!,baixo=contexto.getImageData(100,Math.round(h*.9),1,1).data[0]!;
    assert(cima>170&&baixo<85,"Story e feed mantêm o sombreado na zona certa, sem escurecer a fotografia inteira");
  }
  // Sem substituir a fotografia, o sombreado já está no original: não o duplica.
  desenharEditorPublicacao(ctx as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editorSombra,editor.ajustes,1080,1920);
  assert(Buffer.from(ctx.getImageData(0,0,1080,1920).data).equals(Buffer.from(original.getContext("2d").getImageData(0,0,1080,1920).data)));
  // A sombra das letras também acompanha o recorte transparente original.
  const letras=createCanvas(100,40);letras.getContext("2d").fillStyle="#ffffff";letras.getContext("2d").fillRect(10,5,70,20);
  const comRecorte=new Map([[textos[0]!.id,letras as unknown as CanvasImageSource]]);
  const renderizarRecorte=(sombra:boolean)=>{const c=createCanvas(1080,1920),cx=c.getContext("2d");desenharEditorPublicacao(cx as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,novaFoto as unknown as CanvasImageSource,{...editor,textos:[{...textos[0]!,sombra}]},ajustesSombra,1080,1920,comRecorte);return cx.getImageData(0,1200,1080,230).data;};
  const semSombra=renderizarRecorte(false),comSombra=renderizarRecorte(true);
  assert(comSombra.some((v,i)=>i%4===0&&v+5<semSombra[i]!),"O recorte mantém uma sombra visível sobre a fotografia nova");
  const radial=createCanvas(200,100),cr=radial.getContext("2d");cr.fillStyle="#ffffff";cr.fillRect(0,0,200,100);
  desenharSombreadosPublicacao(cr as unknown as CanvasRenderingContext2D,[{x:0,y:0,w:100,h:100,cor:"#000000",direcao:"radial",paragens:[{posicao:0,opacidade:.8},{posicao:1,opacidade:0}]}],200,100);
  assert(cr.getImageData(100,50,1,1).data[0]!<65&&cr.getImageData(3,50,1,1).data[0]!>235,"O sombreado radial é elíptico e transparente nas bordas");
  registos.set(`reservas:editor:v1:${email}:${r.id}`,editorSombra);
  const guardadaSombra=await guardarEdicaoPublicacao(email,{id:r.id,ajustes:ajustesSombra}),reabertaSombra=await prepararEditorPublicacao(email,guardadaSombra.id);
  assert.deepEqual(reabertaSombra.sombreados,sombreados);assert.equal(reabertaSombra.ajustes.escurecimento,0);assert.equal(chamadasIA,0);
  const guardadaPixels=await sharp(Buffer.from(guardadaSombra.imagem!.split(",")[1]!,"base64")).extract({left:100,top:1728,width:1,height:1}).raw().toBuffer();assert(guardadaPixels[0]!<85,"A exportação do servidor conserva o sombreado");
  // Migra uma versão antiga uma vez, reutilizando a análise nas outras versões.
  const chaveIA=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY="teste-sem-rede";
  try{
    const legado=structuredClone(editor);delete legado.sombreados;
    registos.set(`reservas:editor:v1:${email}:${r.id}`,legado);
    const legadoFilho={...structuredClone(reabertaSombra),sombreados:undefined};
    registos.set(`reservas:editor:v1:${email}:${guardadaSombra.id}`,legadoFilho);
    globalThis.fetch=(async(_url,init)=>{chamadasIA++;const pedido=JSON.parse(String(init?.body));assert.equal(pedido.input[0].content[0].image_url,editor.imagemOriginal);return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({sombreados})}]}]});}) as typeof fetch;
    const migrado=await prepararEditorPublicacao(email,guardadaSombra.id);
    assert.deepEqual(migrado.sombreados,sombreados);assert.deepEqual(migrado.ajustes,legadoFilho.ajustes);assert.equal(migrado.fundoLimpo,legadoFilho.fundoLimpo);assert.deepEqual(migrado.textos,legadoFilho.textos);
    const origemMigrada=await prepararEditorPublicacao(email,r.id);assert.deepEqual(origemMigrada.sombreados,sombreados);assert.equal(origemMigrada.ajustes.escurecimento,0);
    await prepararEditorPublicacao(email,guardadaSombra.id);assert.equal(chamadasIA,1,"Uma única análise de sombreados, sem repetir o OCR ou gerar outra fotografia");assert.deepEqual(await abrirImagemReserva(email,r.id),antes);
  }finally{if(chaveIA===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=chaveIA;}
  const chaveCamadas=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY="teste-sem-rede";
  try{
    const formas=validarFormasPublicacao([{nome:"Cartão azul",x:10,y:55,w:80,h:25,cor:"#183d52",opacidade:1,figura:"retangulo",raio:0,pontos:[]}]);
    const legado=structuredClone(reabertaSombra);delete legado.camadasPreparadas;delete legado.formas;delete legado.graficos;delete legado.ajustes.formas;
    legado.ajustes.textos[0]!.x=20;legado.ajustes.textos[0]!.y=30;
    registos.set(`reservas:editor:v1:${email}:${guardadaSombra.id}`,legado);
    const raiz=structuredClone(editor);delete raiz.camadasPreparadas;delete raiz.formas;delete raiz.graficos;
    registos.set(`reservas:editor:v1:${email}:${r.id}`,raiz);
    const chamadasAntes=chamadasIA;
    globalThis.fetch=(async(_url,init)=>{chamadasIA++;const pedido=JSON.parse(String(init?.body));assert(pedido.instructions.includes("cartões"));return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({formas,graficos:[],sombreados})}]}]});}) as typeof fetch;
    const migrado=await prepararEditorPublicacao(email,guardadaSombra.id);
    assert.deepEqual(migrado.formas,formas);assert.equal(migrado.camadasPreparadas,true);assert.deepEqual(migrado.ajustes.textos,legado.ajustes.textos);assert.equal(migrado.fundoLimpo,legado.fundoLimpo);assert.deepEqual(migrado.ajustes.formas,estilosFormasPublicacao(formas));
    await prepararEditorPublicacao(email,r.id);await prepararEditorPublicacao(email,guardadaSombra.id);assert.equal(chamadasIA,chamadasAntes+1,"Os cartões antigos são separados uma vez e reutilizados nas versões da mesma imagem");
    const ajustes={...structuredClone(migrado.ajustes),fundo:url(fundo),escurecimento:0,formas:[{id:formas[0]!.id,cor:"#6044aa"}]};
    const colorida=await guardarEdicaoPublicacao(email,{id:guardadaSombra.id,ajustes}),aberta=await prepararEditorPublicacao(email,colorida.id);
    assert.deepEqual(aberta.ajustes.formas,ajustes.formas);assert.deepEqual(colorida.dados,r.dados);assert.deepEqual(await abrirImagemReserva(email,r.id),antes);assert.equal(chamadasIA,chamadasAntes+1,"Guardar e reabrir uma cor não chama novamente a IA");
    const pixel=await sharp(Buffer.from(colorida.imagem!.split(",")[1]!,"base64")).extract({left:900,top:1450,width:1,height:1}).raw().toBuffer();assert(Math.abs(pixel[0]!-96)<8&&Math.abs(pixel[1]!-68)<8&&Math.abs(pixel[2]!-170)<8,"A exportação guarda a cor do cartão por cima do novo fundo");
    for(const formasInvalidas of [[{id:"marca",cor:"#000000"}],[{id:formas[0]!.id,cor:"red"}],[]])assert.throws(()=>validarAjustesPublicacao({...ajustes,formas:formasInvalidas},migrado));
  }finally{if(chaveCamadas===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=chaveCamadas;}
  console.log("OK: acesso privado, original preservado, correção e remoção de textos na imagem, restauro, persistência, fontes/tamanhos, fundo, marca e reabertura sem IA. Sem rede nem alterações reais.");
 }finally{pool.query=originalQuery;globalThis.fetch=originalFetch;await fecharDb();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
