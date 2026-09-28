/**
 * Mapa de destinos para a pesquisa das Formações: cada lugar (ilha, cidade,
 * região, país) leva as palavras dos sítios "de cima" — país, região,
 * continente. Assim, uma formação que só diz "Sal" no título também aparece
 * quando se pesquisa "Cabo Verde" ou "África".
 *
 * Tudo em minúsculas e sem acentos. As ligações encadeiam: sal → cabo verde
 * → africa. Para acrescentar um destino, basta uma linha aqui.
 */
const DESTINOS: [lugar: string, acima: string][] = [
  // Continentes e grandes regiões
  ["continente europeu", "europa"],
  ["continente africano", "africa"],
  ["continente asiatico", "asia"],
  ["continente americano", "america"],
  ["america do norte", "america"],
  ["america central", "america"],
  ["america do sul", "america"],
  ["caraibas", "america central"],
  ["medio oriente", "asia"],
  ["balcas", "europa"],
  ["balticos", "europa"],
  ["escandinavia", "europa"],
  ["indico", "oceano indico"],

  // Europa
  ["portugal", "europa"],
  ["portugal continental", "portugal"],
  ["acores", "portugal"],
  ["sao miguel", "acores"],
  ["pico", "acores"],
  ["madeira", "portugal"],
  ["porto santo", "madeira"],
  ["espanha", "europa"],
  ["andaluzia", "espanha"],
  ["serra nevada", "espanha neve"],
  ["barcelona", "espanha"],
  ["madrid", "espanha"],
  ["canarias", "espanha"],
  ["tenerife", "canarias"],
  ["baleares", "espanha"],
  ["menorca", "baleares"],
  ["maiorca", "baleares"],
  ["ibiza", "baleares"],
  ["franca", "europa"],
  ["paris", "franca"],
  ["disneyland", "paris"],
  ["riviera francesa", "franca"],
  ["italia", "europa"],
  ["milao", "italia"],
  ["roma", "italia"],
  ["toscana", "italia"],
  ["costa amalfitana", "italia"],
  ["sardenha", "italia"],
  ["sicilia", "italia"],
  ["grecia", "europa"],
  ["atenas", "grecia"],
  ["corfu", "grecia"],
  ["creta", "grecia"],
  ["ilha grega", "grecia"],
  ["ilhas gregas", "grecia"],
  ["albania", "balcas"],
  ["croacia", "balcas"],
  ["montenegro", "balcas"],
  ["bulgaria", "balcas"],
  ["malta", "europa"],
  ["chipre", "europa"],
  ["reino unido", "europa"],
  ["inglaterra", "reino unido"],
  ["londres", "reino unido"],
  ["islandia", "europa"],
  ["noruega", "escandinavia"],
  ["suecia", "escandinavia"],
  ["finlandia", "escandinavia"],
  ["laponia", "finlandia"],
  ["lituania", "balticos"],
  ["letonia", "balticos"],
  ["estonia", "balticos"],
  ["turquia", "europa asia"],
  ["istambul", "turquia"],
  ["capadocia", "turquia"],
  ["pamukkale", "turquia"],
  ["antalya", "turquia"],
  ["riviera turca", "turquia"],

  // África
  ["cabo verde", "africa"],
  ["sal", "ilha do sal cabo verde"],
  ["boa vista", "cabo verde"],
  ["sao tome", "sao tome e principe"],
  ["sao tome e principe", "africa"],
  ["africa do sul", "africa"],
  ["cape town", "cidade do cabo africa do sul"],
  ["cidade do cabo", "cape town africa do sul"],
  ["quenia", "africa safari"],
  ["tanzania", "africa"],
  ["zanzibar", "tanzania indico"],
  ["namibia", "africa safari"],
  ["senegal", "africa"],
  ["marrocos", "africa"],
  ["marrakech", "marrocos"],
  ["saidia", "marrocos"],
  ["tunisia", "africa"],
  ["djerba", "tunisia"],
  ["egito", "africa"],
  ["cairo", "egito"],
  ["nilo", "egito"],
  ["seychelles", "africa indico"],
  ["mauricias", "africa indico"],
  ["mauricia", "mauricias"],

  // Ásia e Médio Oriente
  ["japao", "asia"],
  ["toquio", "japao"],
  ["china", "asia"],
  ["india", "asia"],
  ["rajastao", "india"],
  ["sri lanka", "asia"],
  ["maldivas", "asia indico"],
  ["tailandia", "asia"],
  ["vietnam", "vietname asia"],
  ["vietname", "vietnam asia"],
  ["filipinas", "asia"],
  ["singapura", "asia"],
  ["indonesia", "asia"],
  ["bali", "indonesia"],
  ["emirados arabes unidos", "medio oriente"],
  ["dubai", "emirados arabes unidos"],
  ["abu dhabi", "emirados arabes unidos"],
  ["oma", "medio oriente"],
  ["jordania", "medio oriente"],

  // Américas
  ["eua", "estados unidos"],
  ["estados unidos", "eua america do norte"],
  ["nova iorque", "new york estados unidos"],
  ["new york", "nova iorque estados unidos"],
  ["mexico", "america central"],
  ["riviera maya", "mexico caraibas"],
  ["rivieira maya", "riviera maya"],
  ["cancun", "riviera maya"],
  ["panama", "america central"],
  ["costa rica", "america central"],
  ["cuba", "caraibas"],
  ["aruba", "caraibas"],
  ["curacau", "curacao caraibas"],
  ["curacao", "curacau caraibas"],
  ["bahamas", "caraibas"],
  ["jamaica", "caraibas"],
  ["guadalupe", "caraibas"],
  ["republica dominicana", "caraibas"],
  ["punta cana", "republica dominicana"],
  ["peru", "america do sul"],
  ["brasil", "america do sul"],
  ["colombia", "america do sul"],
];

/** Palavras separadas por um espaço, com espaços nas pontas: " ilha do sal ". */
function soPalavras(texto: string): string {
  return ` ${texto.replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/**
 * Junta ao texto (já em minúsculas e sem acentos) os destinos "de cima" de
 * cada lugar que lá aparece como palavra inteira — "sal" conta, "salvador"
 * não.
 */
export function comDestinos(texto: string): string {
  let palavras = soPalavras(texto);
  const extra: string[] = [];
  const vistos = new Set<string>();
  // Repete até não haver novidades, para seguir as ligações em cadeia.
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const [lugar, acima] of DESTINOS) {
      if (vistos.has(lugar) || !palavras.includes(` ${lugar} `)) continue;
      vistos.add(lugar);
      extra.push(acima);
      palavras += `${acima} `;
      mudou = true;
    }
  }
  return extra.length > 0 ? `${texto} ${extra.join(" ")}` : texto;
}
