import { elementoReserva, marcaReserva, precoPessoaReserva, validarMaterialReserva, type CampoReserva, type DadosReserva, type ElementoReserva, type FormatoReserva, type MaterialReserva } from "./reservas";

export const ESTILOS_RESERVA = [{id:"elegante", nome:"Elegante", descricao:"Fotografia em destaque, cartão claro e preço central."}, {id:"fotografico", nome:"Fotográfico", descricao:"Imagem de fundo, título amplo e informação sobreposta."}] as const;
export type EstiloReserva = typeof ESTILOS_RESERVA[number]["id"];
export interface FotografiaModeloReserva {imagem: string; credito?: string; origem?: string}

/** Compõe dados confirmados em layouts estáveis; não precisa de reconstruir uma imagem. */
export function comporModeloReserva(dados: DadosReserva, formato: FormatoReserva, estilo: EstiloReserva, fotografia: FotografiaModeloReserva, hotel = 0): MaterialReserva {
  const opcao = dados.hoteis[hotel];
  if (!opcao) throw new Error("Escolhe uma opção de hotel do orçamento.");
  if (!dados.destino.trim()) throw new Error("Confirma o destino antes de gerar o template.");
  if (!fotografia.imagem) throw new Error("Escolhe uma fotografia para o template.");
  const d: DadosReserva = {...structuredClone(dados), hoteis:[structuredClone(opcao)]};
  const es: ElementoReserva[] = [];
  const escuro = estilo === "fotografico", tinta = escuro ? "#ffffff" : "#293018", suave = escuro ? "#e2e6d5" : "#74765e";
  const forma = (nome: string, x: number, y: number, w: number, h: number, cor: string, raio = 0, opacidade = 1) => {
    const e = {...elementoReserva("forma", nome, {x,y,w,h}), cor, raio, opacidade}; es.push(e); return e;
  };
  const texto = (nome: string, campo: CampoReserva, x: number, y: number, w: number, h: number, tamanho: number, extra: Partial<ElementoReserva> = {}) => {
    const e = {...elementoReserva("texto", nome, {x,y,w,h}), campo, cor:tinta, tamanho, fonte:"geometrica" as const, vertical:"middle" as const, ...extra}; es.push(e); return e;
  };
  const livre = (nome: string, conteudo: string, x: number, y: number, w: number, h: number, tamanho: number, extra: Partial<ElementoReserva> = {}) => texto(nome,"livre",x,y,w,h,tamanho,{texto:conteudo,...extra});
  es.push({...elementoReserva("foto","Fotografia do destino",{x:0,y:0,w:100,h:escuro?100:53}),...fotografia});
  if (escuro) {
    es.push({...elementoReserva("forma","Degradé de leitura",{x:0,y:30,w:100,h:70}),cor:"#11170b",opacidade:0,corFinal:"#11170b",opacidadeFinal:.96});
    livre("Etiqueta","A TUA PRÓXIMA VIAGEM",8,45,84,2.5,2.1,{alinhar:"left",negrito:true,cor:suave});
    texto("Destino","destino",8,49,84,10,12,{alinhar:"left",negrito:true});
    if (d.frase) texto("Frase promocional","frase",8,60,84,4.3,3.3,{alinhar:"left"});
  } else {
    forma("Sombra do cartão",4,35.4,92,61,"#293018",3.4,.06);
    forma("Cartão da viagem",5,34.7,90,61,"#fcfaf4",3);
    livre("Etiqueta","VIAGENS QUE FICAM CONTIGO",12,38,76,2,1.8,{cor:suave,negrito:true});
    texto("Destino","destino",10,41,80,7.5,10,{fonte:"serif",negrito:true});
    if (d.frase) texto("Frase promocional","frase",13,49,74,3.2,2.5,{cor:suave,fonte:"serif"});
  }
  const x = escuro ? 8 : 13, w = escuro ? 84 : 74;
  const linhas: [string, CampoReserva][] = [];
  if (d.ida || d.regresso) linhas.push(["Datas","datas"]);
  if (d.partida) linhas.push(["Partida","partida"]);
  if (opcao.nome) linhas.push(["Hotel","hotel"]);
  if (opcao.regime) linhas.push(["Regime","regime"]);
  const inicio = escuro ? 66 : 54, passo = escuro ? 3.3 : 3.7;
  linhas.forEach(([rotulo,campo], i) => {
    const y = inicio+i*passo;
    livre(`Rótulo ${rotulo}`,rotulo.toLocaleUpperCase("pt-PT"),x,y,w*.24,2.5,1.7,{alinhar:"left",negrito:true,cor:suave});
    texto(rotulo,campo,x+w*.26,y,w*.74,2.8,campo==="hotel"?2.5:2.7,{alinhar:"left",negrito:campo==="hotel"});
    if (!escuro && i<linhas.length-1) forma(`Separador ${i+1}`,x,y+3.15,w,.5,"#e1decf",0,.45);
  });
  const precoY = escuro ? 79.5 : 71;
  if (!escuro) {forma("Contorno do preço",12,precoY,76,12.8,"#d8d3bb",1.5);forma("Fundo do preço",12.15,precoY+.1,75.7,12.6,"#fcfaf4",1.4);}
  livre("Preço desde","DESDE",x,precoY+.6,w,1.8,1.7,{cor:suave,alinhar:escuro?"left":"center"});
  texto("Preço por pessoa","preco",x,precoY+2.5,w,escuro?6:7.5,escuro?9:10,{fonte:escuro?"geometrica":"serif",negrito:true,alinhar:escuro?"left":"center"});
  livre("Unidade do preço","por pessoa",x,precoY+(escuro?8.5:10),w,1.8,1.8,{cor:suave,alinhar:escuro?"left":"center"});
  // Cada serviço depende dos dados do orçamento. Não inclui seguros, voos ou transfers por defeito.
  const servicos = [d.bagagem?{campo:"bagagem" as const,nome:"Bagagem"}:null,d.transfer?{campo:"transfer" as const,nome:"Transfer"}:null].filter((v): v is {campo:"bagagem"|"transfer";nome:string}=>!!v);
  if (servicos.length) servicos.forEach((s,i)=>texto(s.nome,s.campo,x+i*w/servicos.length,escuro?90.5:85.5,w/servicos.length-2,2.3,1.7,{cor:suave,alinhar:escuro?"left":"center"}));
  livre("Convite","PEDE O TEU ORÇAMENTO PERSONALIZADO",x,escuro?94:89,w,2,1.8,{negrito:true,alinhar:escuro?"left":"center"});
  if (d.condicoes) texto("Condições","condicoes",x,escuro?96:92,w,escuro?2.5:3.7,1.25,{cor:suave,alinhar:escuro?"left":"center"});
  es.push(marcaReserva({x:65,y:3,w:28,h:5}));
  return validarMaterialReserva({versao:1,nome:`${d.destino} · ${opcao.nome||"Viagem"}`.slice(0,120),formato,fundo:escuro?"#11170b":"#f1eee5",fundoFinal:escuro?"#11170b":"#f1eee5",referencia:"",maxHoteis:1,elementos:es,dados:d,marcaEstilo:escuro?"clara":"cartao"});
}

export function legendaMaterialReserva(m: MaterialReserva): string {
  const d=m.dados,h=d.hoteis[0],preco=h?precoPessoaReserva(d,h):null;
  return [d.destino,d.frase,[d.ida,d.regresso].filter(Boolean).map(v=>v.split("-").reverse().join("/")).join(" — "),h?.nome,h?.regime,d.partida?`Partida: ${d.partida}`:"",preco===null?"":`Desde ${new Intl.NumberFormat("pt-PT",{maximumFractionDigits:2}).format(preco)} € por pessoa`,d.bagagem,d.transfer,d.condicoes,"Pede o teu orçamento personalizado."].filter(Boolean).join("\n");
}
