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

Por indicação explícita do utilizador, o Core Rank também fica acessível
na área atual em `/consultor/core-rank`, apenas para a conta de teste.
Reutiliza o mesmo componente e os mesmos registos da nova área; o link no
menu atual só aparece para `EMAIL_PAINEL_DEMONSTRACAO`.
