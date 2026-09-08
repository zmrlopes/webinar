"use client";

import { useState } from "react";

type Estado = "pronto" | "a-enviar" | "enviado" | "erro";

export function FormularioInscricaoManual() {
  const [nome, setNome] = useState("");
  const [telemovel, setTelemovel] = useState("");
  const [email, setEmail] = useState("");
  const [adultos, setAdultos] = useState("1");
  const [criancasMais10, setCriancasMais10] = useState("0");
  const [criancasMenos10, setCriancasMenos10] = useState("0");
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("pronto");
  const [erro, setErro] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(true);

  const adultosNum = Math.max(0, Number(adultos) || 0);
  const valido =
    nome.trim() !== "" && telemovel.trim() !== "" && email.includes("@") && adultosNum >= 1 && ficheiro !== null;

  async function submeter(): Promise<void> {
    if (!valido || !ficheiro) return;
    setEstado("a-enviar");
    setErro("");
    try {
      const corpo = new FormData();
      corpo.set("nome", nome.trim());
      corpo.set("telemovel", telemovel.trim());
      corpo.set("email", email.trim());
      corpo.set("adultos", String(adultosNum));
      corpo.set("criancasMais10", String(Math.max(0, Number(criancasMais10) || 0)));
      corpo.set("criancasMenos10", String(Math.max(0, Number(criancasMenos10) || 0)));
      corpo.set("comprovativo", ficheiro);

      const resposta = await fetch("/api/admin/eventos/inscrever", { method: "POST", body: corpo });
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
      <div className="ei-cartao">
        <p className="ei-sucesso">✅ Inscrição criada.</p>
        {emailEnviado ? (
          <p style={{ marginTop: "0.5rem" }}>Enviámos o email com o QR code do bilhete à pessoa.</p>
        ) : (
          <p className="ei-erro" style={{ marginTop: "0.5rem" }}>
            A inscrição ficou registada, mas não foi possível enviar o email com o QR code.
          </p>
        )}
        <a href="/admin/eventos" className="ei-voltar">
          ← Voltar aos eventos
        </a>
      </div>
    );
  }

  return (
    <div className="ei-cartao">
      <div className="ei-campo">
        <label htmlFor="ei-nome">Nome completo</label>
        <input id="ei-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="ei-campo">
        <label htmlFor="ei-telemovel">Telemóvel</label>
        <input id="ei-telemovel" type="tel" value={telemovel} onChange={(e) => setTelemovel(e.target.value)} />
      </div>

      <div className="ei-campo">
        <label htmlFor="ei-email">Email</label>
        <input id="ei-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="ei-campo">
        <label htmlFor="ei-adultos">Adultos</label>
        <input
          id="ei-adultos"
          type="number"
          min={1}
          value={adultos}
          onChange={(e) => setAdultos(e.target.value)}
          onBlur={() => setAdultos(String(Math.max(1, Number(adultos) || 1)))}
        />
      </div>

      <div className="ei-campo">
        <label htmlFor="ei-criancas-mais10">Crianças +10 anos (pagam)</label>
        <input
          id="ei-criancas-mais10"
          type="number"
          min={0}
          value={criancasMais10}
          onChange={(e) => setCriancasMais10(e.target.value)}
          onBlur={() => setCriancasMais10(String(Math.max(0, Number(criancasMais10) || 0)))}
        />
      </div>

      <div className="ei-campo">
        <label htmlFor="ei-criancas-menos10">Crianças -10 anos (não pagam)</label>
        <input
          id="ei-criancas-menos10"
          type="number"
          min={0}
          value={criancasMenos10}
          onChange={(e) => setCriancasMenos10(e.target.value)}
          onBlur={() => setCriancasMenos10(String(Math.max(0, Number(criancasMenos10) || 0)))}
        />
      </div>

      <div className="ei-campo">
        <label htmlFor="ei-comprovativo">Comprovativo de pagamento</label>
        <input
          id="ei-comprovativo"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)}
        />
      </div>

      {erro && <p className="ei-erro">{erro}</p>}

      <button type="button" disabled={!valido || estado === "a-enviar"} onClick={submeter}>
        {estado === "a-enviar" ? "A criar…" : "Criar inscrição"}
      </button>
    </div>
  );
}
