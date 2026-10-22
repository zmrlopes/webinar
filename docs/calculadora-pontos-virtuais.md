# Calculadora de pontos virtuais

Na nova área, em **Objetivos → Calculadoras**, exclusiva da conta de teste
através da restrição existente `podeVerNovaArea` (email de `src/lib/demo.ts`).
Abre no painel direito e usa as cores da plataforma. Não grava nem envia dados.

Referência consultada: https://v2teste.my.canva.site/pontos-virtuais (21/10/2026).

- Pontos virtuais = `Math.round(faturacao / 1540)`.
- Pontos em falta = `Math.max(0, patamar - pontosVirtuais)`.
- Faturação em falta = pontos em falta × 1540.
- Meta mensal = `Math.round(faturacaoEmFalta / meses)`.

Na referência, o campo «Pontos atuais» é lido mas não utilizado nas contas.
Mantém-se como campo opcional e informativo, com essa limitação explícita.
Não se soma ao total estimado a partir da faturação. A referência também
anuncia 1000 € = 0,66 pontos, que não corresponde exatamente ao divisor;
a implementação apresenta o divisor efetivamente utilizado e o arredondamento.

Entradas vazias obrigatórias ou inválidas não produzem resultados; meses têm
de ser inteiros positivos. Alterar os dados esconde o resultado anterior até
voltar a calcular. Um objetivo atingido apresenta zero em falta, inclusive
no planeamento mensal. A estimativa não altera as calculadoras existentes.

Verificação: `node node_modules/tsx/dist/cli.mjs scripts/testes-calculadora-pontos-virtuais.ts`.
