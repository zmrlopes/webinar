# Plano de carreira iCliGo — fonte atual

Verificado em 17/11/2026 no **Plano de Vendas e Incentivos**, página 14:
[PDF português oficial](https://s3.eu-central-2.wasabisys.com/icligo-legal/compensation_plan_pt.pdf#page=14).

O comunicado oficial «iCliGo Sales & Incentive Plan | Now Available», de
10/04/2026, liga diretamente este PDF e indica a sua localização no MyOffice:
**Conta → Perfil → final da página**. O comunicado foi consultado na ligação
autenticada já existente ao fórum, sem guardar credenciais neste documento.

| Patamar | Pontos acumulados | Canais independentes |
| --- | ---: | --- |
| Júnior | 0 | — |
| Sénior | 15 | — |
| Master | 75 | — |
| Coordenador | 250 | — |
| Diretor | 1.000 | 3 Masters em 3 canais |
| Bronze | 3.500 | 3 Coordenadores + 2 Masters em 5 canais |
| Prata / Silver | 12.500 | 2 Diretores + 3 Coordenadores em 5 canais |
| Ouro / Gold | 50.000 | 3 Diretores + 2 Coordenadores em 5 canais |
| Platina / Platinum | 225.000 | 5 Bronze + 5 Diretores + 5 Coordenadores em 15 canais |
| Safira / Safire | 1.125.000 | 7 Prata + 7 Bronze + 6 Diretores em 20 canais |
| Esmeralda / Emerald | 6.500.000 | 8 Ouro + 7 Prata + 10 Bronze em 25 canais |

A página 13 define um canal como a ramificação criada por um TP direto e
esclarece, no exemplo de Diretor, que o Master pode estar abaixo nesse canal.
A página 12 indica a manutenção do patamar alcançado; a aplicação usa o nível
registado, sem promover ou despromover alguém apenas pelos pontos.

Os dados da jornada vêm da conta e hierarquia atuais em `equipa_afiliados`;
o código partilhado das metas e requisitos está em
`src/lib/patamares-carreira.ts`. Os requisitos de canais usam uma única vaga
por linha, mesmo que essa linha contenha várias pessoas qualificadas.

O detalhe compara até três caminhos de desenvolvimento: preservar as vagas
atuais e redistribuí-las entre linhas, permitindo promover uma pessoa que já
conta para um patamar inferior e preencher essa vaga com outra linha. Primeiro
maximiza as vagas com pessoa identificada, depois minimiza os requisitos de
equipa ainda em falta nos candidatos e a soma dos seus défices de pontos.
Expõe cada pessoa, troca e distribuição prevista sem alterar qualificações.
A soma dos défices dos candidatos não substitui a meta de pontos do titular,
não inclui vagas sem dados e não mede interesse ou disponibilidade pessoal.

O documento anterior em `backoffice.icligo.com/novoPlano` diverge deste plano:
indicava Prata com 10.000 pontos, omitia os seus canais e terminava em Ouro
com 30.000 pontos. Não usar essa versão antiga para a jornada atual.
