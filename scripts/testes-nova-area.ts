import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {db, fecharDb} from "../src/lib/db";
import {EMAIL_PAINEL_DEMONSTRACAO} from "../src/lib/demo";
import {EMAIL_PILOTO_NOVA_AREA, destinoEntradaNovaArea, linkAreaAtual, podeVerNovaArea} from "../src/lib/consultor-nova-area";
import {chaveProgressoLocalPrimeirosPassos, lerProgressoLocalPrimeirosPassos} from "../src/lib/primeiros-passos";
import {CONFIG_BF, hojeBF, periodoBF, type InscricaoBF} from "../src/lib/blackfriday";
import {POST as entrada} from "../app/api/consultor/nova-area/route";
import {POST as bingo} from "../app/api/consultor/nova-area/blackfriday/route";
import {POST as adminBingo} from "../app/api/consultor/blackfriday-equipa/route";
import {POST as importar, PATCH as marcar} from "../app/api/consultor/nova-area/progresso/route";
import {acessoReservas} from "../src/lib/reservas-servidor";

const ana = EMAIL_PILOTO_NOVA_AREA, demo = EMAIL_PAINEL_DEMONSTRACAO, tp = "tp-da-ana@example.com", outro = "outra-equipa@example.com";
const pedido = (corpo: unknown) => new Request("http://localhost/api", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(corpo)});
const normalizado = ` ${ana.toUpperCase()} `;
assert(podeVerNovaArea(ana)); assert(podeVerNovaArea(normalizado)); assert(podeVerNovaArea(demo));
for (const email of [tp, outro, "", "__proto__"]) assert(!podeVerNovaArea(email));
assert.equal(destinoEntradaNovaArea(normalizado,""),"/consultor/nova-area");
assert.equal(destinoEntradaNovaArea(ana,"?area=atual"),null,"A comparação com a área atual não pode criar um ciclo");
for (const email of [demo,tp,outro]) assert.equal(destinoEntradaNovaArea(email,""),null);
assert.equal(linkAreaAtual(ana),"/consultor?area=atual"); assert.equal(linkAreaAtual(demo),"/consultor");
const local = new Map<string,string>([["consultor-nova-area:primeiros-passos:v2","[1,3,4]"]]);
const armazenamento = {getItem:(chave:string)=>local.get(chave)??null};
assert.deepEqual(lerProgressoLocalPrimeirosPassos(ana,armazenamento),[],"Não importa marcas de demonstração para a Ana");
assert.deepEqual(lerProgressoLocalPrimeirosPassos(demo,armazenamento),[1,3,4]);
local.set(chaveProgressoLocalPrimeirosPassos(ana),"[2,7]");
assert.deepEqual(lerProgressoLocalPrimeirosPassos(normalizado,armazenamento),[2,7]);
assert.deepEqual(lerProgressoLocalPrimeirosPassos(demo,armazenamento),[1,3,4]);
local.set(chaveProgressoLocalPrimeirosPassos(demo),"[]");
assert.deepEqual(lerProgressoLocalPrimeirosPassos(demo,armazenamento),[],"Não recupera marcas antigas que já foram desmarcadas");
assert.deepEqual(lerProgressoLocalPrimeirosPassos(ana,{getItem:()=>{throw Error("bloqueado");}}),[]);

async function main() {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost/test";
  const pool=db(), originalQuery=pool.query, originalConnect=pool.connect, originalFetch=globalThis.fetch;
  const dados=new Map<string,unknown>();
  const progresso=(email:string,versao=2)=>`consultor:primeiros-passos:${email}:v${versao}`;
  const reserva=(email:string):InscricaoBF=>({id:randomUUID(),email,nome:email,casa:0,referencia:randomUUID(),valorCentimos:500000,dataReserva:hojeBF(),curinga:true,estado:"pendente",enviadoEm:new Date().toISOString(),ficheiroNome:"prova.pdf",ficheiroTipo:"application/pdf",hash:randomUUID(),revisoes:[]});
  const pessoal=reserva(ana), equipa=reserva(tp), exterior=reserva(outro);
  const periodo=periodoBF(CONFIG_BF,hojeBF());
  const faturacao={valor:345678,periodo:CONFIG_BF.periodoFaturacao,...periodo,atualizadoEm:new Date().toISOString()};
  dados.set("blackfriday:2026:config",CONFIG_BF);
  dados.set(`blackfriday:2026:faturacao:${ana}`,faturacao);
  dados.set("blackfriday:2026:faturacao",{...faturacao,valor:987654});
  for(const r of [pessoal,equipa,exterior]) {
    dados.set(`blackfriday:2026:reserva:${r.id}`,r);
    dados.set(`blackfriday:2026:ficheiro:${r.id}`,{base64:Buffer.from("%PDF-teste").toString("base64")});
  }
  dados.set("blackfriday:2026:simulacao:reserva:preservar",{teste:true});
  dados.set(progresso(ana,1),[1,3,4]); dados.set(progresso(demo),[1,2,3,4,5,6,7]);
  let escritas=0;
  pool.query=(async(sql:string,args:unknown[]=[])=>{
    const texto=sql.trim(), chave=String(args[0]);
    if (/^(begin|commit|rollback)/.test(texto)||texto.includes("pg_advisory_xact_lock")) return {rows:[]};
    if(texto.startsWith("with recursive descendentes")) return {rows:[{email:tp}]};
    if(texto.startsWith("with recursive arvore")) return {rows:[{total:"1",ativos:"1",entradas:"1"}]};
    if(texto.startsWith("with recursive ascendentes")) return {rows:[{email:ana}]};
    if(texto.includes("select membro.nome")) return {rows:chave===ana?[{nome:"Ana Custódia",upline_email:demo,upline_nome:"Mentor"}]:[]};
    if(texto.startsWith("select nome from equipa_afiliados")) return {rows:[ana,demo,tp,outro].includes(chave)?[{nome:chave===ana?"Ana Custódia":"TP"}]:[]};
    if(texto.includes("select referencia from links_consultor")) return {rows:[{referencia:"ana-custodia"}]};
    if(texto.startsWith("select r.valor")) {
      const r=dados.get(chave) as InscricaoBF|undefined, ficheiro=dados.get(String(args[1])) as {base64:string}|undefined;
      return {rows:r&&ficheiro&&(!args[2]||r.email===args[2])?[{valor:structuredClone(r),base64:ficheiro.base64}]:[]};
    }
    if(texto.startsWith("select chave, valor")&&texto.includes("any")) return {rows:(args[0] as string[]).filter(k=>dados.has(k)).map(k=>({chave:k,valor:structuredClone(dados.get(k))}))};
    if(texto.startsWith("select valor from dashboard_config where starts_with")) {
      const rows=[...dados.entries()].filter(([k,v])=>k.startsWith(chave)&&(!args[1]||(v as InscricaoBF).email===args[1])&&(!args[2]||(args[2] as string[]).includes((v as InscricaoBF).email)));
      return {rows:rows.map(([,valor])=>({valor:structuredClone(valor)}))};
    }
    if(texto.startsWith("select valor from dashboard_config where chave = $1")) return {rows:dados.has(chave)?[{valor:structuredClone(dados.get(chave))}]:[]};
    if(texto.startsWith("update dashboard_config")) {escritas++;dados.set(chave,JSON.parse(String(args[1])));return {rows:[]};}
    if(texto.startsWith("insert into dashboard_config")) {
      escritas++;
      if(typeof args[2]==="boolean") {
        const atual=(dados.get(chave)??[]) as number[];
        dados.set(chave,[...atual.filter(n=>n!==args[1]),...(args[2]?[Number(args[1])]:[])].sort());
      } else if(!dados.has(chave)) dados.set(chave,JSON.parse(String(args[1])));
      return {rows:[{valor:structuredClone(dados.get(chave))}]};
    }
    if(texto.startsWith("select")||texto.startsWith("with")) return {rows:[]};
    throw Error("Consulta inesperada: "+texto.slice(0,100));
  }) as typeof pool.query;
  pool.connect=(async()=>({query:pool.query,release:()=>{}})) as unknown as typeof pool.connect;
  globalThis.fetch=(async()=>{throw Error("Os testes não podem chamar serviços externos");}) as typeof fetch;
  try {
    const antes=structuredClone(dados);
    const entradaAna=await entrada(pedido({email:normalizado})); assert.equal(entradaAna.status,200);
    const pagina=await entradaAna.json();
    assert.equal(pagina.nome,"Ana Custódia"); assert.equal(pagina.linkPartilha,"http://localhost/ana-custodia");
    assert.deepEqual(pagina.upline,{nome:"Mentor",email:demo},"Carrega o perfil completo, em vez dos dados vazios de Admin");
    assert.deepEqual(pagina.primeirosPassos,{feitos:[3,4,5],guardado:false});
    assert.equal(pagina.linkGrupoWelcomeAboard,"https://chat.whatsapp.com/CDFcyL0eYXc0kVl8Fp7XMK");
    assert.equal((await entrada(pedido({email:tp}))).status,403);
    assert.equal(await acessoReservas(normalizado),ana);
    await assert.rejects(()=>acessoReservas(tp),/disponível/);
    const real=await bingo(pedido({email:ana,acao:"consultar"})); assert.equal(real.status,200);
    const cartao=await real.json();
    assert.equal(cartao.metaEquipa.meta,1200000); assert.equal(cartao.metaEquipa.faturacao.valor,faturacao.valor);
    assert.deepEqual(cartao.inscricoes,[pessoal]); assert.equal(cartao.simulacao,false);
    for(const acao of ["consultar","enviar","comprovativo","limpar-simulacao"]) assert.equal((await bingo(pedido({email:ana,acao,simulacao:true,id:pessoal.id}))).status,403);
    const prova=await bingo(pedido({email:ana,acao:"comprovativo",id:pessoal.id}));
    assert.equal(prova.status,200); assert.equal(await prova.text(),"%PDF-teste");
    assert.equal((await bingo(pedido({email:ana,acao:"comprovativo",id:equipa.id}))).status,404);
    const admin=await adminBingo(pedido({email:ana,acao:"listar"})); assert.equal(admin.status,200);
    const painel=await admin.json(); assert.equal(painel.reservas.length,2); assert.equal(painel.meta,1200000);
    assert.deepEqual(painel.estatisticas,{total:1,ativos:1,entradasEsteAno:1});
    assert.equal((await adminBingo(pedido({email:tp,acao:"listar"}))).status,403);
    assert.equal((await adminBingo(pedido({email:demo,acao:"listar"}))).status,403);
    assert.equal((await adminBingo(pedido({email:ana,acao:"rever",id:exterior.id,estado:"aprovada",motivo:""}))).status,403);
    assert.equal(escritas,0); assert.deepEqual(dados,antes,"A migração e as consultas não reescrevem reservas, ficheiros ou progresso");
    const revisao=await adminBingo(pedido({email:ana,acao:"rever",id:equipa.id,estado:"aprovada",motivo:""}));
    assert.equal(revisao.status,200);
    const depois=await revisao.json(); assert.deepEqual(depois.estatisticas,painel.estatisticas,"A revisão mantém os indicadores necessários ao painel");
    const aprovada=depois.reservas.find((r:InscricaoBF)=>r.id===equipa.id);
    assert.equal(aprovada.estado,"aprovada"); assert.equal(aprovada.enviadoEm,equipa.enviadoEm); assert.equal(aprovada.revisoes.length,1);
    assert.deepEqual(dados.get(`blackfriday:2026:ficheiro:${equipa.id}`),antes.get(`blackfriday:2026:ficheiro:${equipa.id}`));
    assert.deepEqual(dados.get("blackfriday:2026:simulacao:reserva:preservar"),{teste:true});
    assert.equal((await importar(pedido({email:ana,versao:2,feitos:pagina.primeirosPassos.feitos}))).status,200);
    assert.deepEqual(dados.get(progresso(ana)),[3,4,5]);
    await importar(pedido({email:ana,versao:2,feitos:[1,2,3,4,5,6,7]}));
    assert.deepEqual(dados.get(progresso(ana)),[3,4,5],"Reabrir uma aba não substitui o progresso já importado");
    assert.equal((await marcar(pedido({email:ana,versao:2,passo:3,concluido:false}))).status,200);
    assert.deepEqual(dados.get(progresso(ana)),[4,5]); assert.deepEqual(dados.get(progresso(ana,1)),[1,3,4]);
    assert.deepEqual(dados.get(progresso(demo)),[1,2,3,4,5,6,7]);
    assert.equal((await importar(pedido({email:tp,versao:2,feitos:[]}))).status,403);
    console.log("OK: migração exclusiva da Ana, entrada por defeito e regresso à área atual, perfil/API completos, progresso privado, meta de 1,2 M€, comprovativos existentes, revisão e estatísticas preservadas, equipa limitada e simulação bloqueada. Sem rede nem dados reais alterados.");
  } finally {pool.query=originalQuery;pool.connect=originalConnect;globalThis.fetch=originalFetch;await fecharDb();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
