<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Alterações na área de consultor

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

Por indicação explícita do utilizador, o card de entrada no grupo WhatsApp
Welcome Aboard também aparece nos Avisos da área atual (`/consultor`) para
os consultores da equipa, com o mesmo convite definido em
`LINK_GRUPO_WELCOME_ABOARD`. Esta autorização abrange apenas este card.

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
