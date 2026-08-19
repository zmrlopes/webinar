import { GeradorLink } from "./gerador-link";

export const dynamic = "force-dynamic";

export default function PaginaConsultor() {
  return (
    <main>
      <h1>Gerar o teu link de inscrição</h1>
      <p className="mudo">
        Escreve o teu email (o mesmo que está registado na equipa) para receberes o link de
        inscrição da próxima sessão, já identificado como teu.
      </p>
      <GeradorLink />
    </main>
  );
}
