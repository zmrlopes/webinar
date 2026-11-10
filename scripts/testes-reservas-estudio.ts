import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createCanvas, loadImage} from '@napi-rs/canvas';
import {db, fecharDb} from '../src/lib/db';
import {EMAIL_PAINEL_DEMONSTRACAO} from '../src/lib/demo';
import {dadosReservaVazios} from '../src/lib/reservas';
import {ajustesIniciaisPublicacao, type EditorPublicacaoReserva} from '../src/lib/reservas-imagem-editor';
import {abrirImagemReserva, apagarImagemReserva, logotipoBrancoReserva, VERSAO_LOGOTIPO_BRANCO_RESERVA} from '../src/lib/reservas-imagem-servidor';
import {elementoEstudio, projetoDoEditor, validarProjetoEstudio, desenharEstudio, type ProjetoEstudio} from '../src/lib/reservas-estudio';
import {abrirEstudio, prepararEstudio, guardarEstudio} from '../src/lib/reservas-estudio-servidor';
import type {PublicacaoImagemReserva} from '../src/lib/reservas-imagem';
import {POST} from '../app/api/consultor/nova-area/reservas/estudio/route';

async function main() {
  process.env.DATABASE_URL ||= 'postgres://test:test@localhost/test';
  const pool=db(), query=pool.query, fetchOriginal=globalThis.fetch;
  const apiKey=process.env.RESERVAS_IMAGE_API_KEY;
  const registos=new Map<string, unknown>(), email=EMAIL_PAINEL_DEMONSTRACAO;
  let chamadasIA=0, falharImagem=false, falharGravacao=false;
  // Toda a persistência e rede ficam em memória; não há alterações à conta real.
  pool.query=(async(sql:string, args:unknown[]=[])=>{
    const chave=String(args[0]);
    if(sql.startsWith('select')) return {rows:registos.has(chave)?[{valor:structuredClone(registos.get(chave))}]:[]};
    if(sql.includes('jsonb_build_object')) return {rows:[{chave}]};
    if(sql.startsWith('insert')) {
      if(args.length===4&&falharGravacao) throw Error('Falha simulada de gravação');
      if(!sql.includes('do nothing')||!registos.has(chave)) registos.set(chave, JSON.parse(String(args[1])));
      if(args.length===4) registos.set(String(args[2]), JSON.parse(String(args[3])));
      return {rows:[]};
    }
    if(sql.startsWith('delete')) {registos.delete(chave);return {rows:[]};}
    throw Error('Consulta inesperada');
  }) as typeof pool.query;
  const base=await sharp({create:{width:1080,height:1920,channels:3,background:'#204060'}}).webp().toBuffer();
  const url=(b:Buffer)=>`data:image/webp;base64,${b.toString('base64')}`;
  globalThis.fetch=(async(_url, options)=>{
    chamadasIA++;
    assert.equal(String(_url),'https://api.openai.com/v1/images/edits');
    assert.match(String((options?.body as FormData).get('prompt')),/Remove ALL lettering/);
    return falharImagem?new Response('{}',{status:502}):Response.json({data:[{b64_json:base.toString('base64')}]});
  }) as typeof fetch;
  process.env.RESERVAS_IMAGE_API_KEY='teste-sem-rede';
  try {
    for(const acao of ['abrir','preparar','guardar']) {
      const resposta=await POST(new Request('http://localhost/api',{method:'POST',body:JSON.stringify({acao,email:'outra@example.com'})}));
      assert.equal(resposta.status,403);
      assert.equal(resposta.headers.get('Cache-Control'),'private, no-store');
    }
    assert.equal((await POST(new Request('http://localhost/api',{method:'POST',body:'null'}))).status,400);
    const logo=`data:image/png;base64,${(await logotipoBrancoReserva()).toString('base64')}`;
    const r:PublicacaoImagemReserva={id:randomUUID(),tipo:'publicacao',nome:'Teste estúdio',formato:'story',estado:'pronta',criadaEm:new Date().toISOString(),referenciaId:randomUUID(),dados:dadosReservaVazios(),notas:'',imagem:url(base)};
    const textos=[{id:'texto-1',nome:'Destino',texto:'Madeira',fonte:'poppins' as const,tamanho:70,cor:'#ffffff',negrito:true,italico:false,sombra:true,alinhar:'left' as const,x:10,y:20,w:70,h:10}];
    const editor:EditorPublicacaoReserva={versao:1,origemId:r.id,imagemOriginal:r.imagem!,fundoLimpo:'',textos,decoracoes:[],marca:{x:5,y:5,w:24,h:5},logoBranco:logo,logoVersao:VERSAO_LOGOTIPO_BRANCO_RESERVA,camadasPreparadas:true,camadasVersao:2,sombreados:[],graficos:[],formas:[{id:'forma-1',nome:'Cartão',x:10,y:40,w:70,h:10,cor:'#ffffff',opacidade:.6,figura:'poligono',raio:0,pontos:[{x:0,y:0},{x:100,y:10},{x:90,y:100},{x:0,y:90}]}],ajustes:ajustesIniciaisPublicacao(textos)};
    editor.ajustes.textos[0]!.texto='Madeira — oferta';
    editor.ajustes.textos[0]!.x=12;
    editor.ajustes.formas=[{id:'forma-1',cor:'#ffcc00'}];
    editor.ajustes.marca={x:60,y:80};
    registos.set(`reservas:imagem:v1:${email}:${r.id}`,r);
    registos.set(`reservas:editor:v1:${email}:${r.id}`,editor);
    assert.equal((await abrirEstudio(email,r.id)).projeto,null);
    falharImagem=true;
    await assert.rejects(()=>prepararEstudio(email,r.id),/Não foi possível separar/);
    assert.equal((await abrirEstudio(email,r.id)).projeto,null);
    assert.deepEqual(await abrirImagemReserva(email,r.id),r);
    falharImagem=false;
    const projeto=await prepararEstudio(email,r.id);
    assert.equal(chamadasIA,2,'A preparação faz uma única chamada de imagem por tentativa');
    assert.equal(projeto.elementos.find(e=>e.tipo==='texto')!.texto,'Madeira — oferta');
    assert.equal(projeto.elementos.find(e=>e.tipo==='texto')!.sombraTexto,true);
    assert.equal(projeto.elementos.find(e=>e.tipo==='texto')!.x,12);
    assert.equal(projeto.elementos.find(e=>e.tipo==='forma')!.cor,'#ffcc00');
    assert.equal(projeto.elementos.find(e=>e.tipo==='marca')!.x,60);
    assert.equal(projeto.elementos.find(e=>e.tipo==='forma')!.opacidade,.6);
    assert.deepEqual(await prepararEstudio(email,r.id),projeto);
    assert.equal(chamadasIA,2,'Reabrir não volta a preparar com IA');

    const rejeita=(mudar:(p:ProjetoEstudio)=>void)=>{const p=structuredClone(projeto);mudar(p);assert.throws(()=>validarProjetoEstudio(p,projeto));};
    rejeita(p=>{p.elementos=p.elementos.filter(e=>e.tipo!=='marca');});
    rejeita(p=>{p.elementos.find(e=>e.tipo==='marca')!.oculto=true;});
    rejeita(p=>{p.elementos.find(e=>e.tipo==='marca')!.opacidade=.5;});
    rejeita(p=>{p.elementos.push({...elementoEstudio('imagem','copia'),recurso:'marca'});});
    rejeita(p=>{p.elementos[0]!.x=NaN;});
    rejeita(p=>{p.elementos[0]!.w=101;});
    rejeita(p=>{p.elementos.push(p.elementos[0]!);});
    rejeita(p=>{p.recursos.fundo='https://example.com/imagem.png';});
    rejeita(p=>{p.recursos.fundo='';});
    rejeita(p=>{p.recursos.fundo=null as unknown as string;});
    rejeita(p=>{p.fundo='marca';});
    rejeita(p=>{p.elementos.push({...elementoEstudio('imagem','sem-recurso'),recurso:'inexistente'});});
    const tentativaMarca=structuredClone(projeto);tentativaMarca.recursos.marca=url(base);
    assert.equal(validarProjetoEstudio(tentativaMarca,projeto).recursos.marca,logo);

    // Renderização: cor, transparência e contorno sobrevivem à troca do fundo.
    const tela=createCanvas(1080,1920),ctx=tela.getContext('2d');
    const visual:ProjetoEstudio={...projeto,fundo:'',corFundo:'#ffffff',elementos:[{...elementoEstudio('forma','quadrado'),x:10,y:10,w:20,h:20,cor:'#ff0000',opacidade:.5}]};
    desenharEstudio(ctx as unknown as CanvasRenderingContext2D,visual,new Map());
    const pixel=ctx.getImageData(200,300,1,1).data;
    assert.equal(pixel[0],255);assert(Math.abs(pixel[1]!-127)<=1);assert.equal(pixel[1],pixel[2]);
    visual.elementos[0]!.figura='poligono';visual.elementos[0]!.pontos=[{x:0,y:0},{x:100,y:0},{x:0,y:100}];
    desenharEstudio(ctx as unknown as CanvasRenderingContext2D,visual,new Map());
    assert.deepEqual([...ctx.getImageData(300,550,1,1).data],[255,255,255,255]);
    const imgs=new Map<string,CanvasImageSource>();
    for(const [id,src] of Object.entries(projeto.recursos)) imgs.set(id,await loadImage(Buffer.from(src.split(',')[1]!,'base64')) as unknown as CanvasImageSource);
    desenharEstudio(ctx as unknown as CanvasRenderingContext2D,projeto,imgs);

    const editado=structuredClone(projeto);editado.formato='feed';
    editado.elementos.find(e=>e.tipo==='texto')!.texto='Texto corrigido';
    editado.elementos.push({...elementoEstudio('texto','novo-texto'),texto:'Novo texto'});
    const anterior=structuredClone(r),gravada=await guardarEstudio(email,r.id,editado);
    assert.notEqual(gravada.id,r.id);assert.equal(gravada.anteriorId,r.id);
    assert.equal(gravada.formato,'feed');assert.deepEqual(gravada.dados,r.dados);
    assert.deepEqual(await abrirImagemReserva(email,r.id),anterior);
    const reaberto=(await abrirEstudio(email,gravada.id)).projeto!;
    assert.equal(reaberto.elementos.find(e=>e.id==='novo-texto')!.texto,'Novo texto');
    const meta=await sharp(Buffer.from(gravada.imagem!.split(',')[1]!,'base64')).metadata();
    assert.equal(meta.width,1080);assert.equal(meta.height,1350);
    await assert.rejects(()=>abrirEstudio('outra@example.com',gravada.id),/não existe/);
    await assert.rejects(()=>guardarEstudio('outra@example.com',gravada.id,editado),/não existe/);
    const quantidade=registos.size;falharGravacao=true;
    await assert.rejects(()=>guardarEstudio(email,gravada.id,reaberto),/Falha simulada/);
    assert.equal(registos.size,quantidade,'Uma falha não deixa publicação ou projeto parcial');
    assert.deepEqual((await abrirEstudio(email,gravada.id)).projeto,reaberto);
    falharGravacao=false;
    const invalido=structuredClone(reaberto);invalido.recursos.fundo='data:image/png;base64,YWJj';
    await assert.rejects(()=>guardarEstudio(email,gravada.id,invalido),/imagens não é válida/);
    assert.equal(chamadasIA,2,'Guardar, reabrir e validar são operações sem IA');

    // Editores antigos com fotografia própria são importados sem nova geração.
    const outro={...r,id:randomUUID()};
    const comFundo=structuredClone(editor);comFundo.ajustes.fundo=url(base);comFundo.ajustes.escurecimento=.5;
    registos.set(`reservas:imagem:v1:${email}:${outro.id}`,outro);
    registos.set(`reservas:editor:v1:${email}:${outro.id}`,comFundo);
    const importado=await prepararEstudio(email,outro.id);
    assert.equal(chamadasIA,2);assert.equal(importado.recursos.fundo,url(base));
    assert.equal(importado.elementos.find(e=>e.id==='escurecimento')!.cor,'#000000');
    const apagado=structuredClone(comFundo);apagado.ajustes.textos[0]!.apagado=true;
    assert.equal(projetoDoEditor(apagado,'story',url(base)).elementos.find(e=>e.tipo==='texto')!.oculto,true);
    await apagarImagemReserva(email,gravada.id);
    assert(!registos.has(`reservas:estudio:v1:${email}:${gravada.id}`));
    assert(registos.has(`reservas:estudio:v1:${email}:${r.id}`),'Apagar uma versão conserva o original');
    console.log('OK: estúdio — preparação, migração, camadas, marca, validação, versões, isolamento e recuperação de falhas.');
  } finally {
    pool.query=query;globalThis.fetch=fetchOriginal;
    if(apiKey===undefined) delete process.env.RESERVAS_IMAGE_API_KEY;else process.env.RESERVAS_IMAGE_API_KEY=apiKey;
    await fecharDb();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
