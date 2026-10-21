import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import sharp from "sharp";
import {db, fecharDb} from "../src/lib/db";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {dadosReservaVazios, hotelVazio} from "../src/lib/reservas";
import {dadosPublicacaoReserva, textosPublicacaoReserva,promptPublicacaoReserva, type RegistoImagemReserva} from "../src/lib/reservas-imagem";
import {abrirImagemReserva, apagarImagemReserva, criarReferenciaImagemReserva, gerarImagemReserva, listarImagensReserva, verificarImagemReserva,finalizarImagemReserva} from "../src/lib/reservas-imagem-servidor";
import {POST} from "../app/api/consultor/nova-area/reservas/imagem/route";

async function main() {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const email = EMAIL_PAINEL_DEMONSTRACAO, pool = db(), query = pool.query, fetchOriginal = globalThis.fetch, chave = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "teste-sem-rede";
  const registos = new Map<string, RegistoImagemReserva>();
  pool.query = (async (sql: string, args: unknown[] = []) => {
    const key = String(args[0]);
    if (sql.includes("equipa_afiliados")) return {rows:[{email,nome:"Teste"}]};
    if (sql.includes("'janela'")) return {rows:[{chave:key}]};
    if (sql.startsWith("insert into")) {
      if(sql.includes("do nothing") && registos.has(key)) return {rows:[]};
      registos.set(key, JSON.parse(String(args[1]))); return {rows:[{chave:key}]};
    }
    if(sql.startsWith("delete")) {registos.delete(key);return {rows:[]};}
    if(sql.includes("where chave = $1")) return {rows:registos.has(key)?[{valor:structuredClone(registos.get(key))}]:[]};
    if(sql.includes("referenciaId")) return {rows:[...registos.entries()].filter(([k,v])=>k.startsWith(key)&&v.tipo==="publicacao"&&v.referenciaId===args[1]).map(([k])=>({chave:k}))};
    if(sql.includes("jsonb_build_object")) return {rows:[...registos.entries()].filter(([k])=>k.startsWith(key)).map(([,v])=>({resumo:{id:v.id,tipo:v.tipo,nome:v.nome,miniatura:v.miniatura,formato:v.formato},atualizado_em:new Date()}))};
    throw Error("Consulta inesperada: "+sql.slice(0,60));
  }) as typeof pool.query;
  try {
    for(const acao of ["listar","abrir","referencia","gerar","verificar","apagar"]) assert.equal((await POST(new Request("http://localhost/api",{method:"POST",body:JSON.stringify({email:"outra@example.com",acao})}))).status,403);
    assert.equal((await POST(new Request("http://localhost/api",{method:"POST",body:"{"}))).status,400);
    assert.equal((await POST(new Request("http://localhost/api",{method:"POST",body:"x".repeat(1_350_001)}))).status,413);
    const dados = {...dadosReservaVazios(),destino:"Gran Canaria",partida:"Lisboa",ida:"2026-11-17",regresso:"2026-11-22",viajantes:3,condicoes:"",hoteis:[{...hotelVazio(),nome:"Lopesan Baobab Resort",regime:"Pensão Completa",total:4405}]};
    assert.equal(textosPublicacaoReserva(dados).preco,"1468,33 € / PESSOA");
    assert.equal(textosPublicacaoReserva(dados).basePreco,"Preço médio por pessoa para 3 viajantes");
    assert.throws(()=>dadosPublicacaoReserva({...dados,viajantes:null}));
    assert.throws(()=>dadosPublicacaoReserva({...dados,ida:""}));
    assert.throws(()=>dadosPublicacaoReserva({...dados,hoteis:[dados.hoteis[0],hotelVazio()]}));
    const refBytes = await sharp({create:{width:540,height:960,channels:3,background:"#123456"}}).webp().toBuffer();
    const imageBytes = await sharp({create:{width:1008,height:1792,channels:3,background:"#123456"}}).webp().toBuffer();
    const referencia = `data:image/webp;base64,${refBytes.toString("base64")}`;
    let imagens = 0, modo: "sucesso"|"falha" = "sucesso", ultimoForm: FormData | undefined;
    globalThis.fetch = (async (url, init) => {
      if(String(url).endsWith("/images/edits")) {
        imagens++;ultimoForm=init!.body as FormData;
        if(modo==="falha")return Response.json({error:{code:"permission_denied"}},{status:403});
        const outputBytes=ultimoForm.get("size")==="1024x1280"?await sharp(imageBytes).resize(1024,1280).webp().toBuffer():imageBytes;
        return Response.json({data:[{b64_json:outputBytes.toString("base64")}]});
      }
      assert.equal(String(url),"https://api.openai.com/v1/responses");
      const body=JSON.parse(String(init!.body));
      assert.equal(body.store,false);
      const output=body.instructions.startsWith("Confere")?{avisos:["Confirma a legibilidade das datas."]}:{estilo:"Título grande branco alinhado à esquerda, fotografia de fundo com degradé escuro, preço destacado junto ao rodapé.",temMarca:false,marca:{x:36,y:3,w:28,h:5}};
      return Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(output)}]}]});
    }) as typeof fetch;
    await assert.rejects(()=>criarReferenciaImagemReserva(email,{nome:"Teste",imagem:"https://example.com/ref.png"}));
    await assert.rejects(()=>criarReferenciaImagemReserva(email,{nome:"Teste",imagem:"data:image/png;base64,aGVsbG8="}));
    const ref=await criarReferenciaImagemReserva(email,{nome:"Referência pessoal",imagem:referencia});
    assert.equal(ref.formato,"story");assert(!("dados" in ref));assert(ref.imagem.startsWith("data:image/webp"));
    assert.equal((await listarImagensReserva(email)).length,1);
    assert.equal((await listarImagensReserva("outra@example.com")).length,0);
    await assert.rejects(()=>abrirImagemReserva("outra@example.com",ref.id),/não existe/);
    const pedido={id:randomUUID(),referenciaId:ref.id,dados,formato:"story",notas:"Mantém as cores.",confirmado:true};
    await assert.rejects(()=>gerarImagemReserva(email,{...pedido,confirmado:false}),/Confirma/);
    await assert.rejects(()=>gerarImagemReserva("outra@example.com",pedido),/não existe/);
    assert.equal(imagens,0);
    const r=await gerarImagemReserva(email,pedido);
    assert.equal(r.estado,"pronta");assert(r.imagem);assert.equal(imagens,1);
    assert.equal(ultimoForm!.get("size"),"1008x1792");assert.equal(ultimoForm!.getAll("image[]").length,1);
    const prompt=String(ultimoForm!.get("prompt"));
    const textoArte=(p:string)=>JSON.parse(p.split("ALLOWED ARTWORK TEXT (sole authority for travel facts and exact headline): ")[1]!.split("\n")[0]!);
    assert.equal(textoArte(prompt).tituloPromocional,"","Sem frase escolhida, não acrescenta um título com o número de noites");
    assert(!Object.values(textoArte(prompt)).some(v=>typeof v==="string"&&/5 noites em/i.test(v)));
    assert.equal(textoArte(promptPublicacaoReserva(ref,{...dados,frase:"Uma pausa à beira-mar"},"story","",false)).tituloPromocional,"Uma pausa à beira-mar");
    assert.equal(textoArte(promptPublicacaoReserva(ref,{...dados,frase:"   "},"story","",true)).tituloPromocional,"");
    assert(prompt.includes("Do not calculate a duration from the dates"));
    assert(prompt.includes("1468,33 € / PESSOA"));assert(prompt.includes("Pensão Completa"));assert(prompt.includes("17/11/2026"));
    assert(!prompt.includes("input_file"));assert(prompt.includes("first image is the original design reference"));
    const bytes=Buffer.from(r.imagem!.split(",")[1]!,"base64"),meta=await sharp(bytes).metadata();
    assert.equal(meta.width,1080);assert.equal(meta.height,1920);
    const zona=await sharp(bytes).extract({left:390,top:58,width:300,height:95}).raw().toBuffer();assert(zona.some(v=>v>240),"A marca branca é composta no servidor");
    const jaComMarca={...ref,temMarca:true};assert((await finalizarImagemReserva(imageBytes,jaComMarca,"story")).equals(await finalizarImagemReserva(imageBytes,ref,"story",false)),"Uma referência com marca não recebe outra sobreposição");assert(promptPublicacaoReserva(jaComMarca,dados,"story","",false).includes("ALREADY contains"));
    assert.equal((await gerarImagemReserva(email,pedido)).id,r.id);assert.equal(imagens,1,"Repetir o mesmo pedido não cobra nova geração");
    await assert.rejects(()=>apagarImagemReserva(email,ref.id),/acompanha/);
    assert.deepEqual((await verificarImagemReserva(email,r.id)).avisos,["Confirma a legibilidade das datas."]);
    const ajuste=await gerarImagemReserva(email,{...pedido,id:randomUUID(),anteriorId:r.id,notas:"Aumenta o preço"});
    assert.equal(ajuste.anteriorId,r.id);assert.equal(ultimoForm!.getAll("image[]").length,2);
    assert.equal((await abrirImagemReserva(email,r.id)).id,r.id,"Ajustar preserva a versão original");
    const feed=await gerarImagemReserva(email,{...pedido,id:randomUUID(),formato:"feed"});
    const feedMeta=await sharp(Buffer.from(feed.imagem!.split(",")[1]!,"base64")).metadata();
    assert.equal(feedMeta.width,1080);assert.equal(feedMeta.height,1350);
    modo="falha";const falha={...pedido,id:randomUUID()};
    await assert.rejects(()=>gerarImagemReserva(email,falha),/permissão/);
    assert.equal((await abrirImagemReserva(email,falha.id) as Publicacao).estado,"falhou");
    const total=imagens;await gerarImagemReserva(email,falha);assert.equal(imagens,total,"Repetir uma falha também não gera novamente");
    await apagarImagemReserva(email,r.id);await assert.rejects(()=>abrirImagemReserva(email,r.id),/não existe/);
    console.log("OK: referência completa, dados confirmados, isolamento por conta, marca protegida, dimensões finais, ajustes com duas imagens, histórico e idempotência. Sem rede nem dados reais alterados.");
  } finally {pool.query=query;globalThis.fetch=fetchOriginal;if(chave===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=chave;await fecharDb();}
}
type Publicacao = {estado:string};
main().catch(e=>{console.error(e);process.exitCode=1;});
