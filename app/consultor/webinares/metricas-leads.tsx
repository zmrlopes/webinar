"use client";

type EstadoLead = "follow_up" | "convertido" | "desistiu";

export interface LeadMetricas {
  nome: string;
  telemovel: string | null;
  email: string;
  assistiu: boolean;
  estado: EstadoLead | null;
  podeEditar: boolean;
  estadoAtualizadoEm: string | null;
  ultimaSessaoInscrita: string | null;
}

const DIA = 24 * 60 * 60 * 1000;
/** Margem depois do início da sessão para a presença do Zoom já estar registada. */
const MARGEM_PRESENCA = 3 * 60 * 60 * 1000;

function percentagem(parte: number, total: number): string {
  return total > 0 ? `${Math.round((parte / total) * 100)}%` : "—";
}

function diasDesde(iso: string, agora: number): number {
  return Math.floor((agora - new Date(iso).getTime()) / DIA);
}

/** Funil da aba visível — inscritas → assistiram → follow up → converteram. */
export function FunilLeads({ leads }: { leads: LeadMetricas[] }) {
  const inscritas = leads.length;
  const assistiram = leads.filter((l) => l.assistiu).length;
  const followUp = leads.filter((l) => l.estado === "follow_up").length;
  const converteram = leads.filter((l) => l.estado === "convertido").length;
  const convertidasQueAssistiram = leads.filter((l) => l.estado === "convertido" && l.assistiu).length;

  const passos = [
    { numero: inscritas, legenda: "Inscritas", detalhe: "" },
    { numero: assistiram, legenda: "Assistiram", detalhe: `${percentagem(assistiram, inscritas)} das inscritas` },
    { numero: followUp, legenda: "Em follow up", detalhe: "" },
    { numero: converteram, legenda: "Converteram", detalhe: `${percentagem(convertidasQueAssistiram, assistiram)} de quem assistiu` },
  ];

  return (
    <ol className="vqw-funil" aria-label="Funil das leads">
      {passos.map((p) => (
        <li key={p.legenda} className="vqw-funil-passo">
          <div className="vqw-numero">{p.numero}</div>
          <div className="vqw-legenda">{p.legenda}</div>
          {p.detalhe && <div className="vqw-funil-detalhe">{p.detalhe}</div>}
        </li>
      ))}
    </ol>
  );
}

/** Leads do próprio consultor que pedem um contacto hoje. */
export function AcoesLeads({ leads }: { leads: LeadMetricas[] }) {
  const agora = Date.now();
  const proprias = leads.filter((l) => l.podeEditar);

  const grupos = [
    {
      titulo: "Assistiram e ainda sem contacto",
      dica: "Viram o webinar e ainda não têm estado — o melhor momento para falar é agora.",
      leads: proprias.filter((l) => l.assistiu && l.estado === null),
      nota: () => "",
    },
    {
      titulo: "Follow up parado há mais de 7 dias",
      dica: "Retoma a conversa ou marca como Converteu/Desistiu.",
      leads: proprias.filter(
        (l) => l.estado === "follow_up" && l.estadoAtualizadoEm !== null && diasDesde(l.estadoAtualizadoEm, agora) > 7,
      ),
      nota: (l: LeadMetricas) => (l.estadoAtualizadoEm ? `há ${diasDesde(l.estadoAtualizadoEm, agora)} dias` : ""),
    },
    {
      titulo: "Inscreveram-se e faltaram",
      dica: "Convida-as para a próxima sessão.",
      leads: proprias.filter(
        (l) =>
          !l.assistiu &&
          l.estado === null &&
          l.ultimaSessaoInscrita !== null &&
          new Date(l.ultimaSessaoInscrita).getTime() + MARGEM_PRESENCA < agora,
      ),
      nota: () => "",
    },
  ];

  return (
    <section className="vqw-acoes" aria-labelledby="titulo-acoes-leads">
      <h2 id="titulo-acoes-leads">A precisar de ação</h2>
      <div className="vqw-acoes-grid">
        {grupos.map((g) => (
          <details key={g.titulo} className="vqw-acao">
            <summary>
              <span className="vqw-acao-numero">{g.leads.length}</span>
              <span>
                <strong>{g.titulo}</strong>
                <small>{g.dica}</small>
              </span>
            </summary>
            {g.leads.length === 0 ? (
              <p className="vqw-mudo">Nada pendente aqui.</p>
            ) : (
              <ul>
                {g.leads.map((l) => (
                  <li key={l.email}>
                    <span>{l.nome}</span>
                    <span className="vqw-mudo">
                      {[l.telemovel, g.nota(l)].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
