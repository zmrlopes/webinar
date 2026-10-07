import { descarregarDocumento,validarLinkDocumento } from '@/lib/documentos';
export const maxDuration=300;
export async function GET(request: Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/i.test(id) || !validarLinkDocumento(id,new URL(request.url))) return Response.json({erro:'volta à área Documentos para obter um novo link'},{status:403});
  return descarregarDocumento(id,request);
}
