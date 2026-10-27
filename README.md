# webinar

Sistema de webinars, integrado com a sala partilhada de Zoom "Vão Quadrado"
(ver `GUIA-ZOOM-VAO-QUADRADO.md`, entregue à parte — não versionado por conter
uma credencial viva).

Publicado no Vercel, a partir deste branch (`claude/replica-para-mim-7xg00l`), com
base de dados Postgres (Neon) ligada.

## Estado

### Assistente da equipa na nova área

Em **A minha organização → Assistente da equipa**, a conta de teste pode perguntar
sobre vendas de viagens, contactos, acompanhamento, organização e liderança.
A pesquisa usa os resumos de `formacoes_conhecimento`, os fragmentos de documentos
publicados e as orientações de objeções. A resposta inclui orientação curta, até
quatro passos, um exemplo quando útil e as fontes usadas, com ligações obtidas
dos registos existentes. Os links de documentos mantêm a assinatura habitual.
Não devolve transcrições nem o contexto interno completo e não pesquisa a Internet.
Quando a base não sustenta uma resposta, pede mais contexto ou confirmação.

A conversa permite perguntas seguintes, copiar respostas e começar de novo.
Permanece em memória ao navegar entre secções e termina ao atualizar ou sair.
Não há histórico de conversas na base de dados; apenas um contador de até 20 pedidos
por dez minutos em `dashboard_config`, separado de Reservas. Não há migração.
O painel e `/api/consultor/nova-area/assistente` mantêm acesso exclusivo à conta de
teste, através do email de demonstração já definido. Testes:
`node --import tsx scripts/testes-assistente-equipa.ts`.

No primeiro contacto após o webinar/apresentação, a orientação explícita da equipa
tem prioridade: a resposta é apenas **“O que gostaste mais?”**, sem perguntas ou
passos adicionais. Os casos reconhecidos usam a resposta fixa antes da pesquisa/IA;
as instruções do modelo também preservam a regra. As objeções já expressas pela
lead continuam a seguir o fluxo de resposta com conhecimento e fontes.

### Frase diária no Início da nova área

O Início de `/consultor/nova-area` inclui 60 reflexões originais sobre relações,
competências, acompanhamento e liderança, inspiradas em Eric Worre, Sandro Cazzato,
Daniel G, Jim Rohn e Ray Higdon, com ligação à referência consultada. Não são citações.
A frase muda por dia de calendário em `Europe/Lisbon`, mesmo com a página aberta,
e é igual em todos os dispositivos nesse dia. A coleção repete após 60 dias.
Os textos e as referências estão em `src/lib/frase-do-dia.ts`; não há geração por IA
em cada visita nem gravação de dados. Mantém-se o acesso exclusivo à conta de teste,
através da restrição já existente da nova área.

### Notícia diária de turismo na nova área

O Início inclui também **Notícia do dia**, com título, fonte, data de publicação
e ligação para o original, recolhidos nos feeds RSS públicos da Turisver,
Ambitur e TNews, com as APIs públicas como alternativa.
O primeiro acesso de cada dia de Lisboa escolhe a notícia mais recente disponível
e mantém o destaque em cache nesse dia, sem IA nem alterações à base de dados.
Se uma fonte falhar, usa as restantes; se nenhuma devolver notícias dos últimos 7 dias,
mostra indisponibilidade e permite tentar novamente. Notícias de dias anteriores
mantêm a data real e a indicação de última notícia disponível.
O cartão atualiza quando o dia muda ou se regressa à página. O cartão e a API
`/api/consultor/nova-area/noticia-turismo` mantêm a restrição à conta de teste.
Testes: `node --import tsx scripts/testes-noticia-turismo.ts`.

Os destaques diários ficam em dois cartões compactos lado a lado no computador:
frase à esquerda e notícia à direita, com fotografia do feed e ligação à fonte.
Em ecrãs estreitos passam a coluna. As imagens são carregadas diretamente da
publicação ou do seu CDN WordPress; imagens ausentes ou com erro recebem
um símbolo discreto. A cache v2 inclui a imagem sem reutilizar destaques antigos
que ainda não tinham esse campo.

### Gestão de formações gravadas

Em `/admin/formacoes-gravadas`, o admin adiciona título e link (YouTube ou
outra plataforma), escolhe categoria, origem, curso e módulo e indica a data.
Duração e formador são opcionais. Pode editar, ocultar/publicar e remover as
gravações adicionadas. O aviso à equipa continua disponível por um link nesta página.

Os registos são guardados individualmente em `dashboard_config`, sem migração,
e acrescentados à biblioteca existente nas duas áreas do consultor. A pesquisa,
as aulas mais recentes, as contagens e a marcação como vista incluem as novas
gravações. O ID de cada aula mantém-se ao editar o título ou link, preservando
o progresso privado por consultor. Testes: `node --import tsx scripts/testes-formacoes-gravadas-admin.ts`.

Na primeira publicação de uma nova gravação (incluindo uma que estava oculta),
é criado um aviso push por consultor ativo com painel e subscrição de notificações.
A gravação e os avisos são guardados na mesma operação. O envio começa ao publicar;
o cron `/api/cron/formacoes-gravadas` retoma pendências de cinco em cinco minutos.
Editar ou republicar a mesma gravação não repete o aviso. Os avisos usam uma etiqueta
por gravação para agrupar novas tentativas no dispositivo. Não são enviados emails.
Testes com tabelas temporárias: `node --import tsx scripts/testes-formacoes-gravadas-push.ts` (requer `DATABASE_URL`).

### Importação de propostas MyOffice nos templates

Reservas abre em **Criar com orçamento**: PDF → confirmação dos dados e hotel →
formato/referência → template preenchido. Permite carregar uma referência própria
no passo 2, pré-visualizar e trocar a imagem, seguindo o desenho com os dados do PDF.
Em alternativa, inclui os estilos Elegante e Fotográfico,
em Story e Feed, fotografia automática do destino ou própria e texto para copiar.
O resultado permite editar o desenho, guardar e descarregar o PNG. As restantes
opções do orçamento continuam no assistente. O editor de referências mantém-se
num separador próprio. O acesso continua exclusivo à nova área da conta de teste.

O importador envia o PDF completo para análise, incluindo páginas em imagem.
Os PDFs iCliGo podem ter apenas contactos e rodapés como texto selecionável;
esse texto não substitui a leitura visual da proposta. Mantêm-se os limites
de 4 MB e 30 páginas e o acesso exclusivo à nova área da conta de teste.
Os testes de Reservas cobrem PDFs com texto, imagens e conteúdo misto.

A reconstrução das referências de Reservas mede a composição com uma grelha
auxiliar e distingue a arte de interfaces à volta da imagem. O editor suporta
Montserrat e Bebas Neue locais (licenças em `public/fonts`), sombras, alinhamento
vertical, formas com degradé e ícones vetoriais. Os exemplos da referência só
aparecem na pré-visualização; o PNG utiliza os dados da viagem. Rótulos antes e
depois de um valor acompanham o respetivo campo dinâmico.

Nos modelos existentes, usar **Reanalisar referência** e comparar com o original
antes de guardar. A reanálise preserva as fotografias carregadas e os dados;
quando o novo desenho suporta menos hotéis, as opções anteriores ficam
disponíveis para seleção. Fotografias com textos sobrepostos podem precisar da
foto original para não repetir dados da promoção anterior. A funcionalidade
continua limitada à conta de teste.
As análises dispõem de 150 segundos por pedido ao serviço; a rota permite
180 segundos para incluir a preparação das imagens e a validação.
O esquema da análise pede apenas as propriedades relevantes de cada tipo de
elemento, para reduzir respostas cortadas pelo limite de saída do serviço.

### Calculadoras na nova área

Em **Objetivos → Calculadoras**, a conta de teste pode simular a comissão bruta
e os pontos de uma venda. Faturação, margem de lucro e percentagem da comissão
são editáveis; a margem começa em 12% e a comissão em 30%.
Os resultados atualizam-se automaticamente, com duas casas decimais e sem histórico.
Os pontos dependem apenas da faturação e da margem: 1.000 € a 12% dão 0,60 pontos.
Testes dos cálculos: `node node_modules/tsx/dist/cli.mjs scripts/testes-calculadora-venda.ts`.

A calculadora **Quanto preciso para atingir a minha comissão?** reparte um objetivo
de comissão bruta entre vendas próprias e TPs, com percentagens que somam 100%.
Cada TP gera 80 € de bónus e 1 ponto, valorizado pelo patamar selecionado.
Os TPs sobem ao inteiro seguinte e a faturação ao cêntimo seguinte; o total previsto
mostra o efeito destes arredondamentos. Começa com 500 €, 10% em TPs e 90% em vendas.
Testes: `node node_modules/tsx/dist/cli.mjs scripts/testes-calculadora-objetivo.ts`.

### Pastas nos Documentos

Os Documentos abrem numa biblioteca por pastas na área atual (`/consultor/documentos`)
para todos os consultores da equipa e na nova área da conta de teste.
A pasta **Be a Leader 26** reúne os 19 PDFs Be a Leader Madrid 2026. Há pesquisa
em todas as pastas ou dentro de uma pasta; os links de download mantêm a assinatura.
Em `/admin/documentos`, é possível criar pastas, escolhê-las ao enviar ficheiros
e mover documentos existentes. Pastas vazias ou com apenas documentos ocultos
não aparecem ao consultor. Ambas as versões usam os mesmos documentos e pastas.

A migração `049_documentos_pastas.sql` acrescenta apenas a organização: mantém
categorias, bytes e conhecimento. A migração `051_documentos_pasta_be_a_leader.sql`
corrige o nome da pasta, preservando o seu ID. Novas importações do mesmo congresso usam essa
pasta. Testes com tabelas temporárias: `node --import tsx scripts/testes-documentos-pastas.ts`.

### Testemunhos nas Formações e na nova área

Em **A minha organização → Testemunhos**, os 23 vídeos da playlist iCliGo e 30
testemunhos Instagram revistos aparecem juntos em cards compactos com título e duração.
A pesquisa combina palavras e temas e ignora acentos. Os vídeos YouTube abrem num
diálogo; os links Instagram abrem o Reel original numa nova aba.
A lista está em `src/lib/testemunhos.json`; para voltar a importar os títulos
públicos, executar `node scripts/importar-testemunhos.mjs` e publicar a alteração;
essa importação preserva os testemunhos Instagram. Para atualizar os testemunhos
Instagram a partir da recolha revista, executar `node scripts/importar-testemunhos-instagram.mjs`.
Na área atual, o cartão **Testemunhos** em `/consultor/formacoes` abre a mesma
biblioteca em `/consultor/formacoes/testemunhos` para os consultores com acesso
às Formações. A nova área e o seletor continuam limitados à conta de teste.

O mesmo catálogo alimenta as sugestões na resolução de objeções já disponível
para a equipa. A seleção usa o contexto e os limites dos testemunhos Instagram,
incluindo o da Ludmila; os botões de abrir e copiar respeitam a plataforma original.
Os seis excertos formativos mantêm-se apenas na base de conhecimento de objeções.
Testes: `node --import tsx scripts/testes-testemunhos.ts`.

### Página inicial da nova área

`/consultor/nova-area` abre em **Início**, com os questionários pendentes
destinados à conta (os três do evento e os questionários da equipa abertos).
Reutiliza as regras de inscrição e de resposta existentes; a conta de demonstração
continua a ver os exemplos. Há também um espaço reservado para futuros comunicados.
**Começa aqui** usa agora o onboarding aprovado a partir da checklist do mentor:
cinco cartões, sete checks, com curso e duas sessões Welcome Aboard separados.
O texto orienta a ação e manda marcar e realizar as reuniões com o upline.
O separador temporário “onboarding codex” foi retirado. Começa aqui permanece
acessível no menu para rever ou desmarcar tarefas; o Início e o resumo acompanham
o mesmo progresso. Os checks são guardados por conta em `dashboard_config`
(chave v2), com atualização de uma tarefa de cada vez para preservar alterações
de outros dispositivos. As marcas da proposta no navegador são importadas uma
vez, sem substituir progresso já guardado. Do progresso v1 só curso e sessões
são equivalentes; os registos antigos são preservados. A API exige a versão 2
para impedir que uma aba antiga grave os números anteriores nos novos checks.
As alterações continuam limitadas à conta de teste. Testes com dados temporários:
`node --import tsx scripts/testes-inicio-consultor.ts` (requer `DATABASE_URL`).

Em **A minha organização → Tenho um novo TP, e agora?**, os checks de “Começa
aqui” do TP direto confirmam automaticamente as tarefas correspondentes do
mentor. O detalhe mostra os sete indicadores e distingue confirmações do TP,
presenças Welcome Aboard e marcas manuais do mentor. Desmarcar no TP retira
apenas a confirmação automática. A página atualiza a cada dez segundos enquanto
visível e substitui a antiga secção “Tarefas iniciais da equipa”, sem prazo que
apague acompanhamentos. Continua exclusiva da conta de teste. Testes:
`node --import tsx scripts/testes-mentor-checklist.ts`; detalhes em
`docs/mentor-checklist.md`.

### Formações do fórum iCliGo na nova área

O calendário de `/consultor/nova-area` importa as formações online de todas as línguas do fórum. Mantém as bandeiras da origem e converte as horas para Portugal. A importação fica limitada à conta definida em `src/lib/demo.ts`; as formações manuais e a área atual continuam independentes.

A sincronização corre de hora a hora e também ao consultar um mês cuja importação tenha mais de uma hora. Se o fórum falhar ou a sessão expirar, mantém a última importação e mostra um aviso. A administração tem um botão **Atualizar agora** em `/admin/formacoes-externas`.

Para ligar ou renovar a sessão, abre o fórum num perfil dedicado do Chrome com `--remote-debugging-port=9341`, faz login e executa `node --import tsx scripts/ligar-forum-icligo.ts`. Requer `DATABASE_URL` no ambiente ou no `.env`. A sessão fica na base de dados; não deve ser copiada para o repositório. Testes: `node --import tsx scripts/testes-forum-icligo.ts`.

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
| `/consultor` | painel do consultor — link de inscrição, aberturas, inscrições e presenças |
| `/[codigo]` | link curto de um consultor (ex: `/joao-silva`) — redireciona para a inscrição |
| `/api/cron/*` | endpoints para o Vercel Cron / GitHub Actions |
| `/api/webinars` | JSON público (sessões futuras), com CORS — para o widget |
| `/api/inscricoes` | também aceita pedidos de outro domínio (CORS) — para o widget |

```bash
npm run dev   # http://localhost:3000
npm run build && npm run start   # produção
```

O formulário de inscrição (página e widget) exige um checkbox de aceitação
da política de privacidade antes de deixar submeter — `required`, tanto no
browser como no servidor (`inscrever()` recusa sem isso, com
`DadosInvalidos`). O momento exato fica gravado em
`consentimento_privacidade_em` (migration `010`).

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
escreve o **email registado na equipa** e recebe um link de inscrição
curto: `/joao-silva` em vez de `/webinar/<uuid>?ref=...&refEmail=...`. O
email é validado contra os contactos da Brevo (`GET /v3/contacts/{email}`)
— se não existir lá, mostra erro e não gera nada. O link também é enviado
por email ao consultor (mesmo endpoint de envio da secção anterior).

O código curto (a "referencia", gerada do nome — ex: "João Silva" →
`joao-silva`) fica gravado em `links_consultor` (migration `009`), a
apontar para o email do consultor. `app/[codigo]/page.tsx` resolve esse
código e redireciona para `/webinar/<id-da-sessão-mais-próxima>?ref=...&
refEmail=...` — o resto do fluxo (formulário, tracking de cliques,
notificação ao consultor) não muda, só o link que se partilha é mais
curto. Pedir o link outra vez com o mesmo nome atualiza a mesma linha
(upsert); nomes que gerassem um código igual a uma rota existente
(`admin`, `consultor`, `webinar`, `api`) levam um sufixo automático.

`links_consultor` também guarda o primeiro nome do consultor (migration
`011`), para o cartão de inscrição mostrar "Convite de &lt;nome&gt;" no
topo — em `/webinar/[id]` via consulta direta à base (a página já lê
`ref` dos `searchParams`); no widget do Elementor via
`GET /api/consultor/nome?ref=...`, o único endpoint que devolve esse
nome (nunca o email) para quem não tem acesso direto à base de dados.

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

A mesma página `/consultor` mostra também um painel com os números da
próxima sessão (`src/lib/consultor.ts`): quantas vezes o link foi aberto,
quantos se inscreveram pelo link do consultor (`referencia_email`), quantos
estiveram presentes e a percentagem de comparência. As aberturas vêm de
`cliques_link` (migration `008`) — a página `/webinar/[id]` e o widget do
Elementor registam um clique (`POST /api/consultor/clique`, sem
autenticação, com CORS) sempre que a página é aberta com `refEmail` na
URL, antes de a pessoa chegar a inscrever-se. As presenças só ficam
corretas depois de a sessão acontecer e o processo de presenças correr;
antes disso contam como "não entraram".

A coluna "Abriu o link do Zoom" reflete um clique real, não a presença: os
emails de confirmação/lembrete (`src/lib/email.ts`) já não mandam o link do
Zoom cru, mandam `/api/entrar/<id>` (`app/api/entrar/[id]/route.ts`), que
regista `registrations.link_zoom_clicado_em` (migration `013`, só na
primeira vez) e só depois redireciona a sério para o `link_pessoal`. O
`link_pessoal` continua a nunca sair daí para lado nenhum. `SITE_BASE_URL`
(`.env`) define o domínio usado nesse link; sem a variável, usa o domínio
principal atual.

No "Painel de leads" há também um botão **"Copiar link do Zoom"** por
lead, para o consultor reenviar diretamente (ex: WhatsApp) a quem não viu
o email de confirmação. É uma exceção deliberada e pedida à regra de nunca
expor `link_pessoal` — só existe aqui, só para os leads desse próprio
consultor (`referencia_email`), nunca em `/admin` nem em exportações; o
link nunca passa pelo servidor de novo, só é copiado no browser do
consultor a partir da resposta de `/api/consultor/estatisticas`.

### Painel de administração

Em **Consultores** (`/admin/consultores`), o formulário **Adicionar consultor**
permite registar nome e email para dar acesso imediato a `/consultor`. O email
é normalizado e validado; se já existir na equipa, o formulário informa sem
alterar nome, hierarquia ou outros dados. O registo usa `equipa_afiliados`,
a mesma tabela consultada pelas áreas dos consultores, e fica disponível
mesmo sem importar um CSV. O link pessoal é criado quando a pessoa entra.
O formulário não envia emails. A lista abaixo continua a mostrar quem já
entrou na plataforma. A gravação exige a autenticação de administrador.

Ao criar ou editar uma formação interna em `/admin/formacoes/nova`, o campo
**Quem pode ver esta formação?** permite escolher toda a equipa ou apenas
pessoas selecionadas. A lista inclui consultores que já têm painel, com pesquisa
por nome (com ou sem acentos), email ou telemóvel guardado nas inscrições de
webinars/eventos. As escolhas são conservadas ao mudar a pesquisa e podem ser removidas.
Formações restritas só aparecem às pessoas escolhidas no painel e no calendário;
a mesma seleção é aplicada aos avisos, lembretes e links de entrada. As formações
existentes mantêm a visibilidade anterior (migration `048`). O modo Equipa + leads
continua público e não permite seleção individual.

Verificação das restrições, com tabelas temporárias e sem envios:
`node --import tsx scripts/testes-formacoes-destinatarios.ts` (requer `DATABASE_URL`).

Protegido por Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD` em `.env`), via
`proxy.ts`. **Sem `ADMIN_PASSWORD` definida, o painel fica inacessível** —
falha fechado, não há password por omissão. O `link_pessoal` nunca é lido
nem mostrado em nenhuma página de admin (secção 6 do guia) — as consultas em
`src/lib/admin.ts` nem sequer selecionam essa coluna.

### Cron em produção

O desafio **Objetivos → Core Rank** está na nova área, apenas na conta de teste
definida em `src/lib/demo.ts`. Mantém as tarefas da referência da Sara, com as
cores da equipa, e cobre 11 de outubro a 31 de dezembro de 2026, por mês. O
objetivo próprio de 3 novos TPs e 3.000 € de reservas confirmadas acumula até
dezembro. Os 82 dias têm focos diferentes.

O registo aceita o próprio dia e o dia anterior, na hora de Lisboa, através
de **Guardar o meu dia**. Cada data pode ser preenchida até ao fim do dia
seguinte, incluindo 31 de dezembro até 1 de janeiro. O botão **Preencher ontem**
abre a data anterior quando ainda não foi guardada. Os rascunhos ficam separados
por data. Depois de guardado fica imutável. As tarefas semanais são fechadas
uma vez por semana, no dia escolhido; campos vazios continuam sem informação.
O balanço recebe quantidades correspondentes das tarefas e admite ajustes
antes de guardar para evitar duplicações. O histórico permite consultar dias,
resumos por semana/mês e exportar PDF/Excel, incluindo os relatórios.

Por autorização do utilizador, a conta de teste pode guardar também o dia
10 de outubro de 2026, apenas nesse próprio dia. O registo fica identificado
como teste no histórico/exportações e excluído do objetivo, da classificação,
dos relatórios automáticos e do bloqueio das tarefas semanais do desafio.

`/api/cron/core-rank` analisa a semana anterior com a integração de IA já usada
na plataforma (`ANTHROPIC_API_KEY`), a partir de terça-feira, depois da tolerância
de domingo. A última semana fecha após a tolerância de 31 de dezembro. A execução
diária às 08:00 UTC recupera falhas, sem duplicar relatórios; exige `CRON_SECRET`.
Os relatórios ficam na conta do consultor, com aviso no Início da nova área.
Dias sem informação e tarefas não aplicáveis não são tratados como falhas.
O Top 10 de atividade é exclusivo do admin em `/admin/core-rank`, com filtros
semanais, mensais e do desafio, protegido pelo Basic Auth existente.

Verificação do calendário, validação, balanço, classificação e exportações:
`node node_modules/tsx/dist/cli.mjs scripts/testes-core-rank.ts`.

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
