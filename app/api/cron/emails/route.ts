import { verificarSegredoCron } from '@/lib/cron-auth';
import { processarCampanhas } from '@/lib/campanhas-email';
export const maxDuration=60;
export async function GET(request:Request) {
 const erro=verificarSegredoCron(request); if(erro) return erro;
 return Response.json(await processarCampanhas());
}
