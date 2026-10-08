import { buscarMembroEquipa } from '@/lib/equipa';
import { listarDocumentos,linkDocumento } from '@/lib/documentos';
import { listarPastasDocumentos } from '@/lib/documentos-pastas';
export async function POST(request: Request) {
  const c=await request.json().catch(()=>null);
  if(typeof c?.email!=='string' || !c.email.includes('@')) return Response.json({erro:'email inválido'},{status:400});
  const email=c.email.trim().toLowerCase();
  if(!await buscarMembroEquipa(email)) return Response.json({erro:'esta área é só para a equipa'},{status:403});
  const [documentos,pastas]=await Promise.all([listarDocumentos(),listarPastasDocumentos()]);
  return Response.json({documentos:documentos.map(d=>({...d,url:linkDocumento(d.id)})),pastas},{headers:{'Cache-Control':'private, no-store'}});
}
