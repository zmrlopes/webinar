import Link from "next/link";
import { listarWebinarsFuturos } from "@/lib/webinars";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export default async function Home() {
  const webinars = await listarWebinarsFuturos();

  return (
    <main>
      <h1>Próximos webinars</h1>
      {webinars.length === 0 && <p className="mudo">Não há sessões agendadas de momento.</p>}
      {webinars.map((w) => (
        <div className="cartao" key={w.id}>
          <strong>{w.titulo}</strong>
          <p className="mudo">
            {formatarData(w.sessaoExternaEm)} · {w.duracaoMinutos} min
          </p>
          <Link href={`/webinar/${w.id}`}>Inscrever-me →</Link>
        </div>
      ))}
    </main>
  );
}
