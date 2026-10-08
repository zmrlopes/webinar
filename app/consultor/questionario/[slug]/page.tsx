"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { buscarQuestionario } from "@/lib/questionarios-lista";
import { lerEmailGuardado } from "../../armazenamento";
import { podeVerNovaArea } from "@/lib/consultor-nova-area";

type Estado = "a-carregar" | "pronto" | "a-enviar" | "enviado" | "sem-conta";

export default function QuestionarioPagina() {
  return (
    <Suspense fallback={null}>
      <QuestionarioFormulario />
    </Suspense>
  );
}

function QuestionarioFormulario() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const emPreview = searchParams.get("preview") === "1";
  const q = buscarQuestionario(slug);
  const [email, setEmail] = useState<string | null>(null);
  const voltar = searchParams.get("origem") === "nova-area" && podeVerNovaArea(email ?? "") ? "/consultor/nova-area" : "/consultor";
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [erro, setErro] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string | number>>({});
  const [contaTeste, setContaTeste] = useState(false);

  useEffect(() => {
    if (emPreview) {
      setEstado("pronto");
      return;
    }
    const guardado = lerEmailGuardado();
    if (!guardado) {
      setEstado("sem-conta");
      return;
    }
    setEmail(guardado);
    setEstado("pronto");
  }, [emPreview]);

  const definir = (id: string, v: string | number) => setRespostas((r) => ({ ...r, [id]: v }));

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (!q) return;
    const falta = q.perguntas.findIndex((p) => {
      const v = respostas[p.id];
      return v === undefined || (typeof v === "string" && !v.trim());
    });
    if (falta >= 0) {
      setErro(`Falta responder à pergunta ${falta + 1}.`);
      document.getElementById(`p-${q.perguntas[falta]!.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (emPreview) {
      setEstado("enviado");
      return;
    }
    if (!email) return;
    setEstado("a-enviar");
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/questionario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug, respostas }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof corpo.erro === "string" ? corpo.erro : "não foi possível enviar");
        setEstado("pronto");
        return;
      }
      setContaTeste(corpo.teste === true);
      setEstado("enviado");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("pronto");
    }
  }

  return (
    <div className="vqq-pagina">
      <style>{`
        .vqq-pagina { background: #ffffff; color: #000000; margin: 0; padding: 2.5rem 1.25rem 4rem; min-height: calc(100vh - 4rem); }
        .vqq-caixa { max-width: 640px; margin: 0 auto; }
        .vqq-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.35rem; }
        .vqq-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .vqq-voltar:hover { text-decoration: underline; }
        .vqq-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.5rem; line-height: 1.5; }
        .vqq-anonimo { background: #eef1e4; border-radius: 10px; padding: 0.75rem 1rem; color: #2f3416; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.75rem; }
        .vqq-pergunta { margin: 0 0 1.75rem; }
        .vqq-pergunta label.vqq-titulo, .vqq-pergunta .vqq-titulo { display: block; font-weight: 700; color: #000; margin-bottom: 0.6rem; line-height: 1.45; }
        .vqq-num { color: #4b5320; margin-right: 0.35rem; }
        .vqq-pergunta textarea { width: 100%; box-sizing: border-box; min-height: 110px; border: 1px solid #e2e0d8; border-radius: 10px; padding: 0.7rem 0.85rem; font: inherit; font-size: 0.95rem; resize: vertical; }
        .vqq-pergunta textarea:focus { outline: 2px solid #4b5320; outline-offset: 1px; }
        .vqq-escala { display: grid; grid-template-columns: repeat(10, 1fr); gap: 0.35rem; }
        .vqq-escala button { margin: 0; padding: 0.65rem 0; border: 1px solid #e2e0d8; border-radius: 8px; background: #f7f6f3; color: #000; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
        .vqq-escala button.on { background: #4b5320; color: #fff; border-color: #4b5320; }
        .vqq-escala-legenda { display: flex; justify-content: space-between; color: #6b6a63; font-size: 0.78rem; margin-top: 0.35rem; }
        .vqq-opcoes { border: 1px solid #e2e0d8; border-radius: 10px; overflow: hidden; }
        .vqq-opcao { display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem 0.9rem; border-bottom: 1px solid #efede6; cursor: pointer; font-size: 0.95rem; }
        .vqq-opcao:last-child { border-bottom: none; }
        .vqq-opcao:hover { background: #f7f6f3; }
        .vqq-opcao input { flex: none; width: 1.1rem; height: 1.1rem; min-width: 0; margin: 0; accent-color: #4b5320; }
        .vqq-enviar { margin-top: 0.5rem; background: linear-gradient(135deg, #5d6b2a, #4b5320); color: #fff; border: none; border-radius: 8px; padding: 0.8rem 1.6rem; font-weight: 700; font-size: 1rem; cursor: pointer; }
        .vqq-enviar:disabled { opacity: 0.5; cursor: default; }
        .vqq-erro { color: #b3261e; margin-top: 0.75rem; }
        .vqq-nota { background: #fff4d6; padding: 0.6rem 0.9rem; border-radius: 8px; color: #6b5200; font-size: 0.85rem; margin-bottom: 1rem; }
        @media (max-width: 420px) { .vqq-escala { grid-template-columns: repeat(5, 1fr); } }
      `}</style>
      <div className="vqq-caixa">
        <Link href={voltar} className="vqq-voltar">
          ← O teu backoffice
        </Link>

        {!q ? (
          <p className="vqq-mudo">Este questionário não existe.</p>
        ) : (
          <>
            <h1>{q.titulo}</h1>

            {estado === "a-carregar" && <p className="vqq-mudo">A carregar...</p>}

            {estado === "sem-conta" && (
              <p className="vqq-mudo">
                Não conseguimos identificar-te. Volta ao{" "}
                <Link href="/consultor" className="vqq-voltar">
                  teu backoffice
                </Link>{" "}
                e entra outra vez com o teu email.
              </p>
            )}

            {estado === "enviado" && (
              <p className="vqq-mudo">
                {emPreview || contaTeste
                  ? "✅ (Conta de teste) É isto que o consultor vê depois de enviar — a tua resposta não ficou gravada."
                  : "✅ Obrigado pela tua sinceridade! A tua resposta ficou registada, de forma anónima."}
              </p>
            )}

            {(estado === "pronto" || estado === "a-enviar") && (
              <form onSubmit={enviar} noValidate>
                {emPreview && <p className="vqq-nota">Pré-visualização — é isto que o consultor vê. Enviar aqui não grava nada.</p>}
                <div className="vqq-anonimo">🔒 {q.intro}</div>

                {q.perguntas.map((p, i) => (
                  <div className="vqq-pergunta" key={p.id} id={`p-${p.id}`}>
                    {p.tipo === "texto" && (
                      <>
                        <label className="vqq-titulo" htmlFor={`r-${p.id}`}>
                          <span className="vqq-num">{i + 1}.</span>
                          {p.texto}
                        </label>
                        <textarea
                          id={`r-${p.id}`}
                          value={(respostas[p.id] as string) ?? ""}
                          onChange={(e) => definir(p.id, e.target.value)}
                          maxLength={5000}
                        />
                      </>
                    )}
                    {p.tipo === "escala" && (
                      <>
                        <span className="vqq-titulo">
                          <span className="vqq-num">{i + 1}.</span>
                          {p.texto}
                        </span>
                        <div className="vqq-escala" role="radiogroup" aria-label={p.texto}>
                          {Array.from({ length: p.max - p.min + 1 }, (_, k) => p.min + k).map((n) => (
                            <button
                              type="button"
                              key={n}
                              role="radio"
                              aria-checked={respostas[p.id] === n}
                              className={respostas[p.id] === n ? "on" : undefined}
                              onClick={() => definir(p.id, n)}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <div className="vqq-escala-legenda">
                          <span>{p.min} — nada motivado</span>
                          <span>{p.max} — muito motivado</span>
                        </div>
                      </>
                    )}
                    {p.tipo === "escolha" && (
                      <>
                        <span className="vqq-titulo">
                          <span className="vqq-num">{i + 1}.</span>
                          {p.texto}
                        </span>
                        <div className="vqq-opcoes">
                          {p.opcoes.map((o) => (
                            <label className="vqq-opcao" key={o}>
                              <input
                                type="radio"
                                name={p.id}
                                checked={respostas[p.id] === o}
                                onChange={() => definir(p.id, o)}
                              />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <button type="submit" className="vqq-enviar" disabled={estado === "a-enviar"}>
                  {estado === "a-enviar" ? "A enviar..." : "Enviar respostas"}
                </button>
                {erro && <p className="vqq-erro">{erro}</p>}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
