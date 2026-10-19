import { BibliotecaTestemunhos } from "../formacoes/testemunhos/biblioteca";
import estilos from "./nova-area.module.css";

export function TestemunhosNovaArea() {
  return <>
    <div className={estilos.intro}>
      <span className={estilos.etiqueta}>A MINHA ORGANIZAÇÃO</span>
      <h1>Testemunhos<span>.</span></h1>
      <p>Histórias de consultores iCliGo: das primeiras dúvidas à decisão de começar.</p>
    </div>
    <BibliotecaTestemunhos />
  </>;
}
