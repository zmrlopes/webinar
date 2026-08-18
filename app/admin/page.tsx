import Link from "next/link";
import { listarWebinarsAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatarData(data: Date | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminDashboard() {
  const webinars = await listarWebinarsAdmin();

  return (
    <main style={{ maxWidth: 900 }}>
      <h1>Sessões</h1>
      <table>
        <thead>
          <tr>
            <th>Sessão</th>
            <th>Data</th>
            <th>Estado</th>
            <th>Inscritos</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>
          {webinars.map((w) => (
            <tr key={w.id}>
              <td>
                <Link href={`/admin/webinar/${w.id}`}>{w.titulo}</Link>
              </td>
              <td>{formatarData(w.sessaoExternaEm)}</td>
              <td>
                {w.cancelada && <span className="etiqueta">cancelada</span>}
                {!w.cancelada && w.presencasFechadas && (
                  <span className="etiqueta">presenças fechadas</span>
                )}
                {!w.cancelada && !w.presencasFechadas && <span className="etiqueta">ativa</span>}
              </td>
              <td>{w.totalInscritos}</td>
              <td className="mudo">
                {w.linksObtidos} obtido(s) · {w.linksPendentes} pendente(s) ·{" "}
                {w.linksFalhados} falhado(s)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
