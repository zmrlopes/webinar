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
  const [adultos, setAdultos] = useState("1");
  const [criancasMais10, setCriancasMais10] = useState("0");
  const [criancasMenos10, setCriancasMenos10] = useState("0");
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("pronto");
  const [erro, setErro] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(true);

  const adultosNum = Math.max(0, Number(adultos) || 0);
  const criancasMais10Num = Math.max(0, Number(criancasMais10) || 0);
  const criancasMenos10Num = Math.max(0, Number(criancasMenos10) || 0);

  const total = adultosNum * PRECO_ADULTO + criancasMais10Num * PRECO_CRIANCA_MAIS10;
  const valido =
    nomeCompleto.trim() !== "" &&
    telemovel.trim() !== "" &&
    emailForm.includes("@") &&
    adultosNum >= 1 &&
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
      corpo.set("adultos", String(adultosNum));
      corpo.set("criancasMais10", String(criancasMais10Num));
      corpo.set("criancasMenos10", String(criancasMenos10Num));
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
      setEmailEnviado(resultado.emailEnviado !== false);
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
        {emailEnviado ? (
          <p style={{ marginTop: "0.5rem" }}>
            Enviámos-te um email com o QR code do teu bilhete — leva-o contigo no dia do evento.
          </p>
        ) : (
          <p className="vqe-erro" style={{ marginTop: "0.5rem" }}>
            A inscrição ficou registada, mas não conseguimos enviar o email com o QR code. Contacta-nos
            para o receberes de outra forma.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="vqe-cartao">
      <style>{`
        .vqe-cartao {
          box-sizing: border-box;
          background: #f7f6f3;
          color: #000000;
          border: 1px solid #000000;
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
          color: #000000;
          margin: 0 0 0.35rem;
        }
        .vqe-campo input {
          box-sizing: border-box;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #000000;
          background: #fff;
          color: #000000;
          font-size: 1rem;
        }
        .vqe-nota { font-size: 0.8rem; margin-top: 0.3rem; }
        .vqe-pagamento-info {
          background: #eef1e4;
          border: 1px solid #8a9a5b;
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
          margin-bottom: 0.6rem;
          font-size: 0.85rem;
          color: #000000;
        }
        .vqe-total {
          font-size: 1rem;
          color: #000000;
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
          background: linear-gradient(135deg, #5d6b2a, #4b5320);
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
          onChange={(e) => setAdultos(e.target.value)}
          onBlur={() => setAdultos(String(Math.max(1, Number(adultos) || 1)))}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-criancas-mais10">Crianças +10 anos (17€)</label>
        <input
          id="evento-criancas-mais10"
          type="number"
          min={0}
          value={criancasMais10}
          onChange={(e) => setCriancasMais10(e.target.value)}
          onBlur={() => setCriancasMais10(String(Math.max(0, Number(criancasMais10) || 0)))}
        />
      </div>

      <div className="vqe-campo">
        <label htmlFor="evento-criancas-menos10">Crianças -10 anos (grátis)</label>
        <input
          id="evento-criancas-menos10"
          type="number"
          min={0}
          value={criancasMenos10}
          onChange={(e) => setCriancasMenos10(e.target.value)}
          onBlur={() => setCriancasMenos10(String(Math.max(0, Number(criancasMenos10) || 0)))}
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
        <p className="vqe-pagamento-info">
          Efetuar pagamento por MBWAY para o número 913550475 (Sara).
        </p>
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
