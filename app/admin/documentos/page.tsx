import { listarDocumentos } from '@/lib/documentos';
import { listarPastasDocumentos } from '@/lib/documentos-pastas';
import { GestorDocumentos } from './gestor-documentos';
export const dynamic='force-dynamic';
export default async function DocumentosAdmin() {
  const [documentos,pastas]=await Promise.all([listarDocumentos(true),listarPastasDocumentos(true)]);
  return <GestorDocumentos iniciais={JSON.parse(JSON.stringify(documentos))} pastasIniciais={pastas}/>;
}
