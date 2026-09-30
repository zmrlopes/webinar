/**
 * Temas em que cada aula é arrumada. O assistente de objeções escolhe os
 * temas que batem com a dúvida da lead e só manda ao modelo o conhecimento
 * desses — a base inteira não cabe numa resposta.
 */
export const TEMAS_CONHECIMENTO: { id: string; nome: string }[] = [
  { id: "objecoes-metodo", nome: "Método para lidar com objeções" },
  { id: "objecao-dinheiro", nome: "Objeção: não tenho dinheiro" },
  { id: "objecao-tempo", nome: "Objeção: não tenho tempo" },
  { id: "objecao-vendas", nome: "Objeção: não tenho jeito para vendas" },
  { id: "objecao-medo", nome: "Objeção: medo de falhar / não sei se consigo" },
  {
    id: "objecao-piramide",
    nome: "Objeção: é pirâmide / desconfiança do network marketing",
  },
  {
    id: "objecao-pensar",
    nome: "Objeção: vou pensar / tenho de falar com alguém",
  },
  { id: "fecho", nome: "Fecho e decisão" },
  { id: "acompanhamento", nome: "Acompanhamento depois da apresentação" },
  { id: "convite", nome: "Convite" },
  { id: "lista-contactos", nome: "Lista de contactos" },
  { id: "apresentacao", nome: "Apresentação e webinar" },
  { id: "historia", nome: "A tua história" },
  { id: "mindset", nome: "Mindset, crença e postura" },
  { id: "lideranca-equipa", nome: "Liderança e duplicação da equipa" },
  {
    id: "negocio-icligo",
    nome: "O negócio iCliGo: modelo, ganhos, licença, plano de carreira",
  },
  { id: "vendas-viagens", nome: "Vender viagens a clientes" },
  { id: "produto-destinos", nome: "Produto e destinos" },
  { id: "ferramentas", nome: "Ferramentas digitais e marketing" },
];
