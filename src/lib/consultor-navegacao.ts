/** Os favoritos antigos abrem a mesma secção dentro da única área de consultor. */
export const REDIRECIONAMENTOS_AREA_ANTIGA = [
  { source: "/consultor", destination: "/consultor/nova-area" },
  { source: "/consultor/webinares", destination: "/consultor/nova-area?seccao=leads" },
  { source: "/consultor/core-rank", destination: "/consultor/nova-area?seccao=core-rank" },
  { source: "/consultor/blackfriday", destination: "/consultor/nova-area?seccao=blackfriday" },
  { source: "/consultor/calendario", destination: "/consultor/nova-area?seccao=calendario" },
  { source: "/consultor/calendario-criativo", destination: "/consultor/nova-area?seccao=calendario-criativo" },
  { source: "/consultor/documentos", destination: "/consultor/nova-area?seccao=documentos" },
  { source: "/consultor/formacoes/testemunhos", destination: "/consultor/nova-area?seccao=testemunhos" },
  { source: "/consultor/formacoes/:categoria", destination: "/consultor/nova-area?seccao=formacoes-gravadas&categoria=:categoria" },
  { source: "/consultor/formacoes", destination: "/consultor/nova-area?seccao=formacoes-gravadas" },
];

const SECCOES = ["inicio", "comeca-aqui", "calendario", "blackfriday", "calendario-criativo", "leads", "mentor-checklist", "proximo-webinar", "proximas-formacoes", "formacoes-gravadas", "testemunhos", "assistente", "documentos", "eventos-presenciais", "calculadoras", "core-rank", "reservas", "destino-dia", "travel-planner", "propostas", "operadores", "negocio", "orcamentos", "admin"] as const;
export type SeccaoNovaArea = typeof SECCOES[number];

export function seccaoEntradaNovaArea(pesquisa: string, souLider: boolean): SeccaoNovaArea {
  const pedida = new URLSearchParams(pesquisa).get("seccao");
  return SECCOES.find(seccao => seccao === pedida && (seccao !== "admin" || souLider)) ?? "inicio";
}
