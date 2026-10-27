"use client";

import { useEffect, useState } from "react";
import { prepararFicheiro } from "./convencao-cartao";

interface InscricaoTeambuilding {
  id: string;
  adultos: number;
  criancasMais10: number;
  criancasMenos10: number;
  comprovativoNome: string | null;
  criadoEm: string;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { dateStyle: "long", timeZone: "Europe/Lisbon" });
}

function resumoPessoas(i: InscricaoTeambuilding): string {
  const partes = [`${i.adultos} ${i.adultos === 1 ? "adulto" : "adultos"}`];
  const criancas = i.criancasMais10 + i.criancasMenos10;
  if (criancas > 0) partes.push(`${criancas} ${criancas === 1 ? "criança" : "crianças"}`);
  return partes.join(" · ");
}

/** O envio de um comprovativo novo para uma inscrição — substitui o anterior. */
function TrocarComprovativo({
  email,
  inscricao,
  numero,
  aoGravar,
}: {
  email: string;
  inscricao: InscricaoTeambuilding;
  numero: number | null;
  aoGravar: (inscricoes: InscricaoTeambuilding[]) => void;
}) {
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");
  const [acabouDeGravar, setAcabouDeGravar] = useState(false);
  const idCampo = `comprovativo-teambuilding-${inscricao.id}`;

  async function gravar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!ficheiro) {
      setErro("escolhe primeiro o novo comprovativo (fotografia ou PDF)");
      return;
    }
    setAGravar(true);
    setErro("");
    try {
      const preparado = await prepararFicheiro(ficheiro);
      if (preparado.size > 4 * 1024 * 1024) {
        setErro("o ficheiro não pode passar 4MB — tira uma fotografia ou um print do comprovativo");
        setAGravar(false);
        return;
      }
      const dados = new FormData();
      dados.set("email", email);
      dados.set("inscricaoId", inscricao.id);
      dados.set("ficheiro", preparado);
      const resposta = await fetch("/api/consultor/evento-comprovativo", { method: "POST", body: dados });
      const corpo = (await resposta.json().catch(() => null)) as { erro?: string; inscricoes?: InscricaoTeambuilding[] } | null;
      if (!resposta.ok || !corpo?.inscricoes) {
        setErro(corpo?.erro ?? "não foi possível gravar — tenta outra vez");
        setAGravar(false);
        return;
      }
      aoGravar(corpo.inscricoes);
      setAcabouDeGravar(true);
      setFicheiro(null);
      formulario.reset();
    } catch {
      setErro("falha de ligação — tenta outra vez");
    }
    setAGravar(false);
  }

  return (
    <form onSubmit={gravar} className="vqb-convencao-form">
      <label htmlFor={idCampo}>
        {numero !== null ? `Inscrição ${numero} · ` : ""}
        {resumoPessoas(inscricao)} · feita a {formatarData(inscricao.criadoEm)}
      </label>
      {acabouDeGravar ? (
        <p className="vqb-convencao-ok">Novo comprovativo gravado. Obrigado!</p>
      ) : (
        <p className="vqb-convencao-falta">
          Comprovativo atual: {inscricao.comprovativoNome ?? "enviado na inscrição"}. Para o mudar, escolhe o novo
          ficheiro e grava.
        </p>
      )}
      <input
        id={idCampo}
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => {
          setFicheiro(e.target.files?.[0] ?? null);
          setErro("");
          setAcabouDeGravar(false);
        }}
      />
      <button type="submit" disabled={aGravar}>
        {aGravar ? "A gravar…" : "Gravar novo comprovativo"}
      </button>
      {erro && <p className="vqb-erro">{erro}</p>}
    </form>
  );
}

/**
 * Cartão do Teambuilding de 14 de novembro no separador Eventos (área atual
 * e nova área): só aparece a quem tem inscrição com este email, e deixa
 * trocar o comprovativo de pagamento de cada inscrição.
 */
export function TeambuildingComprovativo({ email, mostrarCabecalho = true }: { email: string; mostrarCabecalho?: boolean }) {
  const [inscricoes, setInscricoes] = useState<InscricaoTeambuilding[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar(): Promise<void> {
      try {
        const dados = new FormData();
        dados.set("email", email);
        const resposta = await fetch("/api/consultor/evento-comprovativo", {
          method: "POST",
          body: dados,
          signal: controller.signal,
        });
        const corpo = (await resposta.json().catch(() => null)) as { inscricoes?: InscricaoTeambuilding[] } | null;
        if (controller.signal.aborted) return;
        if (!resposta.ok || !corpo?.inscricoes) {
          setErro(true);
          return;
        }
        setInscricoes(corpo.inscricoes);
      } catch {
        if (!controller.signal.aborted) setErro(true);
      }
    }
    void carregar();
    return () => controller.abort();
  }, [email]);

  if (erro) {
    return (
      <div className="vqb-cartao vqb-convencao">
        {mostrarCabecalho && <span className="vqb-destaque-etiqueta">Teambuilding</span>}
        <p className="vqb-erro">
          Não conseguimos carregar a tua inscrição no Teambuilding agora. Fecha e volta a abrir o painel daqui a um
          minuto.
        </p>
      </div>
    );
  }
  if (!inscricoes || inscricoes.length === 0) return null;

  return (
    <div className="vqb-cartao vqb-convencao">
      {mostrarCabecalho && <>
        <span className="vqb-destaque-etiqueta">Teambuilding</span>
        <h3 className="vqb-destaque-titulo">Teambuilding Tropa de Elite</h3>
        <p className="vqb-destaque-data">14 de novembro de 2026 · Fátima</p>
      </>}
      <p className="vqb-destaque-texto">
        Já estás inscrito. Se precisares de mudar o comprovativo de pagamento, envia aqui o novo — substitui o
        anterior.
      </p>
      <div className="vqb-convencao-pagamentos">
        {inscricoes.map((i, indice) => (
          <TrocarComprovativo
            key={i.id}
            email={email}
            inscricao={i}
            numero={inscricoes.length > 1 ? indice + 1 : null}
            aoGravar={setInscricoes}
          />
        ))}
      </div>
    </div>
  );
}
