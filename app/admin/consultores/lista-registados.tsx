"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ConsultorRegistado } from "@/lib/consultores-admin";
import css from "./formulario.module.css";

async function pedir(metodo: "PATCH" | "DELETE", corpo: unknown): Promise<void> {
  const resposta = await fetch("/api/admin/consultores", {
    method: metodo, headers: {"Content-Type": "application/json"}, body: JSON.stringify(corpo),
  });
  if (resposta.status === 401) throw new Error("A sessão de administrador terminou. Atualiza a página e volta a entrar.");
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível guardar. Tenta novamente.");
}

function semAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ListaConsultoresRegistados({ consultores }: { consultores: ConsultorRegistado[] }) {
  const router = useRouter();
  const [pesquisa, setPesquisa] = useState("");
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [aConfirmarApagar, setAConfirmarApagar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const visiveis = useMemo(() => {
    const termo = semAcentos(pesquisa.trim());
    if (!termo) return consultores;
    return consultores.filter((c) => semAcentos(`${c.nome} ${c.email}`).includes(termo));
  }, [consultores, pesquisa]);

  async function guardar(evento: FormEvent<HTMLFormElement>, consultor: ConsultorRegistado) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setOcupado(true); setErro(""); setAviso("");
    try {
      const email = String(dados.get("email") ?? "");
      await pedir("PATCH", {emailAtual: consultor.email, nome: dados.get("nome"), email});
      setAEditar(null);
      setAviso(email.trim().toLowerCase() !== consultor.email
        ? `Email de ${consultor.nome} alterado. A partir de agora entra com ${email.trim().toLowerCase()} e mantém o histórico.`
        : `${consultor.nome} atualizado.`);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setOcupado(false); }
  }

  async function apagar(consultor: ConsultorRegistado) {
    setOcupado(true); setErro(""); setAviso("");
    try {
      await pedir("DELETE", {email: consultor.email});
      setAConfirmarApagar(null);
      setAviso(`${consultor.nome} foi apagado e deixou de ter acesso à área de consultor.`);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setOcupado(false); }
  }

  return (
    <section className={css.caixa} aria-labelledby="registados-titulo">
      <h2 id="registados-titulo">Consultores registados ({consultores.length})</h2>
      <p>
        Todos os que têm acesso à área de consultor. Ao mudar o email, a pessoa passa a entrar com o novo
        e leva consigo o histórico (leads, Core Rank, respostas, troféus). Apagar tira-lhe o acesso; se
        continuar no CSV da equipa, volta a aparecer na próxima importação.
      </p>
      <label className={css.pesquisa}>
        Pesquisar
        <input type="search" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Nome ou email" />
      </label>
      {erro && <p className={css.erro} role="alert">{erro}</p>}
      {aviso && <p className={css.sucesso} role="status">{aviso}</p>}

      <div className={css.tabelaWrap}>
        <table className={css.tabela}>
          <thead>
            <tr><th>Nome</th><th>Email</th><th>Patamar</th><th>Upline</th><th>Painel</th><th></th></tr>
          </thead>
          <tbody>
            {visiveis.map((c) => aEditar === c.email ? (
              <tr key={c.email}>
                <td colSpan={6}>
                  <form className={css.edicao} onSubmit={(e) => guardar(e, c)}>
                    <fieldset disabled={ocupado} className={css.campos}>
                      <label>Nome<input name="nome" defaultValue={c.nome} maxLength={200} required /></label>
                      <label>Email<input name="email" type="email" defaultValue={c.email} maxLength={254} required /></label>
                      <button type="submit">{ocupado ? "A guardar…" : "Guardar"}</button>
                      <button type="button" className={css.secundario} onClick={() => setAEditar(null)}>Cancelar</button>
                    </fieldset>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={c.email}>
                <td>{c.nome}</td>
                <td>{c.email}</td>
                <td>{c.nivel ?? "—"}</td>
                <td>{c.uplineNome ?? "—"}</td>
                <td>{c.temPainel ? "Sim" : "—"}</td>
                <td className={css.acoes}>
                  {aConfirmarApagar === c.email ? (
                    <>
                      <span>Apagar {c.nome}?</span>
                      <button type="button" className={css.perigo} disabled={ocupado} onClick={() => apagar(c)}>
                        {ocupado ? "A apagar…" : "Sim, apagar"}
                      </button>
                      <button type="button" className={css.secundario} disabled={ocupado} onClick={() => setAConfirmarApagar(null)}>Não</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={css.secundario} onClick={() => { setAEditar(c.email); setAConfirmarApagar(null); setErro(""); }}>Editar</button>
                      <button type="button" className={css.secundario} onClick={() => { setAConfirmarApagar(c.email); setAEditar(null); setErro(""); }}>Apagar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visiveis.length === 0 && <p>Ninguém encontrado com essa pesquisa.</p>}
    </section>
  );
}
