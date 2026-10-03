"use client";

import { useState } from "react";
import estilos from "./bilhetes.module.css";

type Estado = "pronto" | "a-gravar" | "gravado";

export default function Formulario({ opcoesPagamento }: { opcoesPagamento: string[] }) {
  const [estado, setEstado] = useState<Estado>("pronto");
  const [erro, setErro] = useState("");
  const [nomeGravado, setNomeGravado] = useState("");
  const [acrescento, setAcrescento] = useState<{ acrescentados: number; total: number } | null>(null);

  async function gravar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const valor = (campo: string) => String(dados.get(campo) ?? "").trim();

    const falta: string[] = [];
    if (!valor("nome")) falta.push("nome");
    if (!valor("telemovel")) falta.push("telemóvel");
    if (!valor("email")) falta.push("email");
    if (!valor("pagamento")) falta.push("forma de pagamento");
    if (dados.get("confirmado") !== "on") falta.push("confirmação");
    if (falta.length) {
      setErro(`Falta preencher: ${falta.join(", ")}.`);
      return;
    }

    setErro("");
    setEstado("a-gravar");
    try {
      const resposta = await fetch("/api/bilhetes-convencao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: valor("nome"),
          telemovel: valor("telemovel"),
          email: valor("email"),
          bilhetes: Number(valor("bilhetes")),
          acompanhantes: valor("acompanhantes"),
          pagamento: valor("pagamento"),
          confirmado: true,
          observacoes: valor("observacoes"),
        }),
      });
      const corpo = (await resposta.json().catch(() => null)) as {
        erro?: string;
        acrescentados?: number;
        total?: number;
      } | null;
      if (!resposta.ok) {
        setErro(corpo?.erro ?? "Não foi possível gravar o pedido. Tenta outra vez.");
        setEstado("pronto");
        return;
      }
      setNomeGravado(valor("nome").split(/\s+/)[0] ?? "");
      setAcrescento(
        corpo?.acrescentados && corpo.total ? { acrescentados: corpo.acrescentados, total: corpo.total } : null,
      );
      setEstado("gravado");
      formulario.reset();
    } catch {
      setErro("Sem ligação. Verifica a internet e carrega outra vez em Gravar pedido.");
      setEstado("pronto");
    }
  }

  if (estado === "gravado") {
    return (
      <div className={estilos.sucesso} role="status">
        <p>
          <strong>
            {acrescento
              ? `Bilhetes acrescentados. Obrigado, ${nomeGravado}!`
              : `Pedido gravado. Obrigado, ${nomeGravado}!`}
          </strong>
        </p>
        {acrescento && (
          <p>
            Acrescentámos {acrescento.acrescentados}{" "}
            {acrescento.acrescentados === 1 ? "bilhete" : "bilhetes"} ao teu pedido. Agora tens{" "}
            <strong>{acrescento.total} bilhetes</strong>.
          </p>
        )}
        <p>Às 16h30 de 3 de outubro enviamos-te o preço e os dados para pagares.</p>
        <button type="button" className={estilos.botaoSecundario} onClick={() => setEstado("pronto")}>
          Acrescentar mais bilhetes
        </button>
      </div>
    );
  }

  return (
    <form className={estilos.formulario} onSubmit={gravar} noValidate>
      <div className={estilos.campo}>
        <label htmlFor="nome">Nome completo</label>
        <input id="nome" name="nome" type="text" autoComplete="name" required />
      </div>
      <div className={estilos.linha}>
        <div className={estilos.campo}>
          <label htmlFor="telemovel">Telemóvel / WhatsApp</label>
          <input id="telemovel" name="telemovel" type="tel" autoComplete="tel" required />
        </div>
        <div className={estilos.campo}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
      </div>
      <div className={`${estilos.linha} ${estilos.linhaBilhetes}`}>
        <div className={estilos.campo}>
          <label htmlFor="bilhetes">Nº de bilhetes</label>
          <input id="bilhetes" name="bilhetes" type="number" min={1} max={20} defaultValue={1} required />
        </div>
        <div className={estilos.campo}>
          <label htmlFor="acompanhantes">Nome de cada acompanhante (se pedes mais de 1 ou acrescentas bilhetes)</label>
          <input id="acompanhantes" name="acompanhantes" type="text" />
        </div>
      </div>
      <fieldset className={`${estilos.campo} ${estilos.grupo}`}>
        <legend className={estilos.legenda}>Como queres pagar?</legend>
        {opcoesPagamento.map((opcao, i) => (
          <label key={opcao} className={estilos.opcao}>
            <input type="radio" name="pagamento" value={opcao} id={`pagamento-${i}`} />
            {opcao === "O valor total" ? "Quero pagar o valor total" : opcao}
          </label>
        ))}
      </fieldset>
      <label className={`${estilos.opcao} ${estilos.campo}`}>
        <input type="checkbox" name="confirmado" id="confirmado" />
        Confirmo que o meu bilhete faz parte do pack comprado pela equipa e que pago o valor do bilhete
        diretamente à equipa.
      </label>
      <div className={estilos.campo}>
        <label htmlFor="observacoes">Dúvidas ou observações</label>
        <textarea id="observacoes" name="observacoes" />
      </div>
      <button type="submit" className={estilos.botao} disabled={estado === "a-gravar"}>
        {estado === "a-gravar" ? "A gravar…" : "Gravar pedido"}
      </button>
      <p className={estilos.erro} role="alert">
        {erro}
      </p>
    </form>
  );
}
