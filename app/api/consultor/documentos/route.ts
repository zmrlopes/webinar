import { buscarMembroEquipa } from '@/lib/equipa';
import { listarDocumentos,linkDocumento } from '@/lib/documentos';
export async function POST(request: Request) {
  const c=await request.json().catch(()=>null);
  if(typeof c?.email!=='string' || !c.email.includes('@')) return Response.json({erro:'email inválido'},{status:400});
  if(!await buscarMembroEquipa(c.email.trim().toLowerCase())) return Response.json({erro:'esta área é só para a equipa'},{status:403});
  const documentos=await listarDocumentos();
  return Response.json({documentos:documentos.map(d=>({...d,url:linkDocumento(d.id)}))});
}
