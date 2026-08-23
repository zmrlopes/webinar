import { db } from "./db";

/**
 * Todos os emails que estão, direta ou indiretamente, abaixo de `email` na
 * hierarquia importada por scripts/importar-equipa.ts — a "equipa
 * descendente". Não inclui o próprio `email`. Devolve lista vazia para quem
 * não tem equipa (a maioria dos consultores) ou nem consta do CSV.
 */
export async function buscarDescendentesEmails(email: string): Promise<string[]> {
  const { rows } = await db().query<{ email: string }>(
    `with recursive descendentes as (
       select email from equipa_afiliados where upline_email = $1
       union all
       select ea.email from equipa_afiliados ea
       join descendentes d on ea.upline_email = d.email
     )
     select email from descendentes`,
    [email],
  );
  return rows.map((r) => r.email);
}

export interface NoEquipa {
  nome: string;
  email: string;
  nivel: string | null;
  estado: string;
  leadsProprios: number;
  leadsEquipa: number;
  filhos: NoEquipa[];
}

export interface ArvoreEquipa {
  diretos: number;
  equipaTotal: number;
  equipaAtiva: number;
  leadsEquipaTotal: number;
  raiz: NoEquipa[];
}

/**
 * A equipa descendente de `email`, em árvore (não só a lista plana de
 * `buscarDescendentesEmails`), com o número de leads reais que cada pessoa
 * trouxe para `webinarId`. `leadsEquipa` de um nó é a soma de `leadsProprios`
 * dele com a de toda a subárvore abaixo — por isso o valor no topo de cada
 * ramo já vem agregado, sem o painel ter de somar nada.
 */
export async function buscarArvoreEquipa(webinarId: string, email: string): Promise<ArvoreEquipa> {
  const { rows } = await db().query<{
    email: string;
    nome: string;
    upline_email: string | null;
    nivel: string | null;
    estado: string;
    leads_proprios: string;
  }>(
    `with recursive descendentes as (
       select email, nome, upline_email, nivel, estado
       from equipa_afiliados where upline_email = $1
       union all
       select ea.email, ea.nome, ea.upline_email, ea.nivel, ea.estado
       from equipa_afiliados ea
       join descendentes d on ea.upline_email = d.email
     )
     select d.email, d.nome, d.upline_email, d.nivel, d.estado,
            count(r.id) filter (where r.webinar_id = $2 and r.cancelada_em is null) as leads_proprios
     from descendentes d
     left join registrations r on r.referencia_email = d.email
     group by d.email, d.nome, d.upline_email, d.nivel, d.estado`,
    [email, webinarId],
  );

  const porEmail = new Map<string, NoEquipa & { uplineEmail: string | null }>(
    rows.map((r) => [
      r.email,
      {
        nome: r.nome,
        email: r.email,
        uplineEmail: r.upline_email,
        nivel: r.nivel,
        estado: r.estado,
        leadsProprios: Number(r.leads_proprios),
        leadsEquipa: 0,
        filhos: [],
      },
    ]),
  );

  const raiz: NoEquipa[] = [];
  for (const no of porEmail.values()) {
    if (no.uplineEmail === email) {
      raiz.push(no);
    } else {
      const pai = no.uplineEmail ? porEmail.get(no.uplineEmail) : undefined;
      if (pai) pai.filhos.push(no);
      else raiz.push(no); // upline fora da árvore (não devia acontecer, mas não perde a pessoa)
    }
  }

  function somarLeadsEquipa(no: NoEquipa): number {
    no.leadsEquipa = no.leadsProprios + no.filhos.reduce((soma, f) => soma + somarLeadsEquipa(f), 0);
    return no.leadsEquipa;
  }
  for (const no of raiz) somarLeadsEquipa(no);

  return {
    diretos: raiz.length,
    equipaTotal: rows.length,
    equipaAtiva: rows.filter((r) => r.estado === "ACTIVE").length,
    leadsEquipaTotal: raiz.reduce((soma, no) => soma + no.leadsEquipa, 0),
    raiz,
  };
}
