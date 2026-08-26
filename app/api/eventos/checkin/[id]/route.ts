import { marcarPresencaBilhete } from "@/lib/eventos";

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pagina(titulo: string, corpo: string): Response {
  const html = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(160deg, #1c1a16, #000);
    color: #e8e6df;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    padding: 2rem;
    box-sizing: border-box;
  }
  .caixa { max-width: 380px; }
  h1 { font-size: 1.4rem; margin: 0 0 0.5rem; color: #fff; }
  p { color: #b3b0a6; font-size: 0.95rem; }
  .marca { font-size: 3rem; margin-bottom: 0.5rem; }
</style>
</head>
<body>
  <div class="caixa">${corpo}</div>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * O que o QR code de cada bilhete do evento aponta para: ao ser lido por
 * qualquer câmara de telemóvel (sem app nenhuma), abre este link e marca a
 * presença desse bilhete (uma pessoa, ex: "Adulto 2"). Idempotente — ler o
 * mesmo código duas vezes não é erro, só mostra "já confirmado". Sem
 * autenticação, tal como /api/entrar/[id] — o id (uuid) não é adivinhável,
 * e é esse o risco aceite pedido para este fluxo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!FORMATO_UUID.test(id)) {
    return pagina("Bilhete inválido", `<h1>Bilhete inválido</h1><p>Este código não é reconhecido.</p>`);
  }

  const resultado = await marcarPresencaBilhete(id).catch((erro) => {
    console.error("falha ao marcar presença no evento:", erro);
    return undefined;
  });

  if (!resultado) {
    return pagina("Bilhete não encontrado", `<h1>Bilhete não encontrado</h1><p>Não encontrámos este bilhete.</p>`);
  }

  const identificacao = `${escaparHtml(resultado.nomeInscricao)} — ${escaparHtml(resultado.rotulo)}`;

  if (resultado.jaEstavaPresente) {
    return pagina(
      "Já confirmado",
      `<div class="marca">↻</div><h1>${identificacao}</h1><p>Presença já tinha sido confirmada antes.</p>`,
    );
  }

  return pagina(
    "Presença confirmada",
    `<div class="marca">✅</div><h1>${identificacao}</h1><p>Presença confirmada. Bem-vindo(a) ao Teambuilding Tropa de Elite!</p>`,
  );
}
