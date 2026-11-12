"use client";

import {useRef, useState} from "react";
import css from "./formulario.module.css";

export function BotaoEmailTeste({email, nome, disabled = false}: {email: string; nome: string; disabled?: boolean}) {
  const emCurso = useRef(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  async function enviar() {
    if (emCurso.current || disabled) return;
    emCurso.current = true; setAEnviar(true); setMensagem(""); setErro(false);
    try {
      const resposta = await fetch("/api/admin/consultores/email-teste", {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email}),
      });
      if (resposta.status === 401) throw new Error("A sessão de administrador terminou. Atualiza a página e volta a entrar.");
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.erro ?? "O serviço não confirmou o envio. Verifica o estado antes de repetir.");
      setMensagem(`Teste para ${dados.email} aceite pelo ${dados.fornecedor}. Confirma com o TP a receção, incluindo no spam; pode demorar alguns minutos.`);
    } catch (falha) {
      setErro(true);
      setMensagem(falha instanceof Error ? falha.message : "Falha de ligação. Verifica o estado antes de repetir o teste.");
    } finally {emCurso.current = false; setAEnviar(false);}
  }
  return <div className={css.emailTeste}>
    <button type="button" className={css.botaoEmailTeste} disabled={disabled || aEnviar} onClick={() => void enviar()}
      aria-label={`Enviar email de teste para ${nome || email} (${email})`} title={`Enviar apenas para ${email}`}>
      {aEnviar ? "A enviar teste…" : "Enviar email de teste"}
    </button>
    {mensagem && <p className={erro ? css.emailTesteErro : css.emailTesteResultado} role={erro ? "alert" : "status"}>{mensagem}</p>}
  </div>;
}
