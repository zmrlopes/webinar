import { notFound } from "next/navigation";
import { listarInscritosEventoPorLider } from "@/lib/teambuilding";

export const dynamic = "force-dynamic";

/**
 * Página pública (sem password do admin) para partilhar com cada líder um
 * link direto de quem da equipa dela está inscrita no Teambuilding — mesmos
 * 4 anchors fixos usados no admin (ver LIDERES_TOPO em src/lib/admin.ts),
 * repetidos aqui porque essa constante não é exportada e esta página não
 * deve depender de código interno do admin.
 */
const LIDERES: Record<string, { email: string; nome: string }> = {
  "ana-custodia": { email: "apensarnaproxima@gmail.com", nome: "Ana Custódia" },
  "lara-rodrigues": { email: "viajarviversonhar@gmail.com", nome: "Lara Rodrigues" },
  ludmila: { email: "ludmilatravels2023@gmail.com", nome: "Ludmila" },
};

export default async function TeambuildingPorLiderPagina({
  params,
}: {
  params: Promise<{ lider: string }>;
}) {
  const { lider } = await params;
  const info = LIDERES[lider];
  if (!info) notFound();

  const inscritos = await listarInscritosEventoPorLider(info.email);

  return (
    <main className="tl-pagina">
      <style>{`
        .tl-pagina {
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem 1.25rem 4rem;
          min-height: 100vh;
        }
        .tl-caixa { max-width: 640px; margin: 0 auto; }
        .tl-pagina h1 { color: #000000; font-size: 1.4rem; margin: 0 0 0.4rem; }
        .tl-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; }
        .tl-lista { list-style: none; margin: 0; padding: 0; }
        .tl-lista li {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          margin-bottom: 0.6rem;
        }
        .tl-lista strong { display: block; }
        .tl-lista span { color: #6b6a63; font-size: 0.85rem; }
      `}</style>
      <div className="tl-caixa">
        <h1>Equipa de {info.nome} — inscritos no Teambuilding</h1>
        <p className="tl-mudo">{inscritos.length} pessoa(s) da equipa dela inscrita(s) — 14 de novembro.</p>
        {inscritos.length === 0 ? (
          <p className="tl-mudo">Ainda ninguém desta equipa se inscreveu.</p>
        ) : (
          <ul className="tl-lista">
            {inscritos.map((i) => (
              <li key={i.email}>
                <strong>{i.nome}</strong>
                <span>{i.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
