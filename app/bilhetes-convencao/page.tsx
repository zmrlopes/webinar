import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { OPCOES_PAGAMENTO } from "@/lib/bilhetes-convencao";
import Formulario from "./formulario";
import estilos from "./bilhetes.module.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--fonte-texto" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--fonte-titulo" });

export const metadata: Metadata = {
  title: "Pedido de bilhete, Convenção Nacional iCligo 2027",
  description: "Reserva o teu lugar nos packs de bilhetes da equipa para a Convenção Nacional de 13 de março de 2027.",
};

export default function BilhetesConvencaoPagina() {
  return (
    <div className={`${estilos.pagina} ${barlow.variable} ${barlowCondensed.variable}`}>
      <header className={estilos.topo}>
        <div className={`${estilos.wrap} ${estilos.hero}`}>
          <div>
            <p className={estilos.kicker}>Pedido de bilhete</p>
            <h1 className={estilos.titulo}>Convenção Nacional iCligo</h1>
            <p className={estilos.sub}>Vem connosco neste TGV. Lugares nos packs comprados pela equipa.</p>
          </div>
          <div className={estilos.stub} aria-label="13 de março de 2027">
            <b>13</b>
            <span>março 2027</span>
            <small>Partida confirmada</small>
          </div>
        </div>
      </header>

      <main className={`${estilos.wrap} ${estilos.conteudo}`}>
        <p>
          A Convenção Nacional de 13 de março é o evento mais importante da iCligo, e em 2027 vamos ter
          novidades que vão mudar muito o nosso negócio. A empresa investiu muitos milhões para que a nossa
          vida fique muito mais facilitada a partir de março de 2027.
        </p>

        <div className={estilos.nota}>
          <p>
            <strong>Este pedido é para os packs de bilhetes que a equipa vai comprar.</strong> Não estás a
            comprar diretamente à iCligo: a equipa compra o pack e o teu bilhete sai daí.
          </p>
          <div className={estilos.colunas}>
            <div>
              <strong>Preço</strong>
              Ainda não foi divulgado. Sai a 3 de outubro, às 16h30, e enviamos-to logo a seguir.
            </div>
            <div>
              <strong>Pagamento flexível</strong>
              Podes pagar só uma parte, para bloquear o lugar. O restante vais pagando quando te for mais
              oportuno.
            </div>
          </div>
        </div>

        <h2 className={estilos.seccao}>Os teus dados</h2>
        <Formulario opcoesPagamento={[...OPCOES_PAGAMENTO]} />
      </main>

      <footer className={estilos.rodape}>
        <div className={estilos.wrap}>
          Grava o teu pedido. Às 16h30 de 3 de outubro enviamos-te o preço e os dados para pagares.
        </div>
      </footer>
    </div>
  );
}
