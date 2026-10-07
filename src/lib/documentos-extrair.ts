/** Funciona no browser: a extração não fica limitada ao tempo de uma função de upload. */
export async function extrairTextoDocumento(nome: string, bytes: Uint8Array): Promise<string> {
  const extensao = nome.split('.').pop()?.toLowerCase();
  if (extensao === 'pdf') {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(bytes);
    try { return (await extractText(pdf, { mergePages: true })).text.trim(); }
    finally { await pdf.cleanup(); }
  }
  if (extensao === 'txt' || extensao === 'csv') return new TextDecoder().decode(bytes).trim();
  if (extensao === 'pptx' || extensao === 'docx' || extensao === 'xlsx') {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(bytes);
    const padrao = extensao === 'pptx' ? /^ppt\/slides\/slide\d+\.xml$/ : extensao === 'docx' ? /^word\/document\.xml$/ : /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/;
    const nomes = Object.keys(zip.files).filter(n => padrao.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (nomes.length > 2000) throw new Error('o documento tem demasiadas páginas');
    const texto: string[] = [];
    let total = 0;
    for (const n of nomes) {
      const xml = await zip.file(n)!.async('string');
      if (xml.length > 10_000_000) throw new Error('conteúdo do documento demasiado grande');
      const linhas = [...xml.matchAll(/<(?:a:|w:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:a:|w:)?t>/g)].map(m => m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
      const parte = linhas.join('\n');
      total += parte.length;
      if (total > 2_000_000) throw new Error('texto do documento demasiado grande');
      texto.push(parte);
    }
    return texto.join('\n\n').trim();
  }
  return '';
}
