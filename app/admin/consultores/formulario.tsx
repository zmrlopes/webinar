"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import css from "./formulario.module.css";

export function FormularioNovoConsultor() {
  const router = useRouter();
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{nome: string; email: string} | null>(null);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (aGuardar) return;
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    setAGuardar(true); setErro(""); setResultado(null);
    try {
      const resposta = await fetch("/api/admin/consultores", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({nome: dados.get("nome"), email: dados.get("email")}),
      });
      if (resposta.status === 401) throw new Error("A sessão de administrador terminou. Atualiza a página e volta a entrar.");
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível adicionar o consultor.");
      setResultado(corpo.consultor); formulario.reset(); router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setAGuardar(false); }
  }

  return <section className={css.caixa} aria-labelledby="novo-consultor-titulo">
    <h2 id="novo-consultor-titulo">Adicionar consultor</h2>
    <p>Regista o nome e o email para dar acesso à área de consultor.</p>
    <form onSubmit={guardar}>
      <fieldset disabled={aGuardar} className={css.campos}>
        <label htmlFor="novo-consultor-nome">Nome completo<input id="novo-consultor-nome" name="nome" type="text" autoComplete="off" maxLength={200} required placeholder="Nome do consultor"/></label>
        <label htmlFor="novo-consultor-email">Email<input id="novo-consultor-email" name="email" type="email" autoComplete="off" maxLength={254} required placeholder="consultor@exemplo.pt"/></label>
        <button type="submit">{aGuardar ? "A guardar…" : "Guardar e dar acesso"}</button>
      </fieldset>
    </form>
    {erro && <p className={css.erro} role="alert">{erro}</p>}
    {resultado && <p className={css.sucesso} role="status"><strong>{resultado.nome} foi adicionado.</strong> Já pode entrar em <a href="/consultor">Área de consultor</a> com o email <strong>{resultado.email}</strong>.</p>}
  </section>;
}
