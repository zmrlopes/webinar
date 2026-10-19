import { readFile, writeFile } from 'node:fs/promises';

const fonte = JSON.parse(await readFile('docs/testemunhos-instagram/icligo.json', 'utf8'));
const atuais = JSON.parse(await readFile('src/lib/testemunhos.json', 'utf8'));
const entradas = fonte.entradas.filter(e => e.usarNaBase !== false && e.tipo.startsWith('testemunho-'));
if (!entradas.length) throw new Error('Nenhum testemunho revisto disponível. O catálogo foi preservado.');

const instagram = entradas.map(e => {
  if (!/^[\w-]{11}$/.test(e.codigo) || e.url !== `https://www.instagram.com/reel/${e.codigo}/` || !e.resumo || !e.limites) {
    throw new Error(`Testemunho inválido: ${e.codigo}. O catálogo foi preservado.`);
  }
  const segundos = Math.round(e.duracaoSegundos ?? 0);
  return {
    id: `instagram:${e.codigo}`,
    titulo: e.titulo.replace(/^Instagram iCliGo — /, ''),
    duracao: segundos ? `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}` : '',
    plataforma: 'instagram',
    url: e.url,
    temas: e.temas,
    resumo: e.resumo,
    limites: e.limites,
  };
});
if (new Set(instagram.map(t => t.id)).size !== instagram.length) throw new Error('IDs Instagram repetidos.');
// Atualizar esta recolha sem apagar outras fontes nem testemunhos posteriores.
const ids = new Set(instagram.map(t => t.id));
const lista = [...atuais.filter(t => !ids.has(t.id)), ...instagram];
await writeFile('src/lib/testemunhos.json', JSON.stringify(lista, null, 2) + '\n');
console.log(`${instagram.length} testemunhos Instagram; ${lista.length} testemunhos no catálogo.`);
