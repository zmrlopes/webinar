import {NextResponse} from 'next/server';
import {acessoReservas,lerBytesReserva} from '@/lib/reservas-servidor';
import {ErroReserva} from '@/lib/reservas';
import {abrirEstudio,prepararEstudio,guardarEstudio} from '@/lib/reservas-estudio-servidor';
export const runtime='nodejs';
export const maxDuration=300;
export async function POST(request:Request){
  const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
  try{
    const bytes=await lerBytesReserva(request.body,4_100_000);let corpo;
    try{corpo=JSON.parse(new TextDecoder().decode(bytes));if(!corpo||typeof corpo!=='object'||Array.isArray(corpo))throw new Error();}catch{throw new ErroReserva('Pedido inválido.');}
    const email=await acessoReservas(corpo.email);
    if(corpo.acao==='abrir')return json(await abrirEstudio(email,corpo.id));
    if(corpo.acao==='preparar')return json(await prepararEstudio(email,corpo.id));
    if(corpo.acao==='guardar')return json(await guardarEstudio(email,corpo.id,corpo.projeto));
    throw new ErroReserva('Ação inválida.');
  }catch(e){if(e instanceof ErroReserva)return json({erro:e.message},e.status);console.error('Estúdio de templates:',e instanceof Error?e.name:'erro');return json({erro:'Não foi possível concluir. A publicação original continua guardada.'},500);}
}
