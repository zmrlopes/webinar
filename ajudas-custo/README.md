# Mapa de Ajudas de Custo

Aplicação web para preencher o mapa mensal de ajudas de custo de um
colaborador e gerar um PDF pronto a assinar, visualmente igual ao modelo em
`referencia/Mapa_AjudasDeCusto_05_2026.pdf`.

Não guarda dados: não há base de dados, login nem histórico. O utilizador
escolhe o mês, preenche a tabela e descarrega o PDF. Ao sair da página com
dados preenchidos, o browser mostra um aviso.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. O PDF é gerado inteiramente
no browser com `@react-pdf/renderer`, sem servidor.

## Correr localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Outros comandos úteis:

```bash
npm run test   # testes unitários (Vitest) ao cálculo de feriados e totais
npm run lint   # verificação de tipos (tsc --noEmit)
npm run build  # build de produção
```

## Estrutura

```
app/            página principal (Next.js App Router)
components/     TabelaMapa, CabecalhoEmpresa, SeletorPeriodo, MapaPDF, BotaoGerarPdf
lib/            feriados.ts, calculos.ts, formatacao.ts (+ testes)
config/         empresa.ts — dados por omissão da empresa, editáveis na sessão
public/fonts/   Open Sans (TTF), embebida no PDF para suportar acentos e €
referencia/     PDF original usado como modelo de layout
```

## Feriados

Os feriados nacionais obrigatórios de Portugal + Carnaval são calculados
localmente em `lib/feriados.ts` (algoritmo de Meeus/Jones/Butcher para a
Páscoa), para a app funcionar sempre. Como verificação, a app também consulta
a API gratuita [Nager.Date](https://date.nager.at/) e junta feriados
nacionais adicionais que essa API devolva; se a API falhar ou não responder,
usa-se só o cálculo local, sem mostrar erro ao utilizador.

## Publicar no Vercel

Este projeto vive na subpasta `ajudas-custo/` do repositório. Para o publicar
como o seu próprio projeto Vercel:

1. Em [vercel.com](https://vercel.com), **Add New → Project**.
2. Seleciona o repositório GitHub.
3. Em **Root Directory**, escolhe `ajudas-custo` (Vercel deteta
   automaticamente que é um projeto Next.js dentro dessa pasta).
4. **Deploy** — não é preciso configurar variáveis de ambiente.
