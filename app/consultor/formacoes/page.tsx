"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerEmailGuardado } from "../armazenamento";
import { ESTILOS_FORMACOES } from "./estilos";

interface ResumoCategoria {
  id: string;
  titulo: string;
  descricao: string;
  disponivel: boolean;
  totalCursos: number;
  totalAulas: number;
}

type Estado = "a-carregar" | "sem-conta" | "indisponivel" | "erro" | "pronto";

export default function FormacoesPagina() {
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [categorias, setCategorias] = useState<ResumoCategoria[]>([]);

  useEffect(() => {
    const email = lerEmailGuardado();
    if (!email) {
      setEstado("sem-conta");
      return;
    }
    async function carregar(emailConsultor: string): Promise<void> {
      try {
        const resposta = await fetch("/api/consultor/formacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailConsultor }),
        });
        const corpo = await resposta.json().catch(() => ({}));
        if (resposta.status === 403) {
          setEstado("indisponivel");
          return;
        }
        if (!resposta.ok) {
          setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível carregar");
          setEstado("erro");
          return;
        }
        setCategorias(Array.isArray(corpo.categorias) ? corpo.categorias : []);
        setEstado("pronto");
      } catch {
        setErro("falha de ligação — tenta outra vez");
        setEstado("erro");
      }
    }
    void carregar(email);
  }, []);

  return (
    <div className="vqf-pagina">
      <style>{ESTILOS_FORMACOES}</style>
      <div className="vqf-caixa">
        <Link href="/consultor" className="vqf-voltar">
          ← Voltar ao painel
        </Link>
        <h1>Formações</h1>
        <p className="vqf-mudo">Formações gravadas para veres quando quiseres, ao teu ritmo.</p>

        {estado === "a-carregar" && <p className="vqf-mudo">A carregar…</p>}

        {estado === "sem-conta" && (
          <p className="vqf-mudo">
            Primeiro identifica-te no <Link href="/consultor">painel do consultor</Link>.
          </p>
        )}

        {estado === "indisponivel" && (
          <p className="vqf-mudo">As formações gravadas ainda não estão disponíveis.</p>
        )}

        {estado === "erro" && <p className="vqf-erro">{erro}</p>}

        {estado === "pronto" && (
          <div className="vqf-grade-categorias">
            {categorias.map((c) => (
              <div className="vqf-cartao" key={c.id}>
                <h2>{c.titulo}</h2>
                <p>{c.descricao}</p>
                {c.disponivel && (
                  <p className="vqf-cartao-meta">
                    {c.totalCursos} {c.totalCursos === 1 ? "curso" : "cursos"} · {c.totalAulas}{" "}
                    {c.totalAulas === 1 ? "aula" : "aulas"}
                  </p>
                )}
                {c.disponivel ? (
                  <Link href={`/consultor/formacoes/${c.id}`} className="vqf-botao">
                    Entrar
                  </Link>
                ) : (
                  <span className="vqf-botao vqf-botao-desativado" aria-disabled="true">
                    Em breve
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
