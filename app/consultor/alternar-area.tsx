import Link from "next/link";
import estilos from "./alternar-area.module.css";

export function AlternarArea({ ativa }: { ativa: "atual" | "nova" }) {
  return (
    <nav className={estilos.seletor} aria-label="Versões da área de consultor">
      <div className={estilos.contexto}>
        <span className={estilos.ponto} aria-hidden="true" />
        <span>Conta de teste <small>Escolhe a área que queres consultar</small></span>
      </div>
      <div className={estilos.opcoes}>
        <Link href="/consultor" className={ativa === "atual" ? estilos.ativo : estilos.opcao} aria-current={ativa === "atual" ? "page" : undefined}>
          Área atual <small>O que os consultores veem</small>
        </Link>
        <Link href="/consultor/nova-area" className={ativa === "nova" ? estilos.ativo : estilos.opcao} aria-current={ativa === "nova" ? "page" : undefined}>
          Nova área <small>Em construção · só para ti</small>
        </Link>
      </div>
    </nav>
  );
}
