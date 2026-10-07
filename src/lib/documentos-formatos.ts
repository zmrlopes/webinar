export const TAMANHO_PARTE = 1024 * 1024;
export const TAMANHO_MAX_DOCUMENTO = 1024 * 1024 * 1024;
export const FORMATOS_DOCUMENTOS: Record<string, string> = {
  pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv',
};
export function tipoDocumento(nome: string): string | null {
  return FORMATOS_DOCUMENTOS[nome.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}
export function fragmentarTexto(texto: string): string[] {
  const limpo = texto.replace(/\u0000/g, '').trim();
  const partes: string[] = [];
  for (let i = 0; i < limpo.length; i += 1800) partes.push(limpo.slice(i, i + 2200));
  return partes;
}
export function formatarTamanho(tamanho: number): string {
  return tamanho >= 1024 * 1024 ? `${(tamanho / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(tamanho / 1024)} KB`;
}
