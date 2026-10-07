import { listarDocumentos } from '@/lib/documentos';
import { GestorDocumentos } from './gestor-documentos';
export const dynamic='force-dynamic';
export default async function DocumentosAdmin() {
  return <GestorDocumentos iniciais={JSON.parse(JSON.stringify(await listarDocumentos(true)))}/>;
}
