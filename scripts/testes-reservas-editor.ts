import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import sharp from "sharp";
import {createCanvas,loadImage} from "@napi-rs/canvas";
import {db,fecharDb} from "../src/lib/db";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {dadosReservaVazios,hotelVazio} from "../src/lib/reservas";
import {ajustesIniciaisPublicacao,desenharEditorPublicacao,validarAjustesPublicacao,type EditorPublicacaoReserva} from "../src/lib/reservas-imagem-editor";
import {prepararEditorPublicacao,limparFundoEditorPublicacao,guardarEdicaoPublicacao} from "../src/lib/reservas-imagem-editor-servidor";
import {abrirImagemReserva,finalizarImagemReserva} from "../src/lib/reservas-imagem-servidor";
import type {PublicacaoImagemReserva,ReferenciaImagemReserva} from "../src/lib/reservas-imagem";
import {POST} from "../app/api/consultor/nova-area/reservas/imagem/route";
async function main(){
 process.env.DATABASE_URL||="postgres://test:test@localhost/test";
 const email=EMAIL_PAINEL_DEMONSTRACAO,pool=db(),originalQuery=pool.query,originalFetch=globalThis.fetch,registos=new Map<string,unknown>();let chamadasIA=0;
 pool.query=(async(sql:string,args:unknown[]=[])=>{const key=String(args[0]);if(sql.startsWith("select"))return{rows:registos.has(key)?[{valor:structuredClone(registos.get(key))}]:[]};if(sql.startsWith("insert")){registos.set(key,JSON.parse(String(args[1])));return{rows:[{chave:key}]};}throw Error("Consulta inesperada");}) as typeof pool.query;
 globalThis.fetch=(async()=>{chamadasIA++;throw Error("O editor preparado não deve chamar IA");}) as typeof fetch;
 try{
  for(const acao of ["preparar-editor","limpar-editor","guardar-edicao"])assert.equal((await POST(new Request("http://localhost/api",{method:"POST",body:JSON.stringify({acao,email:"outra@example.com"})}))).status,403);
  const base=await sharp({create:{width:1080,height:1920,channels:3,background:"#183d52"}}).webp().toBuffer(),url=(b:Buffer)=>`data:image/webp;base64,${b.toString("base64")}`;
  const ref:ReferenciaImagemReserva={id:randomUUID(),tipo:"referencia",nome:"Modelo pessoal",formato:"story",imagem:url(base),miniatura:"",estilo:"Desenho de teste",marca:{x:3,y:2,w:24,h:5}};
  const source=await finalizarImagemReserva(base,ref,"story");
  const r:PublicacaoImagemReserva={id:randomUUID(),tipo:"publicacao",nome:"Gran Canaria",formato:"story",estado:"pronta",criadaEm:new Date().toISOString(),referenciaId:ref.id,dados:{...dadosReservaVazios(),destino:"Gran Canaria",ida:"2026-11-17",regresso:"2026-11-22",viajantes:3,hoteis:[{...hotelVazio(),nome:"Hotel",total:4405}]},notas:"",imagem:url(source)};
  const textos=[{id:"titulo",nome:"Destino",texto:"GRAN CANARIA",fonte:"geometrica" as const,tamanho:70,cor:"#ffffff",negrito:true,italico:false,sombra:true,alinhar:"left" as const,x:5,y:65,w:85,h:7}];
  const editor:EditorPublicacaoReserva={versao:1,origemId:r.id,imagemOriginal:r.imagem!,fundoLimpo:url(base),textos,decoracoes:[],marca:ref.marca,ajustes:ajustesIniciaisPublicacao(textos)};
  registos.set(`reservas:imagem:v1:${email}:${r.id}`,r);registos.set(`reservas:imagem:v1:${email}:${ref.id}`,ref);registos.set(`reservas:editor:v1:${email}:${r.id}`,editor);
  await assert.rejects(()=>prepararEditorPublicacao("outra@example.com",r.id),/não existe/);
  await assert.rejects(()=>guardarEdicaoPublicacao("outra@example.com",{id:r.id,ajustes:editor.ajustes}),/não existe/);
  assert.equal((await prepararEditorPublicacao(email,r.id)).fundoLimpo,editor.fundoLimpo);assert.equal((await limparFundoEditorPublicacao(email,r.id)).origemId,r.id);assert.equal(chamadasIA,0);
  const canvas=createCanvas(1080,1920),ctx=canvas.getContext("2d"),img=await loadImage(source),limpo=await loadImage(base);
  desenharEditorPublicacao(ctx as unknown as CanvasRenderingContext2D,img as unknown as CanvasImageSource,limpo as unknown as CanvasImageSource,null,editor,editor.ajustes,1080,1920);
  const original=createCanvas(1080,1920);original.getContext("2d").drawImage(img,0,0);
  assert.deepEqual(ctx.getImageData(0,0,1080,1920).data,original.getContext("2d").getImageData(0,0,1080,1920).data,"Abrir o editor preserva todos os píxeis");
  const ajustes=structuredClone(editor.ajustes);ajustes.textos[0]!.fonte="condensada";ajustes.textos[0]!.tamanho=96;
  const antes=structuredClone(r),editada=await guardarEdicaoPublicacao(email,{id:r.id,ajustes});assert.notEqual(editada.id,r.id);assert.equal(editada.anteriorId,r.id);assert.deepEqual(editada.dados,r.dados);assert.deepEqual(await abrirImagemReserva(email,r.id),antes);
  const reaberto=await prepararEditorPublicacao(email,editada.id);assert.equal(reaberto.imagemOriginal,r.imagem);assert.equal(reaberto.ajustes.textos[0]!.fonte,"condensada");assert.equal(chamadasIA,0);
  ajustes.textos[0]!.tamanho=80;await guardarEdicaoPublicacao(email,{id:editada.id,ajustes});assert.equal(chamadasIA,0,"Reabrir e continuar a editar não volta a preparar o fundo");
  assert.throws(()=>validarAjustesPublicacao({...ajustes,textos:[{...ajustes.textos[0],fonte:"codigo-remoto"}]},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,textos:[{...ajustes.textos[0],tamanho:NaN}]},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,fundo:"https://example.com/fundo.png"},editor));
  assert.throws(()=>validarAjustesPublicacao({...ajustes,fundo:"data:image/svg+xml;base64,PHN2Zz4="},editor));
  await assert.rejects(()=>guardarEdicaoPublicacao(email,{id:r.id,ajustes:{...ajustes,fundo:"data:image/png;base64,aGVsbG8="}}),/fundo/);
  const fundo=await sharp({create:{width:800,height:500,channels:3,background:"#b97732"}}).webp().toBuffer();ajustes.fundo=url(fundo);
  const comFundo=await guardarEdicaoPublicacao(email,{id:r.id,ajustes});const bytes=Buffer.from(comFundo.imagem!.split(",")[1]!,"base64"),meta=await sharp(bytes).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1920);
  const marca=await sharp(bytes).extract({left:40,top:50,width:1,height:1}).raw().toBuffer();assert(marca[0]!>220&&marca[1]!>220,"A marca continua aplicada por cima da fotografia");
  console.log("OK: acesso privado, abertura sem alterar o original, fontes/tamanhos, troca de fundo, marca protegida, versões e reabertura sem nova IA. Sem rede nem alterações reais.");
 }finally{pool.query=originalQuery;globalThis.fetch=originalFetch;await fecharDb();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
