import Link from "next/link";
import { CATEGORIAS_FORMACOES } from "@/lib/formacoes-gravadas";
import { listarGravacoesAdmin } from "@/lib/formacoes-gravadas-servidor";
import { GestorGravacoes } from "./gestor-gravacoes";
import css from "./gravadas.module.css";

export const dynamic = "force-dynamic";

export default async function PaginaFormacoesGravadas() {
  const gravacoes = await listarGravacoesAdmin();
  const categorias = CATEGORIAS_FORMACOES.filter(c => c.disponivel).map(c => ({id: c.id, titulo: c.titulo,
    cursos: c.cursos.map(curso => ({titulo: curso.titulo, modulos: curso.modulos.map(m => m.titulo)})),
    icligo: c.icligo.cursos.map(curso => ({titulo: curso.titulo, modulos: curso.modulos.map(m => m.titulo)})),
  }));
  return <main className={css.pagina}>
    <div className={css.caixa}>
      <Link href="/admin">← Início</Link>
      <h1>Formações gravadas</h1>
      <p className={css.nota}>Adiciona o título e o link da gravação. Ao guardar, fica disponível em Formações gravadas na área dos consultores.</p>
      <p className={css.nota}>Na primeira publicação, os consultores com notificações ativas recebem automaticamente um aviso na app. Editar ou voltar a publicar a mesma gravação não repete o aviso.</p>
      <GestorGravacoes iniciais={gravacoes} categorias={categorias} />
      <Link href="/admin/formacoes-aviso">Avisar a equipa sobre as formações gravadas →</Link>
    </div>
  </main>;
}
