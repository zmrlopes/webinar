export interface Feriado {
  data: string; // "AAAA-MM-DD"
  nome: string;
}

/** Domingo de Páscoa, algoritmo de Meeus/Jones/Butcher (calendário gregoriano). */
export function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function adicionarDias(data: Date, dias: number): Date {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function formatarISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Feriados obrigatórios de Portugal + Carnaval, calculados localmente (sem dependências externas). */
export function feriadosLocais(ano: number): Feriado[] {
  const pascoa = domingoDePascoa(ano);

  return [
    { data: `${ano}-01-01`, nome: "Ano Novo" },
    { data: formatarISO(adicionarDias(pascoa, -47)), nome: "Carnaval" },
    { data: formatarISO(adicionarDias(pascoa, -2)), nome: "Sexta-feira Santa" },
    { data: formatarISO(pascoa), nome: "Páscoa" },
    { data: `${ano}-04-25`, nome: "Dia da Liberdade" },
    { data: `${ano}-05-01`, nome: "Dia do Trabalhador" },
    { data: formatarISO(adicionarDias(pascoa, 60)), nome: "Corpo de Deus" },
    { data: `${ano}-06-10`, nome: "Dia de Portugal" },
    { data: `${ano}-08-15`, nome: "Assunção de Nossa Senhora" },
    { data: `${ano}-10-05`, nome: "Implantação da República" },
    { data: `${ano}-11-01`, nome: "Todos os Santos" },
    { data: `${ano}-12-01`, nome: "Restauração da Independência" },
    { data: `${ano}-12-08`, nome: "Imaculada Conceição" },
    { data: `${ano}-12-25`, nome: "Natal" },
  ].sort((x, y) => x.data.localeCompare(y.data));
}

interface FeriadoNagerDate {
  date?: unknown;
  localName?: unknown;
  global?: unknown;
}

/**
 * Feriados locais, complementados (nunca substituídos) pela API gratuita
 * Nager.Date como verificação. O Carnaval vem sempre do cálculo local, porque
 * não é feriado obrigatório e por isso pode não constar da API. Se a API
 * falhar, não tiver dados, ou devolver algo inesperado, usa-se só o cálculo
 * local, sem mostrar erro ao utilizador.
 */
export async function obterFeriados(ano: number): Promise<Feriado[]> {
  const porData = new Map<string, Feriado>();
  for (const feriado of feriadosLocais(ano)) {
    porData.set(feriado.data, feriado);
  }

  try {
    const resposta = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/PT`);
    if (resposta.ok) {
      const dados: unknown = await resposta.json();
      if (Array.isArray(dados)) {
        for (const item of dados as FeriadoNagerDate[]) {
          if (item.global === true && typeof item.date === "string" && !porData.has(item.date)) {
            const nome = typeof item.localName === "string" ? item.localName : "Feriado";
            porData.set(item.date, { data: item.date, nome });
          }
        }
      }
    }
  } catch {
    // Sem rede ou API em baixo: mantém-se só o cálculo local.
  }

  return Array.from(porData.values()).sort((a, b) => a.data.localeCompare(b.data));
}

export function eFeriado(feriados: Feriado[], data: string): Feriado | undefined {
  return feriados.find((f) => f.data === data);
}
