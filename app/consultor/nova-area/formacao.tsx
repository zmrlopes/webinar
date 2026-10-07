"use client";

import { useState } from "react";
import type { FormacaoNovaArea } from "@/lib/consultor-nova-area";
import { FormacoesPagina } from "../formacoes/formacoes-pagina";
import { CategoriaPagina } from "../formacoes/[categoria]/categoria-pagina";
import { DocumentosPagina } from "../documentos/documentos-pagina";
import estilos from "./nova-area.module.css";

function Intro({ titulo, descricao }: { titulo: string; descricao: string }) {
  return <div className={estilos.intro}>
    <span className={estilos.etiqueta}>FORMAÇÃO</span>
    <h1>{titulo}<span>.</span></h1>
    <p>{descricao}</p>
  </div>;
}

function CartaoFormacao({ formacao, email, aoInscrever }: {
  formacao: FormacaoNovaArea; email: string; aoInscrever: (id: string) => void;
}) {
  const [aPedir, setAPedir] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  async function pedirAcesso() {
    if (formacao.tipo !== "interna" || aPedir) return;
    const janela = formacao.inscrito ? window.open("about:blank", "_blank") : null;
    if (janela) janela.opener = null;
    setAPedir(true);
    setErro("");
    try {
      const resposta = await fetch("/api/consultor/backoffice/formacao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, webinarId: formacao.id }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok || typeof corpo.url !== "string") {
        throw new Error(corpo.erro ?? "Não foi possível obter o acesso à formação. Tenta novamente.");
      }
      if (!formacao.inscrito) {
        aoInscrever(formacao.id);
        setConfirmado(true);
      } else {
        if (janela) janela.location.href = corpo.url;
        else window.location.href = corpo.url;
      }
    } catch (falha) {
      janela?.close();
      setErro(falha instanceof Error ? falha.message : "Falha de ligação. Tenta novamente.");
    } finally { setAPedir(false); }
  }

  return <article className={estilos.cartaoOrganizacao}>
    <span className={estilos.presencaFeita}>{formacao.tipo === "externa" ? "Formação iCliGo" : "Formação interna"}</span>
    <h2 className={estilos.webinarTitulo}>{formacao.titulo}</h2>
    <div className={estilos.webinarData}><time dateTime={formacao.comecaEm}>{new Date(formacao.comecaEm).toLocaleString("pt-PT", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon",
    })}</time></div>
    {formacao.tipo === "interna" ? <>
      {formacao.duracaoMinutos > 0 && <p className={estilos.webinarDuracao}>{formacao.duracaoMinutos} minutos · Hora de Portugal</p>}
      <p className={estilos.descricaoOrganizacao}>{formacao.inscrito ? "Já estás inscrito — o link também ficou no teu email." : "Inscreve-te para receberes o link por email. Depois, volta aqui para entrar na formação."}</p>
      <button type="button" className={estilos.botao} onClick={() => void pedirAcesso()} disabled={aPedir}>{aPedir ? "A preparar…" : formacao.inscrito ? "Entrar na formação" : "Inscrever"}<span aria-hidden="true">↗</span></button>
    </> : <>
      <p className={estilos.descricaoOrganizacao}>Consulta os detalhes e acede à formação na iCliGo.</p>
      <a className={estilos.botao} href={formacao.link} target="_blank" rel="noopener noreferrer">Ir para a formação <span aria-hidden="true">↗</span></a>
    </>}
    {confirmado && <p className={estilos.webinarConfirmado} role="status">✓ Inscrição confirmada. O link será enviado para o teu email.</p>}
    {erro && <p className={estilos.erroOrganizacao} role="alert">{erro}</p>}
  </article>;
}

export function ProximasFormacoes({ formacoes, email, aoInscrever }: {
  formacoes: FormacaoNovaArea[]; email: string; aoInscrever: (id: string) => void;
}) {
  return <section id="proximas-formacoes" aria-label="Próximas formações">
    <Intro titulo="Próximas formações" descricao="As próximas sessões de formação da equipa e da iCliGo, por ordem de data." />
    <div className={estilos.passos}>
      {formacoes.map(f => <CartaoFormacao key={`${f.tipo}-${f.id}`} formacao={f} email={email} aoInscrever={aoInscrever} />)}
      {!formacoes.length && <div className={estilos.vazioOrganizacao}><strong>Sem formações agendadas de momento</strong><p>As próximas sessões aparecem aqui assim que estiverem disponíveis.</p></div>}
    </div>
  </section>;
}

export function FormacoesGravadas() {
  const [categoria, setCategoria] = useState<string | null>(null);
  return <section id="formacoes-gravadas" aria-label="Formações gravadas">
    <Intro titulo="Formações gravadas" descricao="Aprende ao teu ritmo com as formações da Tropa de Elite e da iCliGo." />
    {categoria ? <CategoriaPagina key={categoria} categoriaId={categoria} embutida aoVoltar={() => setCategoria(null)} />
      : <FormacoesPagina embutida aoAbrirCategoria={setCategoria} />}
  </section>;
}

export function DocumentosNovaArea() {
  return <section id="documentos" aria-label="Documentos">
    <Intro titulo="Documentos" descricao="Apresentações, guias e materiais de apoio para o teu negócio." />
    <DocumentosPagina embutida />
  </section>;
}
