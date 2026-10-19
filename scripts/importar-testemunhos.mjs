import { readFile, writeFile } from 'node:fs/promises';

const playlist = 'PLcjLwMW086tk0KgJ3LbNvy0fLsXqQ6rjv';
const ficheiro = process.argv.find(a => a.startsWith('--html='))?.slice(7);
const html = ficheiro ? await readFile(ficheiro, 'utf8') : await (async () => {
  const resposta = await fetch(`https://www.youtube.com/playlist?list=${playlist}`);
  if (!resposta.ok) throw new Error(`YouTube: ${resposta.status}`);
  return resposta.text();
})();
const dados = JSON.parse(html.match(/var ytInitialData = (.+?);<\/script>/)?.[1] ?? 'null');
if (!dados?.contents) throw new Error('Não foi possível ler a playlist. A lista existente foi preservada.');
const videos = new Map();
let incompleta = false;
function visitar(valor) {
  if (!valor || typeof valor !== 'object') return;
  if (valor.continuationItemRenderer) incompleta = true;
  const novo = valor.lockupViewModel;
  const antigo = valor.playlistVideoRenderer;
  if (novo?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
    const duracao = novo.contentImage?.thumbnailViewModel?.overlays
      ?.flatMap(o => o.thumbnailBottomOverlayViewModel?.badges ?? [])
      .map(b => b.thumbnailBadgeViewModel?.text).find(Boolean) ?? '';
    videos.set(novo.contentId, { id: novo.contentId, titulo: novo.metadata?.lockupMetadataViewModel?.title?.content, duracao });
  } else if (antigo?.isPlayable) {
    videos.set(antigo.videoId, { id: antigo.videoId, titulo: antigo.title?.runs?.map(r => r.text).join('') ?? antigo.title?.simpleText, duracao: antigo.lengthText?.simpleText ?? '' });
  }
  Object.values(valor).forEach(v => Array.isArray(v) ? v.forEach(visitar) : visitar(v));
}
visitar(dados.contents);
const lista = [...videos.values()];
if (incompleta || !lista.length || lista.some(v => !/^[\w-]{11}$/.test(v.id) || !v.titulo)) {
  throw new Error('A playlist não foi lida por completo. A lista existente foi preservada.');
}
const atuais = JSON.parse(await readFile('src/lib/testemunhos.json', 'utf8'));
const outrasFontes = atuais.filter(t => t.plataforma && t.plataforma !== 'youtube');
await writeFile('src/lib/testemunhos.json', JSON.stringify([...lista, ...outrasFontes], null, 2) + '\n');
console.log(`${lista.length} testemunhos YouTube importados; ${outrasFontes.length} de outras fontes preservados.`);
