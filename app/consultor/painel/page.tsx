import Link from "next/link";
import { PainelConsultor } from "../painel-consultor";

export const dynamic = "force-dynamic";

export default function PaginaPainelConsultor() {
  return (
    <main>
      <h1>Os teus números</h1>
      <p className="mudo">
        Escreve o teu email (o mesmo que está registado na equipa) para veres as inscrições e
        presenças da próxima sessão feitas pelo teu link.
      </p>
      <PainelConsultor />
      <p className="mudo" style={{ marginTop: "2rem" }}>
        <Link href="/consultor">Gerar o link de inscrição</Link>
      </p>
    </main>
  );
}
