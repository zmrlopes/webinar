# webinar

Sistema de webinars, integrado com a sala partilhada de Zoom "Vão Quadrado"
(ver `GUIA-ZOOM-VAO-QUADRADO.md`, entregue à parte — não versionado por conter
uma credencial viva).

Publicado no Vercel, a partir deste branch (`claude/replica-para-mim-7xg00l`), com
base de dados Postgres (Neon) ligada.

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

Além do guia: envio real de emails (Brevo), widget para outro site
(Elementor/WordPress), e página de códigos de referência para consultores.

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
função não envia nada, nem repete o envio a quem já recebeu.

`criarEmailSender()` escolhe sozinho entre duas implementações: com
`BREVO_API_KEY` definida, envia a sério pela API transacional da Brevo
(`BrevoEmailSender`); sem ela, usa o `ConsoleEmailSender`, que só regista no
log — seguro para desenvolvimento, sem custos nem risco de mandar email a
ninguém. `BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME` escolhem o remetente (por
omissão, `geral@viajareviver.net` / "Viajar é Viver" — tem de ser um
remetente já verificado na conta Brevo).

Cada processo tem duas formas de correr: como script standalone (`npm run
...`, útil em GitHub Actions ou localmente) e como rota HTTP em
`app/api/cron/*` (para o Vercel Cron), ambas a chamar exatamente a mesma
função de `src/lib/`. As rotas HTTP estão protegidas por `CRON_SECRET` — ver
secção seguinte.

## A aplicação web

Além dos processos de fundo, o projeto inclui a aplicação Next.js completa:

| Onde | O quê |
|---|---|
| `/` | lista de sessões futuras |
| `/webinar/[id]` | página de inscrição pública (chama `POST /api/inscricoes`) |
| `/admin` | painel — sessões, contagens de links e presenças |
| `/admin/webinar/[id]` | inscritos de uma sessão, com correção manual de presença |
| `/consultor` | gera um link de inscrição com `?ref=` por consultor |
| `/api/cron/*` | endpoints para o Vercel Cron / GitHub Actions |
| `/api/webinars` | JSON público (sessões futuras), com CORS — para o widget |
| `/api/inscricoes` | também aceita pedidos de outro domínio (CORS) — para o widget |

```bash
npm run dev   # http://localhost:3000
npm run build && npm run start   # produção
```

### Widget para outro site (Elementor/WordPress)

`widgets/elementor-inscricao.html` é um snippet autónomo (HTML+CSS+JS
inline, sem dependências) para colar num widget "HTML" do Elementor, ou
qualquer outro sítio que aceite HTML bruto. Mostra sempre a sessão futura
mais próxima (via `GET /api/webinars`) e inscreve através de `POST
/api/inscricoes` — os dois únicos endpoints com CORS aberto; `/admin` e
`/api/cron/*` continuam fechados ao domínio da aplicação.

Antes de colar, troca a constante `APP_URL` no topo do `<script>` pelo
domínio real onde publicaste a aplicação (ex: a tua app na Vercel).
Validado com um teste cross-origin a sério (servidor num porto, widget
noutro, sem nada partilhado) — o pedido atravessa mesmo o CORS, não é só
teoria.

### Códigos de referência para consultores

`/consultor` é uma página pública (sem password) onde cada consultor
escreve o **email registado na equipa** e recebe o link de inscrição da
sessão mais próxima, com `?ref=codigo-gerado-do-nome` (ex: "João Silva" →
`joao-silva`). O email é validado contra os contactos da Brevo
(`GET /v3/contacts/{email}`) — se não existir lá, mostra erro e não gera
nada. O link também é enviado por email ao consultor (mesmo endpoint de
envio da secção anterior).

O `ref` é capturado tanto pela página `/webinar/[id]` como pelo widget do
Elementor (via `location.search`), e gravado na inscrição (`referencia`,
migration `005`). O painel `/admin/webinar/[id]` mostra essa referência por
inscrito e um resumo com o total por consultor.

Cada inscrição bem sucedida (depois de obter o link do Zoom) sincroniza
também um contacto na Brevo — `src/lib/brevo-contatos.ts`,
`sincronizarContactoInscrito()` — upsert por email, na lista
`BREVO_LISTA_INSCRITOS_ID`, com `NOME`, `SMS` (telemóvel) e `CONSULTOR`
(a referência). Corre depois de `marcarObtido`, com o próprio try/catch —
uma falha aqui não pode reabrir uma inscrição já bem sucedida.

O link gerado em `/consultor` leva também `&refEmail=` (o email do
consultor, não só o código legível) — é o que permite, no mesmo momento em
que o link do Zoom é obtido, notificar esse consultor por email com os
dados que o lead deixou no formulário (`notificarConsultorSobreLead()` em
`src/lib/email.ts`). Sem `refEmail` na inscrição (alguém que se inscreveu
sem vir de um link de consultor), não há notificação — não há para quem.

### Painel de administração

Protegido por Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD` em `.env`), via
`proxy.ts`. **Sem `ADMIN_PASSWORD` definida, o painel fica inacessível** —
falha fechado, não há password por omissão. O `link_pessoal` nunca é lido
nem mostrado em nenhuma página de admin (secção 6 do guia) — as consultas em
`src/lib/admin.ts` nem sequer selecionam essa coluna.

### Cron em produção

`vercel.json` define os cinco crons nas cadências da secção 9 — mas o
**Vercel Hobby só permite cron diário**, tal como o guia descreve para o
próprio anfitrião. `.github/workflows/cron.yml` é a alternativa pronta a
usar (precisa dos secrets `APP_URL` e `CRON_SECRET` no repositório GitHub);
o guia avisa que o GitHub Actions não é pontual (atrasos entre ~48 min e
~2h31), e os processos foram desenhados a contar com isso.

Sem `CRON_SECRET` definida, os endpoints `/api/cron/*` devolvem `500` a
qualquer pedido — também falham fechado.

### Como isto foi validado

Sem rede para a sala Zoom real (este ambiente não a alcança), a validação
usou um servidor que implementa o contrato da secção 4 (sessões, inscrições
idempotentes, presenças em lote com omissão de quem não foi inscrito) mais
um Postgres local, e exercitou de facto: sincronização e deteção de
cancelamento, os erros 400/401/404/503 na fila, o recuo crescente, a
idempotência do link (teste 7), a regra da secção 10, presenças em lote com
proteção de correções manuais, e a limpeza dos links.

A aplicação web foi validada da mesma forma, mas a correr mesmo (`next
dev`/`next build`, não só leitura de código): inscrição real pelo browser
(Playwright) do princípio ao fim, painel de admin com Basic Auth a bloquear
sem password e a aceitar com a password certa, correção manual de presença a
gravar na base, `/api/cron/*` a exigir o `CRON_SECRET`, e confirmação
explícita (por grep ao HTML devolvido) de que o `link_pessoal` nunca aparece
em nenhuma página do painel. `npm run build` corre sem erros.

Isto não substitui a Fase 10 (ensaio com a sala Zoom real e pessoas a
entrar de verdade) — essa só a sessão real do dia 20/23 de agosto permite.
