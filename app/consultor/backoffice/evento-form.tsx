"use client";

import { useState } from "react";

const EVENTO_TITULO = "Teambuilding Tropa de Elite";
const EVENTO_DATA_TEXTO = "14 de novembro de 2026";
const EVENTO_LOCAL = "Fátima";
const PRECO_ADULTO = 35;
const PRECO_CRIANCA_MAIS10 = 17;

type Estado = "pronto" | "a-enviar" | "enviado" | "erro";

export function EventoForm({ email, nome }: { email: string; nome: string | null }) {
  const [nomeCompleto, setNomeCompleto] = useState(nome ?? "");
  const [telemovel, setTelemovel] = useState("");
  const [emailForm, setEmailForm] = useState(email);
  const [adultos, setAdultos] = useState(1);
  const [criancasMais10, setCriancasMais10] = useState(0);
  const [criancasMenos10, setCriancasMenos10] = useState(0);
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("pronto");
  const [erro, setErro] = useState("");

  const total = adultos * PRECO_ADULTO + criancasMais10 * PRECO_CRIANCA_MAIS10;
  const valido =
    nomeCompleto.trim() !== "" &&
    telemovel.trim() !== "" &&
    emailForm.includes("@") &&
    adultos >= 1 &&
    ficheiro !== null;

  async function submeter(): Promise<void> {
    if (!valido || !ficheiro) return;
    setEstado("a-enviar");
    setErro("");
    try {
      const corpo = new FormData();
      corpo.set("nome", nomeCompleto.trim());
      corpo.set("telemovel", telemovel.trim());
      corpo.set("email", emailForm.trim());
      corpo.set("adultos", String(adultos));
      corpo.set("criancasMais10", String(criancasMais10));
      corpo.set("criancasMenos10", String(criancasMenos10));
      corpo.set("comprovativo", ficheiro);

      const resposta = await fetch("/api/consultor/backoffice/evento", {
        method: "POST",
        body: corpo,
      });
      const resultado = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(typeof resultado.erro === "string" ? resultado.erro : "não foi possível concluir a inscrição");
        setEstado("erro");
        return;
      }
      setEstado("enviado");
    } catch {
      setErro("falha de ligação — tenta outra vez");
      setEstado("erro");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="vqe-cartao">
        <p className="vqe-sucesso">Inscrição registada! Obrigado — vemo-nos em Fátima.</p>
      </div>
    );
  }

  return (
    <div className="vqe-cartao">
      <style>{`
        .vqe-cartao {
          box-sizing: border-box;
          background: #f7f6f3;
          color: #15130f;
          border: 1px solid #eae7de;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          max-width: 420px;
          width: 100%;
          margin: 0 auto;
          overflow: hidden;
        }
        .vqe-cartao h3 { margin: 0 0 0.3rem; font-size: 1.3rem; }
        .vqe-cartao p { margin: 0; color: #6b6a63; font-size: 0.9rem; }
        .vqe-linha-topo { margin-bottom: 1.1rem; }
        .vqe-sucesso { color: #0ca30c; font-weight: 600; font-size: 1rem; }
        .vqe-campo { margin-bottom: 1rem; }
        .vqe-campo label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #15130f;
          margin: 0 0 0.35rem;
        }
        .vqe-campo input {
          box-sizing: border-box;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #d8d5cb;
          background: #fff;
          color: #15130f;
          font-size: 1rem;
        }
        .vqe-nota { font-size: 0.8rem; margin-top: 0.3rem; }
        .vqe-total {
          font-size: 1rem;
          color: #15130f;
          margin: 1.25rem 0 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eae7de;
        }
        .vqe-total strong { font-size: 1.15rem; }
        .vqe-botao {
          display: block;
          width: 100%;
          text-align: center;
          padding: 0.85rem;
          font-size: 1.05rem;
          background: linear-gradient(135deg, #4a9b8e, #2f7568);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .vqe-botao:disabled { opacity: 0.5; cursor: default; }
        .vqe-erro { color: #c0392b; margin-top: 0.75rem; }
      `}</style>

      <div className="vqe-linha-topo">
        <h3>{EVENTO_TITULO}</h3>
        <p>{EVENTO_DATA_TEXTO}</p>
        <p>
          {EVENTO_LOCAL} · {PRECO_ADULTO}€ por pessoa
        </p>
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-adultos">Adultos</label>
        <input
          id="evento-adultos"
          type="number"
          min={1}
          value={adultos}
          onChange={(e) => setAdultos(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-criancas-mais10">Crianças +10 anos (17€)</label>
        <input
          id="evento-criancas-mais10"
          type="number"
          min={0}
          value={criancasMais10}
          onChange={(e) => setCriancasMais10(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-criancas-menos10">Crianças -10 anos (grátis)</label>
        <input
          id="evento-criancas-menos10"
          type="number"
          min={0}
          value={criancasMenos10}
          onChange={(e) => setCriancasMenos10(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-nome">Nome completo</label>
        <input
          id="evento-nome"
          type="text"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-telemovel">Telemóvel</label>
        <input
          id="evento-telemovel"
          type="tel"
          value={telemovel}
          onChange={(e) => setTelemovel(e.target.value)}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-email">Email</label>
        <input
          id="evento-email"
          type="email"
          value={emailForm}
          onChange={(e) => setEmailForm(e.target.value)}
        />
        <p className="vqe-nota">O mesmo que tens registado na Icligo.</p>
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-comprovativo">Comprovativo de pagamento</label>
        <input
          id="evento-comprovativo"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)}
        />
      </div>

      <p className="vqe-total">
        Total a pagar: <strong>{total}€</strong>
      </p>

      {erro && <p className="vqe-erro">{erro}</p>}

      <button
        type="button"
        className="vqe-botao"
        onClick={submeter}
        disabled={!valido || estado === "a-enviar"}
      >
        {estado === "a-enviar" ? "A enviar..." : "Concluir inscrição"}
      </button>
    </div>
  );
}
