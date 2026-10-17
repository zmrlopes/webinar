import { loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import QRCode from "qrcode";
import { desenharFundoMapa, enquadrar, noMapa, type Ponto } from "./travel-planner-mapas";
import {
  ALTURA, alturaParagrafo, cabecalho, CINZA, codificarPaginas, desenharCapa, icone, LARGURA, LINHA, logo, M, novaPagina, r,
  paginasDicas, paragrafo, registarFontes, retangulo, rodape, semFoto, sombra, tema, TINTA, viagem, cobrir, type FotoDesenho, type Icone, type Tema,
} from "./travel-planner-desenho";
import { euros, listasIncluido, plannerDaProposta, precosDaOpcao, type Proposta } from "./proposta";
import { dataPlanner, diasDaViagem, type MarcaPlanner, type TravelPlanner } from "./travel-planner";

export interface DadosProposta {
  p: Proposta; marca: MarcaPlanner; escala?: number;
  consultor: {nome: string; email: string; telemovel: string} | null;
  imagens: {capa: FotoDesenho | null; hoteis: (FotoDesenho | null)[]; destaques: (FotoDesenho | null)[]};
}

const LETRAS = ["A", "B", "C"];

function estrelas(ctx: SKRSContext2D, n: number, x: number, y: number, cor: string) {
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.translate(x + i * 26 + 11, y); ctx.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 4.5 : 11, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = cor; ctx.fill(); ctx.restore();
  }
}

function etiquetaEscolha(ctx: SKRSContext2D, t: Tema, x: number, y: number) {
  ctx.font = "18px PoppinsBold"; const texto = "A NOSSA ESCOLHA", w = ctx.measureText(texto).width + 70;
  retangulo(ctx, x, y, w, 44, 22, t.c.destaque);
  estrelas(ctx, 1, x + 14, y + 22, t.c.sobreDestaque);
  ctx.fillStyle = t.c.sobreDestaque; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(texto, x + 50, y + 23);
  return w;
}

const menorPreco = (p: Proposta) => Math.min(...p.opcoes.map(o => precosDaOpcao(o, p.viagem.viajantes).porPessoa ?? Infinity));

function capa(d: DadosProposta, t: Tema, img: Image | null) {
  const {p} = d, total = diasDaViagem(p.viagem.ida, p.viagem.regresso), desde = menorPreco(p);
  const pastilhas: [string, Icone][] = [];
  if (p.viagem.ida && p.viagem.regresso) pastilhas.push([`${dataPlanner(p.viagem.ida, {day: "numeric", month: "short"})} – ${dataPlanner(p.viagem.regresso, {day: "numeric", month: "short", year: "numeric"})}`, "calendario"]);
  if (total) pastilhas.push([`${total} dias`, "estrela"]);
  if (p.viagem.viajantes) pastilhas.push([`${p.viagem.viajantes} viajante${p.viagem.viajantes > 1 ? "s" : ""}`, "pessoas"]);
  return desenharCapa(t, img, {
    foto: d.imagens.capa, credito: p.foto?.credito ?? "", rotulo: "Proposta de viagem",
    sobretitulo: `${p.opcoes.length} ${p.opcoes.length === 1 ? "opção pensada" : "opções pensadas"} para vocês`, destino: p.viagem.destino, pastilhas,
    preco: Number.isFinite(desde) ? {rotulo: "desde, por pessoa", valor: euros(desde)} : null,
    assinatura: d.consultor?.nome ? {rotulo: "Preparada por", nome: d.consultor.nome} : null,
    direita: p.validade ? `Válida até ${dataPlanner(p.validade)}` : "",
  });
}

function incluido(d: DadosProposta, t: Tema, img: Image | null, plano: TravelPlanner, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Sem surpresas", "O que está incluído");
  const colW = listasIncluido(p).nao.length ? (LARGURA - 2 * M - 30) / 2 : LARGURA - 2 * M;
  const coluna = (titulo: string, itens: string[], x: number, sim: boolean) => {
    ctx.font = "21px Poppins";
    const alturas = itens.map(i => Math.max(46, alturaParagrafo(ctx, i, colW - 110, 30, 3) + 16));
    const h = 96 + alturas.reduce((s, a) => s + a, 0) + 20;
    retangulo(ctx, x, y, colW, h, 24, sim ? t.cartao : "#ffffff", sim ? undefined : LINHA);
    ctx.fillStyle = sim ? t.c.principalTexto : CINZA; ctx.font = "18px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText(titulo.toUpperCase(), x + 34, y + 54);
    let iy = y + 84;
    itens.forEach((item, k) => {
      ctx.beginPath(); ctx.arc(x + 50, iy + 17, 16, 0, Math.PI * 2); ctx.fillStyle = sim ? t.c.principal : "#e6e4dc"; ctx.fill();
      ctx.strokeStyle = sim ? t.c.sobrePrincipal : CINZA; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath();
      if (sim) { ctx.moveTo(x + 42, iy + 17); ctx.lineTo(x + 48, iy + 24); ctx.lineTo(x + 59, iy + 10); } else { ctx.moveTo(x + 44, iy + 11); ctx.lineTo(x + 56, iy + 23); ctx.moveTo(x + 56, iy + 11); ctx.lineTo(x + 44, iy + 23); }
      ctx.stroke();
      ctx.fillStyle = TINTA; ctx.font = "21px Poppins"; paragrafo(ctx, item, x + 84, iy + 4, colW - 110, 30, 3);
      iy += alturas[k]!;
    });
    return h;
  };
  const listas = listasIncluido(p);
  const sim = [...listas.sim, ...(p.viagem.bagagem && !listas.sim.some(i => /bagagem/i.test(i)) ? [`Bagagem: ${p.viagem.bagagem}`] : [])];
  const hSim = coluna("Incluído", sim.length ? sim : ["Confirma com o teu consultor o que está incluído."], M, true);
  const hNao = listas.nao.length ? coluna("Não incluído", listas.nao, M + colW + 30, false) : 0;
  y += Math.max(hSim, hNao) + 40;
  if (p.condicoes) {
    ctx.font = "20px Poppins"; const h = alturaParagrafo(ctx, p.condicoes, LARGURA - 2 * M - 80, 30, 10) + 100;
    retangulo(ctx, M, y, LARGURA - 2 * M, h, 24, t.c.destaqueSuave, t.c.destaque);
    ctx.fillStyle = TINTA; ctx.font = "22px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText("Condições", M + 40, y + 52);
    ctx.font = "20px Poppins"; paragrafo(ctx, p.condicoes, M + 40, y + 72, LARGURA - 2 * M - 80, 30, 10);
    y += h + 30;
  }
  if (p.validade) {
    retangulo(ctx, M, y, LARGURA - 2 * M, 110, 24, t.c.escura);
    icone(ctx, "calendario", M + 56, y + 55, 34, t.c.sobreEscura);
    ctx.fillStyle = t.c.sobreEscura; ctx.font = "26px PoppinsBold"; ctx.textBaseline = "middle"; ctx.fillText(`Proposta válida até ${dataPlanner(p.validade)}`, M + 100, y + 44);
    ctx.font = "19px Poppins"; ctx.globalAlpha = 0.8; ctx.fillText("Preços sujeitos a disponibilidade no momento da reserva.", M + 100, y + 78); ctx.globalAlpha = 1;
  }
  rodape(ctx, plano, n, img);
  return canvas;
}

function opcoes(d: DadosProposta, t: Tema, img: Image | null, plano: TravelPlanner, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Escolham a vossa", p.opcoes.length > 1 ? "As opções de alojamento" : "O alojamento");
  const livre = ALTURA - 130 - y, gap = 30, h = Math.min(520, (livre - gap * (p.opcoes.length - 1)) / p.opcoes.length), w = LARGURA - 2 * M, fotoW = Math.round(w * 0.44);
  p.opcoes.forEach((o, i) => {
    const escolhida = p.recomendada === i;
    sombra(ctx, true); retangulo(ctx, M, y, w, h, 26, "#ffffff", escolhida ? t.c.destaque : undefined); sombra(ctx, false);
    if (escolhida) { ctx.lineWidth = 5; ctx.strokeStyle = t.c.destaque; ctx.beginPath(); ctx.roundRect(M, y, w, h, r(ctx, 26)); ctx.stroke(); }
    const foto = d.imagens.hoteis[i];
    if (foto) cobrir(ctx, foto, M, y, fotoW, h, 26); else semFoto(ctx, t, M, y, fotoW, h, 26, o.hotel);
    retangulo(ctx, M + 24, y + 24, 70, 70, 16, p.estilo === "moderno" ? t.c.escura : t.c.principal);
    ctx.fillStyle = p.estilo === "moderno" ? t.c.sobreEscura : t.c.sobrePrincipal; ctx.font = "40px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(LETRAS[i]!, M + 59, y + 61); ctx.textAlign = "left";
    if (o.foto?.credito) { ctx.font = "12px Poppins"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.textBaseline = "alphabetic"; ctx.fillText(o.foto.credito.slice(0, 60), M + 16, y + h - 14, fotoW - 32); }
    const tx = M + fotoW + 40, tw = w - fotoW - 72;
    let ty = y + 36;
    if (escolhida) { etiquetaEscolha(ctx, t, tx, ty); ty += 62; }
    ctx.fillStyle = TINTA; ctx.font = t.titulo(38); ctx.textBaseline = "top";
    ty += paragrafo(ctx, t.maiusculas ? o.hotel.toUpperCase() : o.hotel, tx, ty, tw, 46, 2) + 8;
    if (o.estrelas) { estrelas(ctx, o.estrelas, tx, ty + 12, t.c.destaque); ty += 34; }
    ctx.font = "20px Poppins";
    for (const [ic, valor] of [["pin", o.zona], ["hotel", o.quarto], ["estrela", o.regime]] as const) {
      if (!valor || ty > y + h - 170) continue;
      icone(ctx, ic, tx + 14, ty + 15, 24, t.c.principalTexto);
      ctx.fillStyle = TINTA; ty += Math.max(36, paragrafo(ctx, valor, tx + 40, ty + 2, tw - 40, 28, 2) + 8);
    }
    if (o.diferencas && ty < y + h - 170) {
      ctx.fillStyle = t.c.principalTexto; ctx.font = "16px PoppinsBold"; ctx.fillText("NESTA OPÇÃO", tx, ty + 4);
      ctx.fillStyle = CINZA; ctx.font = "17px Poppins"; ty += 28 + paragrafo(ctx, o.diferencas, tx, ty + 28, tw, 24, 2);
    }
    // Preço no canto inferior.
    const py = y + h - 40;
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    const precos = precosDaOpcao(o, p.viagem.viajantes);
    ctx.fillStyle = TINTA; ctx.font = "54px PoppinsBold"; ctx.fillText(euros(precos.porPessoa ?? precos.total), M + w - 32, py - 26);
    ctx.fillStyle = CINZA; ctx.font = "19px Poppins";
    ctx.fillText(precos.porPessoa !== null ? (precos.total !== null ? `por pessoa · ${euros(precos.total)} no total` : "por pessoa") : "total", M + w - 32, py + 4);
    ctx.textAlign = "left";
    y += h + gap;
  });
  rodape(ctx, plano, n, img);
  return canvas;
}

async function comparacao(d: DadosProposta, t: Tema, img: Image | null, plano: TravelPlanner, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Lado a lado", "Comparar opções");
  const comCoords = p.opcoes.map((o, i) => ({o, i})).filter(({o}) => o.lat !== null && o.lng !== null);
  const linhasTabela: [string, (o: Proposta["opcoes"][number]) => string][] = [
    ["Alojamento", o => o.hotel], ["Categoria", o => o.estrelas ? " " : "—"], ["Zona", o => o.zona || "—"], ["Quarto", o => o.quarto || "—"],
    ["Regime", o => o.regime || "—"], ["Por pessoa", o => euros(precosDaOpcao(o, p.viagem.viajantes).porPessoa)], ["Total", o => euros(precosDaOpcao(o, p.viagem.viajantes).total)],
  ];
  const colRotulo = 220, colW = (LARGURA - 2 * M - colRotulo) / p.opcoes.length;
  ctx.font = "19px Poppins";
  const alturas = linhasTabela.map(([, f]) => Math.max(64, Math.max(...p.opcoes.map(o => alturaParagrafo(ctx, f(o), colW - 40, 27, 3))) + 34));
  const tabelaH = 100 + alturas.reduce((s, a) => s + a, 0);
  const mapaH = comCoords.length ? Math.max(360, ALTURA - 140 - y - tabelaH - 40) : 0;
  if (comCoords.length) {
    const area = {x: M, y, w: LARGURA - 2 * M, h: mapaH};
    const pontos: Ponto[] = comCoords.map(({o}) => ({lat: o.lat!, lng: o.lng!}));
    const base = pontos.length > 1 ? pontos : [...pontos, {lat: pontos[0]!.lat + 0.02, lng: pontos[0]!.lng + 0.02}, {lat: pontos[0]!.lat - 0.02, lng: pontos[0]!.lng - 0.02}];
    const e = enquadrar(base, area.w, area.h, 0.18, 15);
    await desenharFundoMapa(ctx, area, e, r(ctx, 24), t.escala >= 1.5 ? 2 : 1);
    ctx.save(); ctx.beginPath(); ctx.roundRect(area.x, area.y, area.w, area.h, r(ctx, 24)); ctx.clip();
    const posicoes: {x: number; y: number}[] = [];
    for (const {o, i} of comCoords) {
      const q = noMapa({lat: o.lat!, lng: o.lng!}, area, e);
      while (posicoes.some(k => Math.hypot(k.x - q.x, k.y - q.y) < 60)) q.x += 60;
      posicoes.push(q);
      const escolhida = p.recomendada === i;
      sombra(ctx, true);
      ctx.beginPath(); ctx.arc(q.x, q.y - 40, 30, Math.PI * 0.78, Math.PI * 2.22); ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fillStyle = escolhida ? t.c.destaque : t.c.principal; ctx.fill();
      sombra(ctx, false);
      ctx.fillStyle = escolhida ? t.c.sobreDestaque : t.c.sobrePrincipal; ctx.font = "28px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(LETRAS[i]!, q.x, q.y - 39); ctx.textAlign = "left";
      ctx.font = "18px PoppinsBold"; const nome = o.hotel.length > 34 ? `${o.hotel.slice(0, 33)}…` : o.hotel, w = ctx.measureText(nome).width + 28;
      const lx = Math.min(Math.max(q.x - w / 2, area.x + 10), area.x + area.w - w - 10);
      sombra(ctx, true); retangulo(ctx, lx, q.y + 10, w, 40, 20, "#fff"); sombra(ctx, false);
      ctx.fillStyle = TINTA; ctx.fillText(nome, lx + 14, q.y + 31);
    }
    ctx.restore();
    y += mapaH + 40;
  }
  // Tabela.
  sombra(ctx, true); retangulo(ctx, M, y, LARGURA - 2 * M, tabelaH, 24, "#ffffff"); sombra(ctx, false);
  p.opcoes.forEach((o, i) => {
    const x = M + colRotulo + i * colW, escolhida = p.recomendada === i;
    if (escolhida) retangulo(ctx, x + 6, y + 6, colW - 12, tabelaH - 12, 18, t.c.destaqueFundo);
    retangulo(ctx, x + colW / 2 - 28, y + 22, 56, 56, 14, escolhida ? t.c.destaque : t.c.principal);
    ctx.fillStyle = escolhida ? t.c.sobreDestaque : t.c.sobrePrincipal; ctx.font = "30px PoppinsBold"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(LETRAS[i]!, x + colW / 2, y + 51); ctx.textAlign = "left";
  });
  let ly = y + 100;
  linhasTabela.forEach(([rotulo, f], k) => {
    if (k) { ctx.fillStyle = LINHA; ctx.fillRect(M + 24, ly, LARGURA - 2 * M - 48, 1.5); }
    ctx.fillStyle = CINZA; ctx.font = "16px PoppinsBold"; ctx.textBaseline = "top"; ctx.fillText(rotulo.toUpperCase(), M + 30, ly + 20);
    p.opcoes.forEach((o, i) => {
      const destaque = rotulo === "Por pessoa" || rotulo === "Alojamento";
      ctx.fillStyle = rotulo === "Categoria" ? t.c.destaque : TINTA; ctx.font = destaque ? "20px PoppinsBold" : "19px Poppins";
      if (rotulo === "Categoria" && o.estrelas) estrelas(ctx, o.estrelas, M + colRotulo + i * colW + 20, ly + 32, t.c.destaque);
      else paragrafo(ctx, f(o), M + colRotulo + i * colW + 20, ly + 18, colW - 40, 27, 3);
    });
    ly += alturas[k]!;
  });
  rodape(ctx, plano, n, img);
  return canvas;
}

function destaques(d: DadosProposta, t: Tema, img: Image | null, plano: TravelPlanner, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  const y0 = cabecalho(ctx, t, "Inspirem-se", `O melhor de ${p.viagem.destino.split(",")[0]}`);
  const lista = p.destaques.slice(0, 6), colW = (LARGURA - 2 * M - 30) / 2;
  const linhasN = Math.ceil(lista.length / 2), cartaoH = (ALTURA - 130 - y0 - (linhasN - 1) * 30) / linhasN, fotoH = cartaoH - 190;
  lista.forEach((dd, i) => {
    const x = M + (i % 2) * (colW + 30), y = y0 + Math.floor(i / 2) * (cartaoH + 30);
    // Com um número ímpar, o último ocupa a largura toda.
    const w = lista.length % 2 && i === lista.length - 1 ? LARGURA - 2 * M : colW;
    sombra(ctx, true); retangulo(ctx, x, y, w, cartaoH, 24, "#ffffff"); sombra(ctx, false);
    const foto = d.imagens.destaques[i];
    if (foto) cobrir(ctx, foto, x, y, w, fotoH, 24); else semFoto(ctx, t, x, y, w, fotoH, 24, dd.titulo);
    ctx.fillStyle = TINTA; ctx.font = t.titulo(30); ctx.textBaseline = "top";
    paragrafo(ctx, t.maiusculas ? dd.titulo.toUpperCase() : dd.titulo, x + 28, y + fotoH + 22, w - 56, 36, 1);
    ctx.font = "18px Poppins"; ctx.fillStyle = "#333"; paragrafo(ctx, dd.texto, x + 28, y + fotoH + 70, w - 56, 26, 4);
  });
  rodape(ctx, plano, n, img);
  return canvas;
}

async function fecho(d: DadosProposta, t: Tema, img: Image | null, plano: TravelPlanner, n: number) {
  const {p} = d, {canvas, ctx} = novaPagina(t);
  let y = cabecalho(ctx, t, "Vamos reservar?", "Próximo passo");
  ctx.fillStyle = TINTA; ctx.font = "24px Poppins"; ctx.textBaseline = "top";
  y += paragrafo(ctx, `Escolham a opção que mais gostaram${p.opcoes.length > 1 ? ` (${LETRAS.slice(0, p.opcoes.length).join(", ")})` : ""} e falem comigo. Trato de tudo para que só tenham de fazer as malas.`, M, y, LARGURA - 2 * M, 36) + 40;
  const whatsapp = d.consultor?.telemovel;
  const caixaH = 360;
  sombra(ctx, true); retangulo(ctx, M, y, LARGURA - 2 * M, caixaH, 28, "#ffffff"); sombra(ctx, false);
  if (whatsapp) {
    const mensagem = `Olá! Vi a proposta para ${p.viagem.destino} e gostava de avançar.`;
    const qr = await loadImage(await QRCode.toBuffer(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`, {width: 640, margin: 1, color: {dark: d.marca.escura === "#ffffff" ? "#111111" : TINTA, light: "#ffffff"}}));
    ctx.drawImage(qr, M + 40, y + 40, caixaH - 80, caixaH - 80);
  }
  const tx = M + (whatsapp ? caixaH + 10 : 50), tw = LARGURA - 2 * M - (tx - M) - 40;
  let ty = y + 56;
  ctx.fillStyle = t.c.principalTexto; ctx.font = "17px PoppinsBold"; ctx.textBaseline = "alphabetic"; ctx.fillText(whatsapp ? "FALEM COMIGO NO WHATSAPP" : "O VOSSO CONSULTOR DE VIAGENS", tx, ty);
  ty += 56;
  if (d.consultor?.nome) { ctx.fillStyle = TINTA; ctx.font = t.titulo(44); ctx.fillText(d.consultor.nome, tx, ty, tw); ty += 50; }
  ctx.font = "22px Poppins"; ctx.fillStyle = "#333";
  if (whatsapp) { icone(ctx, "telefone", tx + 12, ty - 8, 24, t.c.principalTexto); ctx.fillText(`+${whatsapp.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4")}`, tx + 36, ty); ty += 40; }
  if (d.consultor) { icone(ctx, "email", tx + 12, ty - 8, 24, t.c.principalTexto); ctx.fillText(d.consultor.email, tx + 36, ty, tw - 36); ty += 40; }
  if (whatsapp) { ctx.font = "18px Poppins"; ctx.fillStyle = CINZA; ctx.fillText("Apontem a câmara do telemóvel para o código.", tx, ty + 12, tw); }
  y += caixaH + 40;
  if (p.emergencia.texto) {
    ctx.font = "19px Poppins"; const h = alturaParagrafo(ctx, p.emergencia.texto, LARGURA - 2 * M - 80, 28, 6) + 96;
    retangulo(ctx, M, y, LARGURA - 2 * M, h, 24, t.cartao);
    icone(ctx, "telefone", M + 54, y + 46, 28, t.c.principalTexto);
    ctx.fillStyle = TINTA; ctx.font = "22px PoppinsBold"; ctx.textBaseline = "middle"; ctx.fillText("Emergência no destino", M + 90, y + 46);
    ctx.font = "19px Poppins"; paragrafo(ctx, p.emergencia.texto, M + 40, y + 80, LARGURA - 2 * M - 80, 28, 6);
    y += h + 30;
  }
  if (p.validade) {
    retangulo(ctx, M, y, LARGURA - 2 * M, 100, 24, t.c.destaqueSuave, t.c.destaque);
    icone(ctx, "calendario", M + 54, y + 50, 32, t.c.destaque);
    ctx.fillStyle = TINTA; ctx.font = "24px PoppinsBold"; ctx.textBaseline = "middle"; ctx.fillText(`Proposta válida até ${dataPlanner(p.validade)}`, M + 96, y + 40);
    ctx.font = "18px Poppins"; ctx.fillStyle = CINZA; ctx.fillText("Os lugares e os preços dependem da disponibilidade no momento da reserva.", M + 96, y + 70);
    y += 130;
  }
  const fotoH = ALTURA - 130 - y;
  if (fotoH > 260) {
    const foto = d.imagens.destaques.find(Boolean) ?? d.imagens.capa;
    if (foto) cobrir(ctx, foto, M, y, LARGURA - 2 * M, fotoH, 26); else semFoto(ctx, t, M, y, LARGURA - 2 * M, fotoH, 26, "");
    ctx.save(); ctx.beginPath(); ctx.roundRect(M, y, LARGURA - 2 * M, fotoH, r(ctx, 26)); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + fotoH); g.addColorStop(0.3, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = g; ctx.fillRect(M, y, LARGURA - 2 * M, fotoH); ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = t.titulo(76); ctx.textBaseline = "alphabetic";
    ctx.fillText(t.maiusculas ? "A VOSSA VIAGEM ESPERA!" : "A vossa viagem espera!", M + 50, y + fotoH - 56, LARGURA - 2 * M - 100);
  }
  rodape(ctx, plano, n, img);
  return canvas;
}

/** Todas as páginas da proposta, como JPEG. */
export async function desenharProposta(d: DadosProposta): Promise<Buffer[]> {
  registarFontes();
  const t = tema(d.p.estilo, d.marca, d.escala ?? 2), img = await logo();
  // As páginas partilhadas com o travel planner recebem a proposta no formato dele.
  const base = plannerDaProposta(d.p, 0, d.p.id);
  const plano: TravelPlanner = {...base, viagem: {...base.viagem, hotel: "", quarto: "", regime: ""}};
  const paginas = [capa(d, t, img)];
  if (plano.voos.length || d.p.viagem.voo) paginas.push(await viagem({p: plano, marca: d.marca, consultor: d.consultor, imagens: {capa: null, hotel: null, dias: []}}, t, img, paginas.length + 1));
  paginas.push(incluido(d, t, img, plano, paginas.length + 1));
  if (d.p.opcoes.length) paginas.push(opcoes(d, t, img, plano, paginas.length + 1));
  if (d.p.opcoes.length > 1) paginas.push(await comparacao(d, t, img, plano, paginas.length + 1));
  if (d.p.destaques.length) paginas.push(destaques(d, t, img, plano, paginas.length + 1));
  if (d.p.dicas.some(x => x.texto) || d.p.extras.clima.length) {
    paginas.push(...paginasDicas({p: plano, marca: d.marca, consultor: d.consultor, imagens: {capa: null, hotel: null, dias: []}}, t, img, paginas.length + 1));
  }
  paginas.push(await fecho(d, t, img, plano, paginas.length + 1));
  return codificarPaginas(paginas, t);
}

