export const MAX_ANEXO_EMAIL = 3 * 1024 * 1024;
const TIPOS:Record<string,string> = {
 xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 xls:'application/vnd.ms-excel', csv:'text/csv', pdf:'application/pdf',
 docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 doc:'application/msword', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
};
export type AnexoCampanha = {nome:string;tipo:string;bytes:Buffer};
export async function lerAnexoCampanha(ficheiro:File|null):Promise<AnexoCampanha|null> {
 if(!ficheiro) return null;
 const nome=ficheiro.name.normalize('NFC').replace(/[\x00-\x1f\x7f/\\]/g,'_');
 const extensao=nome.split('.').pop()?.toLowerCase()||'';
 const tipo=TIPOS[extensao];
 if(!tipo || nome.length>200) throw new Error('Escolhe um ficheiro Excel (.xlsx ou .xls), CSV, PDF, Word ou imagem PNG/JPG, com nome até 200 caracteres.');
 if(!ficheiro.size || ficheiro.size>MAX_ANEXO_EMAIL) throw new Error('O anexo deve ter conteúdo e ocupar até 3 MB.');
 const bytes=Buffer.from(await ficheiro.arrayBuffer());
 const inicio=bytes.subarray(0,8).toString('hex');
 const valido=extensao==='csv' ? !bytes.includes(0) :
  ['xlsx','docx'].includes(extensao) ? inicio.startsWith('504b0304') :
  ['xls','doc'].includes(extensao) ? inicio==='d0cf11e0a1b11ae1' :
  extensao==='pdf' ? bytes.subarray(0,5).toString()==='%PDF-' :
  extensao==='png' ? inicio==='89504e470d0a1a0a' : inicio.startsWith('ffd8ff');
 if(!valido) throw new Error('O conteúdo do anexo não corresponde ao formato indicado. Exporta ou guarda novamente o ficheiro e tenta de novo.');
 return {nome,tipo,bytes};
}
