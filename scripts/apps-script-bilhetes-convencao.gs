/**
 * Apps Script da folha "Pedidos de bilhete – Convenção Nacional iCligo 2027".
 * Recebe os pedidos da página /bilhetes-convencao e acrescenta uma linha por pedido.
 *
 * Como instalar (uma vez):
 *  1. Na folha: Extensões > Apps Script. Apaga o que lá estiver e cola este ficheiro.
 *  2. Troca o valor de SEGREDO abaixo por uma frase longa só tua
 *     (a mesma que vais pôr em BILHETES_SHEETS_SEGREDO no Vercel).
 *  3. Implementar > Nova implementação > tipo "Aplicação Web".
 *     Executar como: Eu. Quem tem acesso: Qualquer pessoa.
 *  4. Autoriza, copia o URL que termina em /exec e põe-no em
 *     BILHETES_SHEETS_URL no Vercel.
 *
 * Se mais tarde alterares este código, faz Implementar > Gerir implementações >
 * editar > Nova versão, para o URL continuar o mesmo.
 */

const SEGREDO = "TROCA-ISTO-POR-UMA-FRASE-LONGA";

function doPost(e) {
  let dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (erro) {
    return responder({ ok: false, erro: "pedido inválido" });
  }
  if (dados.segredo !== SEGREDO) {
    return responder({ ok: false, erro: "segredo errado" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const folha = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    folha.appendRow([
      new Date(),
      celula(dados.nome),
      celula(dados.telemovel),
      celula(dados.email),
      Number(dados.bilhetes) || 1,
      celula(dados.acompanhantes),
      celula(dados.pagamento),
      celula(dados.observacoes),
    ]);
  } finally {
    lock.releaseLock();
  }
  return responder({ ok: true });
}

// Telemóveis como "+351..." seriam lidos como fórmula; o apóstrofo guarda-os como texto.
function celula(valor) {
  const texto = String(valor || "");
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
