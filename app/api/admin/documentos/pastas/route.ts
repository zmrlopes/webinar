import { criarPastaDocumentos, listarPastasDocumentos } from '@/lib/documentos-pastas';

export async function GET() {
  return Response.json({pastas: await listarPastasDocumentos(true)}, {headers: {'Cache-Control': 'private, no-store'}});
}
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  if (typeof corpo?.nome !== 'string' || !corpo.nome.trim() || corpo.nome.trim().length > 150) {
    return Response.json({erro: 'Indica um nome para a pasta, até 150 caracteres.'}, {status: 400});
  }
  const pasta = await criarPastaDocumentos(corpo.nome);
  if (!pasta) return Response.json({erro: 'Já existe uma pasta com esse nome.'}, {status: 409});
  return Response.json({pasta}, {headers: {'Cache-Control': 'private, no-store'}});
}
