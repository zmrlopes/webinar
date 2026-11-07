import Link from "next/link";
import { listarInscritosComFaturacao } from "@/lib/teambuilding";
import { ListasFaturacao } from "./listas";
import s from "./pagina.module.css";

export const dynamic = "force-dynamic";
export default async function TrofeusFaturacaoEvento() {
  const inscritos = await listarInscritosComFaturacao();
  return <main className={s.pagina}>
    <Link href="/admin/eventos/teambuilding">← Voltar ao evento</Link>
    <h1>Troféus de faturação a entregar</h1>
    <p>Teambuilding · 14 de novembro de 2026</p>
    <p>Inscritos que atingiram 100.000 € ou 250.000 € de faturação própria acumulada e responderam ao questionário sem declarar o respetivo troféu como recebido. Não é necessário terem pedido o troféu.</p>
    <ListasFaturacao inscritos={inscritos} />
    <p className={s.nota}>Quem atingiu ambos os valores pode aparecer nas duas listas, se ainda lhe faltarem ambos os troféus. A faturação é própria, não o volume da organização, e não está limitada a 2026. Os dados acompanham a atualização da equipa e as respostas do questionário.</p>
    <Link href="/admin/trofeus-respostas">Consultar ou corrigir as respostas dos troféus →</Link>
  </main>;
}
