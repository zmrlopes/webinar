import { headers } from "next/headers";
import { listarWebinarsFuturos } from "@/lib/webinars";
import { GeradorLink } from "./gerador-link";

export const dynamic = "force-dynamic";

export default async function PaginaConsultor() {
  const webinars = await listarWebinarsFuturos();
  const proximo = webinars[0];

  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const origem = `${protocolo}://${host}`;

  return (
    <main>
      <h1>Gerar o teu link de inscrição</h1>
      {!proximo && <p className="mudo">Não há sessões agendadas de momento.</p>}
      {proximo && (
        <>
          <p className="mudo">
            Sessão: <strong>{proximo.titulo}</strong>
          </p>
          <GeradorLink baseUrl={`${origem}/webinar/${proximo.id}`} />
        </>
      )}
    </main>
  );
}
