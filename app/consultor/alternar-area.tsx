import Link from "next/link";
import { linkAreaAtual } from "@/lib/consultor-nova-area";
import { EMAIL_PAINEL_DEMONSTRACAO } from "@/lib/demo";
import estilos from "./alternar-area.module.css";

export function AlternarArea({ ativa, email }: { ativa: "atual" | "nova"; email: string }) {
  const demonstracao = email.trim().toLowerCase() === EMAIL_PAINEL_DEMONSTRACAO;
  return (
    <nav className={estilos.seletor} aria-label="Versões da área de consultor">
      <div className={estilos.contexto}>
        <span className={estilos.ponto} aria-hidden="true" />
        <span>{demonstracao ? "Conta de teste" : "Área de consultor"} <small>Escolhe a área que queres consultar</small></span>
      </div>
      <div className={estilos.opcoes}>
        <Link href={linkAreaAtual(email)} className={ativa === "atual" ? estilos.ativo : estilos.opcao} aria-current={ativa === "atual" ? "page" : undefined}>
          Área atual <small>{demonstracao ? "O que os consultores veem" : "Consultar a versão anterior"}</small>
        </Link>
        <Link href="/consultor/nova-area" className={ativa === "nova" ? estilos.ativo : estilos.opcao} aria-current={ativa === "nova" ? "page" : undefined}>
          Nova área <small>{demonstracao ? "Em construção · só para ti" : "A tua nova área de trabalho"}</small>
        </Link>
      </div>
    </nav>
  );
}
