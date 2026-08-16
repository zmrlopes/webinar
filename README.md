# webinar

Sistema de webinars, integrado com a sala partilhada de Zoom "Vão Quadrado"
(ver `GUIA-ZOOM-VAO-QUADRADO.md`, entregue à parte — não versionado por conter
uma credencial viva).

## Estado

Implementação por fases, seguindo a secção 14 do guia. Progresso:

- [x] **Fase 1** — chave no ambiente + cliente da API (`src/lib/sala-zoom.ts`) + testes 1-5
- [x] **Fase 2** — colunas novas na base de dados (`migrations/`)
- [x] **Fase 3** — sincronização de sessões (`src/lib/sessoes.ts`)
- [x] **Fase 4** — formulário grava e enfileira (`src/lib/inscricoes.ts`)
- [x] **Fase 5** — fila dos links, com recuo crescente (`src/lib/fila-links.ts`)
- [x] **Fase 6** — email de confirmação (`src/lib/email.ts`)
- [x] **Fase 7** — lembretes (`src/lib/lembretes.ts`)
- [x] **Fase 8** — presenças em lotes (`src/lib/presencas.ts`)
- [x] **Fase 9** — limpeza dos links (`src/lib/limpeza.ts`)
- [ ] Fase 10 — ensaio de ponta a ponta (precisa da sala Zoom real — ver nota abaixo)

## Fase 1 — cliente da API e testes de aceitação

```bash
npm install
cp .env.example .env   # preencher SALA_API_KEY com a chave real (não versionar)
npm run test:fase1
```

`SALA_API_KEY` nunca deve ir para o repositório, para logs, nem para o bundle
do browser (sem prefixo `NEXT_PUBLIC_`). Em produção, define-a como variável
de ambiente do servidor na plataforma de deployment.

## Fase 2 — base de dados

`migrations/001_base_schema.sql` cria uma base mínima de `webinars` e
`registrations` — este repositório partia vazio, sem sistema de webinars
prévio. Se já tiveres essas tabelas noutro sítio com um esquema diferente,
ignora essa primeira migration e aplica só `002_sala_zoom.sql` (as colunas da
secção 6 do guia) à tua base real.

```bash
cp .env.example .env   # preencher também DATABASE_URL
npm run migrar
```

O runner (`scripts/migrar.ts`) aplica cada ficheiro de `migrations/` dentro de
uma transação e regista o que já correu em `schema_migrations`, por isso é
seguro correr repetidamente.

`003_ciclo_de_vida.sql` acrescenta `duracao_minutos` e `cancelada_em` a
`webinars` (e `cancelada_em` a `registrations`) — campos de ciclo de vida que
a secção 6 do guia não cobre porque assume um sistema já existente.

## Fases 3-9 — os quatro processos (secção 7) e agendamento (secção 9)

| Processo | Ficheiro | Script | Cadência sugerida |
|---|---|---|---|
| Sincronizar sessões | `src/lib/sessoes.ts` | `npm run sincronizar-sessoes` | de hora a hora |
| Formulário (grava e enfileira) | `src/lib/inscricoes.ts` | — chamado pela tua rota/handler | a cada pedido |
| Fila dos links | `src/lib/fila-links.ts` | `npm run processar-fila` | 5 em 5 min |
| Lembretes | `src/lib/lembretes.ts` | `npm run processar-lembretes` | 15-30 em 15-30 min |
| Presenças | `src/lib/presencas.ts` | `npm run processar-presencas` | 15 em 15 min |
| Limpeza dos links | `src/lib/limpeza.ts` | `npm run limpar-links` | diária |

`src/lib/email.ts` define a interface `EmailSender` e a regra da secção 10
("nunca enviar a confirmação antes de ter o `link_pessoal`"): sem link, a
função não envia nada, nem repete o envio a quem já recebeu. A implementação
por omissão (`ConsoleEmailSender`) só regista no log — o guia não prescreve
uma ferramenta de email, por isso troca-a por um `EmailSender` real (Brevo,
ActiveCampaign, Resend, ...) antes de produção.

Estes scripts correm como processos autónomos (cron/GitHub Actions a chamar
`npm run ...`), não como endpoints HTTP — por isso não precisam do
`CRON_SECRET` que a secção 9 do guia recomenda. Se mais tarde os expuseres
via rota HTTP (ex.: Vercel Cron a chamar uma API route), protege-os com esse
segredo nessa altura.

### Como isto foi validado

Sem rede para a sala Zoom real (este ambiente não a alcança), a validação
usou um servidor que implementa o contrato da secção 4 (sessões, inscrições
idempotentes, presenças em lote com omissão de quem não foi inscrito) mais
um Postgres local, e exercitou de facto: sincronização e deteção de
cancelamento, os erros 400/401/404/503 na fila, o recuo crescente, a
idempotência do link (teste 7), a regra da secção 10, presenças em lote com
proteção de correções manuais, e a limpeza dos links. Não substitui a Fase
10 (ensaio com a sala real).
