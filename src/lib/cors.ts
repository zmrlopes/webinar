/**
 * CORS permissivo, só para os endpoints públicos (webinars, inscrições) —
 * pensado para serem chamados a partir de outro domínio (ex: um widget
 * HTML embutido no Elementor/WordPress). Nunca uses isto em /admin ou
 * /api/cron, que têm de ficar fechados ao próprio domínio.
 */
export const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function respostaOptionsCors(): Response {
  return new Response(null, { status: 204, headers: CABECALHOS_CORS });
}
