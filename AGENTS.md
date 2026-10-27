<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Alterações na área de consultor

Por indicação do utilizador, a nova área inclui “Assistente da equipa” em
A minha organização, no painel da direita. Pesquisa os resumos das formações,
os documentos publicados e as orientações da equipa para dar uma resposta curta,
passos práticos, exemplo e fontes. As ligações são resolvidas pelo servidor apenas
para fontes existentes; sem base suficiente, indica-o. A conversa só permanece
durante a visita, incluindo ao mudar de secção, e não é guardada no servidor.
O acesso ao painel e à API é exclusivo da conta de teste; há um limite de pedidos
separado das outras ferramentas de IA. Não envia mensagens nem altera leads.

Por indicação do utilizador, no primeiro contacto com uma lead que acabou de
assistir ao webinar ou de ver a apresentação, o Assistente da equipa responde
apenas “O que gostaste mais?”. Não acrescenta perguntas, passos, pedidos de decisão
nem mensagens alternativas. Esta orientação tem prioridade sobre respostas genéricas
das fontes e mantém-se ao reformular a mesma situação. Uma objeção já expressa
pela lead é uma situação distinta. A alteração continua exclusiva da conta de teste.

Por indicação do utilizador, o Início da nova área inclui uma frase diária sobre
o modelo de negócio, com reflexões originais inspiradas em referências de network
marketing e ligação à fonte. A rotação segue o dia em `Europe/Lisbon`, com os
textos em `src/lib/frase-do-dia.ts`. Continua exclusiva da nova área da conta de teste.

Por indicação do utilizador, o Início da nova área inclui também uma notícia diária
de turismo, recolhida nos feeds públicos da Turisver, Ambitur e TNews (com API
alternativa), com título, fonte,
data real e ligação para o original. O destaque é guardado em cache por dia de Lisboa;
sem notícias do dia, identifica a última disponível (até 7 dias). Falhas permitem
nova tentativa. O cartão e a API continuam exclusivos da nova área da conta de teste.

Por indicação do utilizador, a frase diária é compacta e fica à esquerda da notícia
na mesma linha no computador. A notícia usa a fotografia publicada no feed quando
disponível, com alternativa visual se não carregar. Em ecrãs estreitos, os cartões
ficam em coluna. Este ajuste continua exclusivo da nova área da conta de teste.

As novas alterações de visual e organização devem ficar visíveis apenas na
conta de teste `zmrlopes@gmail.com`. Publicar estas alterações para todos os
consultores requer uma instrução explícita do utilizador. Reutilizar o email
definido em `src/lib/demo.ts` para limitar a visibilidade à conta de teste.

A nova área está em `/consultor/nova-area`; a área atual permanece em
`/consultor` para comparação. As próximas mudanças do novo visual devem ser
feitas na nova área, sem alterar a versão que os consultores veem. O seletor
entre as duas versões só aparece na conta de teste.

Na nova área, as secções (incluindo Leads) abrem no painel da direita,
mantendo o menu lateral. O link pessoal de partilha aparece no topo das
Leads. A página original de Leads continua disponível na área atual.
O botão Calendário fica entre Primeiros passos e A minha organização e
abre uma vista mensal dos acontecimentos da plataforma no painel direito.

Manter as cores da marca existente (branco, preto e verde-oliva `#4b5320`),
mesmo quando a organização se inspira numa referência com outras cores.
Por indicação do utilizador, os cards das próximas formações iCliGo
mantêm o destaque laranja da área atual (fundo, contorno, etiqueta e botão).
Os avisos importantes da página Início mantêm o destaque dourado da área
atual, com fundo claro e contorno `#c9971c`, por indicação do utilizador.
No telemóvel, estes destaques usam linhas compactas clicáveis, com ícone,
título, descrição curta e seta, como na versão atual.
Por indicação do utilizador, o menu da nova área tem Início, Começa aqui e
Calendário fora de separadores, seguidos de A minha organização, Reservas
(Propostas, Travel planner, Criar templates, Calendário criativo), Objetivos e
Formação e eventos; o onboarding temporário fica no fim.
Os grupos do menu começam recolhidos no computador e no telemóvel; clicar
no nome do separador mostra ou esconde as opções desse grupo.
Na nova área, os Documentos são organizados em pastas. Os PDFs Be a Leader
Madrid 2026 ficam em “Be a Leader 26”. As pastas são criadas e escolhidas no admin;
Por indicação explícita do utilizador, a organização por pastas também aparece
em `/consultor/documentos`, na área atual, para todos os consultores da equipa.
Esta autorização é específica dos Documentos; o restante novo visual continua
limitado à nova área da conta de teste.

Por indicação explícita do utilizador, o desafio Core Rank está publicado
para todos os consultores na área atual em `/consultor/core-rank`.
Reutiliza o mesmo componente e os mesmos registos da nova área, com histórico
e relatórios privados por consultor. Esta autorização abrange apenas o Core
Rank; `/consultor/nova-area` e o seletor continuam exclusivos da conta de teste.

Por indicação explícita do utilizador, a separação do Core Rank em “Gravar”
(progresso editável) e “Fechar o dia” está publicada para todos os consultores,
incluindo as ações da API. Os dias já fechados, incluindo os registos antigos,
mantêm-se bloqueados para alterações. Esta autorização abrange apenas o Core
Rank; a nova área e o seletor continuam exclusivos da conta de teste.

Por indicação explícita do utilizador, Reservas → Criar templates fica
publicado apenas na nova área da conta de teste. Cada consultor poderá
carregar referências próprias para stories/feed; os textos e gráficos são
editáveis, mas o logótipo e nome iCliGo ficam protegidos. A importação de
propostas PDF, os modelos e o histórico seguem a mesma restrição na API.
Publicar Reservas para os restantes consultores requer nova instrução explícita.

Por indicação explícita do utilizador, Criar templates passa a abrir o fluxo
de referência completa → orçamento confirmado → publicação gerada por IA.
Cada referência e cada versão ficam privadas por consultor; os ajustes são
pedidos por texto e geram uma nova imagem. Não pedir uma base limpa nem
posicionar campos neste fluxo. O editor antigo continua em “Editor e materiais
anteriores”. A marca iCliGo é aplicada pelo servidor e permanece protegida.
Este fluxo e a respetiva API continuam exclusivos da conta de teste.

Por indicação explícita do utilizador, as publicações geradas incluem um
pequeno editor para selecionar textos, alterar os tipos/tamanhos de letra e
trocar a imagem de fundo. A preparação automática é feita na primeira abertura;
os ajustes seguintes são imediatos e gravam uma nova versão privada. Preservar
a publicação original, os dados confirmados e a marca iCliGo protegida. O editor
continua limitado à nova área da conta de teste, incluindo todas as ações da API.

Por indicação explícita do utilizador, este editor também permite corrigir o
conteúdo dos textos e apagá-los, com desfazer e restauro. As alterações manuais
ficam na versão da publicação, sem substituir os dados do orçamento importado.
Na geração, os talheres correspondem ao regime alimentar confirmado, nunca a
uma frase promocional. A marca mantém-se protegida e o acesso exclusivo de teste.

Por indicação explícita do utilizador, o logótipo dos templates pode ser branco
(ícone e letras) com fundo transparente e pode ser movido livremente dentro da
imagem. A proteção abrange o desenho da marca, não a sua posição. Referências
que já incluem o logótipo não recebem uma segunda marca automática. O editor
permite deslocar a marca sem deixar a cópia anterior; nas publicações antigas,
a preparação do fundo retira também o cartão/logótipo da sua posição original.
Esta alteração continua limitada à nova área e à API da conta de teste.

Por indicação explícita do utilizador, o logótipo branco a inserir quando
necessário é o ficheiro `docs/referencias-reservas/icligo branco.png`. A cópia
de publicação fica em `public/icligo-logo-branco.png`, sem redesenhar o ícone,
as letras, as proporções ou a transparência. Remover apenas as margens vazias
para o posicionar. Editores guardados devem atualizar o recurso de marca,
preservando os seus textos, posições, fundos e as publicações originais.

Por indicação explícita do utilizador, o separador Eventos da área atual e da
nova área mostra a todos os consultores inscritos no Teambuilding de 14 de
novembro um card para trocar o comprovativo de pagamento de cada inscrição
feita com o seu email (`/api/consultor/evento-comprovativo`). O novo ficheiro
substitui o anterior e o admin vê-o no mesmo sítio.

Por indicação explícita do utilizador, o card de entrada no grupo WhatsApp
Welcome Aboard também aparece nos Avisos da área atual (`/consultor`) para
os consultores da equipa, com o mesmo convite definido em
`LINK_GRUPO_WELCOME_ABOARD`. Esta autorização abrange apenas este card.

Por indicação explícita do utilizador, o convite Welcome Aboard da Ana Custódia
(`apensarnaproxima@gmail.com`) e de toda a sua descendência é
`https://chat.whatsapp.com/CDFcyL0eYXc0kVl8Fp7XMK`, com exceção da Marisa Araújo
(`marisa.araujo.icligo@gmail.com`) e de toda a sua descendência, cujo convite é
`https://chat.whatsapp.com/JBWy7ygb6CmJQHr8gpiT5m`. Resolver pela hierarquia atual
em `src/lib/welcome-aboard-grupo.ts`, incluindo automaticamente novos consultores,
na área atual e na nova área. As restantes equipas mantêm o convite existente.

Por indicação explícita do utilizador, o admin pode adicionar e gerir links
de formações gravadas em `/admin/formacoes-gravadas`. As gravações publicadas
integram a biblioteca existente em `/consultor/formacoes` para a equipa e a
mesma secção na nova área da conta de teste. As aulas antigas e o progresso
por consultor mantêm-se. Esta autorização abrange apenas as formações gravadas.

Por indicação explícita do utilizador, a primeira publicação de cada nova
formação gravada envia automaticamente uma notificação push aos consultores
ativos com painel e notificações ativadas. Editar, ocultar e voltar a publicar
a mesma gravação não repete o aviso. As falhas são retomadas pela fila automática.

Por indicação explícita do utilizador, Reservas → Travel planner fica publicado
apenas na nova área da conta de teste, com o mesmo acesso de Reservas
(`acessoReservas`). Parte de uma proposta (PDF de orçamento ou à mão), pergunta
o perfil da viagem e a IA propõe roteiro e dicas que o consultor edita; as
dicas de documentos, saúde e emergência têm de ser confirmadas antes do PDF.
Fases seguintes já pedidas: link web para o cliente (expira 30 dias após o
regresso) e imagens 9:16 (capa + 1 por dia + resumo).

Por indicação explícita do utilizador, cada consultor escolhe as cores dos
seus travel planners (principal, destaque e escura, com paletas sugeridas),
guardadas por consultor e aplicadas a todos os seus PDFs. É uma exceção à
regra das cores da marca, limitada aos documentos do travel planner; o
logótipo e o nome iCliGo mantêm-se protegidos e a área de consultor continua
com as cores da marca. O texto sobre cada cor ajusta-se para se ler bem.

Por indicação explícita do utilizador, Reservas → Propostas fica publicado
apenas na nova área da conta de teste (mesmo acesso de Reservas). Junta até 3
PDFs iCliGo da mesma viagem (um por hotel) numa proposta visual: voos, o que
está incluído, as opções com preço total e por pessoa, comparação com mapa,
destaques do destino, dicas (documentos e saúde a confirmar), validade e QR
para o WhatsApp do consultor. As fotografias dos hotéis vêm primeiro da
imagem do site oficial do hotel e, sem ela, de fotografias livres. Uma opção
escolhida pelo cliente pode dar origem a um travel planner.

Por indicação explícita do utilizador, nas Leads da área atual
(`/consultor/webinares`), cada sessão separa as leads em “Leads pessoais” e
“Leads equipa”, tal como em “Todas as sessões”, para todos os consultores.
A nova área usa o mesmo componente. Esta autorização abrange apenas esta separação.
Por indicação do utilizador, só nas Leads da nova área (conta de teste), os 4
cartões dão lugar a um funil (inscritas → assistiram → follow up → converteram)
da aba visível e, nas Leads pessoais, a um bloco “A precisar de ação”
(assistiram sem estado, follow up parado há mais de 7 dias, faltaram).

Na resolução de objeções das Leads, além das 2-3 respostas geradas a partir da
base de conhecimento, a IA sugere um testemunho da playlist iCliGo
(`src/lib/testemunhos.json`) para o follow-up, com uma frase de como o usar e
o link para enviar à lead. Por indicação explícita do utilizador, está
publicado para todos os consultores na área atual: a resolução de objeções é
um campo geral no topo das Leads (sem coluna por lead). Na nova área, o mesmo
campo é um separador próprio, “Resolução de objeções”, em A minha organização,
e não aparece nas Leads.

Por indicação explícita do utilizador, os testemunhos Instagram revistos juntam-se
aos vídeos YouTube em `src/lib/testemunhos.json`, com links originais, contexto e
limites para a sugestão de follow-up. Os botões de ver e copiar respeitam a plataforma.
A secção Testemunhos continua limitada à nova área da conta de teste; a resolução
de objeções da área atual reutiliza o mesmo catálogo para a equipa. Excertos
formativos permanecem no conhecimento de objeções, sem serem tratados como relatos pessoais.

Por indicação explícita do utilizador, a biblioteca de Testemunhos também fica
disponível na área atual para os consultores da equipa, através de um cartão em
`/consultor/formacoes` que abre `/consultor/formacoes/testemunhos`. Reutiliza os
mesmos vídeos, pesquisa e links da nova área e o acesso existente às Formações.
Esta autorização abrange apenas os Testemunhos; a restante nova área e o seletor
continuam exclusivos da conta de teste.

Por indicação do utilizador, a nova área tem um separador temporário
“onboarding codex”, refeito a partir da checklist do mentor em
`src/lib/mentor-checklist.ts`. Para o novo TP mostra apenas 5 passos curtos,
com um único check por passo: acessos e grupos; primeira reunião para objetivos
e primeira tarefa; curso Be a Travel Partner e duas sessões Welcome Aboard;
primeiras publicações e conversas; segunda reunião e próximos passos.
O curso continua obrigatório antes de orçamentos ou vendas. Os detalhes ficam
para o acompanhamento com o upline. Os checks são reversíveis e guardados
apenas no navegador, numa chave v2; as antigas marcas v1 são preservadas, sem
concluir automaticamente os novos passos. Não grava dados no servidor, é
exclusivo da conta de teste, e não altera os primeiros passos atuais nem envia
comunicações.

Por indicação do utilizador, o calendário criativo da Black Friday (PDF da Sara
`docs/calendario_criativo_160_conteudos_tropa_de_elite.pdf`, dados em
`src/lib/calendario-criativo.json`) mostra um tema por dia de 22/10 a 30/11; ao
clicar abre um popup com as 4 ideias (Reel, Carrossel, Fotografia, Post estático),
com copiar textos e “Já publiquei” guardado por consultor. Está em
`/consultor/calendario-criativo` (área atual) e em Reservas na nova área.
Por indicação explícita do utilizador, está publicado na área atual para todos os
consultores da equipa (destaque e botão no menu), com progresso privado por
consultor. Esta autorização abrange apenas o calendário criativo; a nova área e o
seletor continuam exclusivos da conta de teste.
No calendário criativo, as fases usam cores vivas por indicação do utilizador:
laranja iCliGo (`#f0603f`) em “Inspirar e crescer”, rosa (`#e6337a`) em “Aquecer
a audiência” e preto na Black Friday. É uma exceção limitada a este calendário.

Por indicação do utilizador, Criar templates não acrescenta automaticamente a
frase «X noites em…». Sem frase promocional preenchida, omite esse título.
Os sombreados e gradientes sob os textos são camadas independentes da fotografia
e mantêm-se ao trocar o fundo, incluindo a sombra das letras originais. Os
editores antigos recebem a separação dos sombreados ao reabrir, preservando as
publicações e os ajustes privados. Continua exclusivo da nova área da conta de teste.

Por indicação do utilizador, os cartões, retângulos e outras formas preenchidas
dos templates também são camadas independentes da fotografia. No editor, entram
em “Formas e cartões”, com seleção na imagem, mudança da cor do preenchimento,
desfazer e reposição da cor original. Preservar transparência, contornos irregulares,
textos e pictogramas sobre o novo fundo; não limitar a deteção a branco/amarelo.
As publicações antigas recebem esta preparação ao reabrir, mantendo as versões
originais e os ajustes privados. Continua exclusivo da nova área da conta de teste.

Por indicação do utilizador, A minha organização inclui “Tenho um novo TP, e agora?”,
com as 42 tarefas e 10 etapas de `docs/Checklist do mentor — Novo Travel Partner.pdf`.
Cada TP direto atual aparece automaticamente a partir de `equipa_afiliados.upline_email`
depois da adição no admin e atualização da árvore da equipa. O checklist é privado
por mentor e TP, com marcas guardadas no servidor, reversíveis e sem prazo que apague
o acompanhamento. A API verifica a relação atual também ao gravar; não envia emails
nem mensagens e não altera os primeiros passos ou as presenças Welcome Aboard.
Esta página e a respetiva API continuam exclusivas da nova área da conta de teste.
