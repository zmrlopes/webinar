# Tenho um novo TP, e agora?

Página em **A minha organização**, no painel direito de `/consultor/nova-area`. A página e a API `/api/consultor/nova-area/mentor-checklist` usam `podeVerNovaArea`, exclusivamente para a conta de teste definida em `src/lib/demo.ts`.

As 42 tarefas e as 10 etapas em `src/lib/mentor-checklist.ts` transcrevem o checklist das páginas 1, 2 e 4 de `docs/Checklist do mentor — Novo Travel Partner.pdf`. A página 3 está vazia e as páginas 5–8 são exemplos de emails; não são tarefas adicionais. A página não envia emails nem mensagens.

## Associação automática

O mentor é o **upline direto atual** em `equipa_afiliados.upline_email`. O admin continua a adicionar o consultor pelo processo existente; quando a atualização dos dados associa esse consultor ao mentor na árvore, ele aparece na próxima leitura da página. Não há outra inscrição nem cópia da árvore. Enquanto o upline não estiver preenchido, não se inventa uma relação a partir de leads, nomes ou emails.

Os TPs diretos são ordenados pela data de registo, do mais recente para o mais antigo. Não há prazo que faça desaparecer acompanhamentos antigos. O filtro inicial mostra os TPs ativos com tarefas por concluir; os filtros Concluídos e Todos permitem recuperar os restantes, incluindo inativos em Todos. A lista é atualizada ao abrir a página, regressar à janela e usar Atualizar lista.

## Progresso e privacidade

Cada checklist é privado por mentor e TP, em `dashboard_config` com a chave `consultor:mentor-checklist:<mentor>:<tp>:v1`. A gravação altera apenas a tarefa escolhida, com um upsert atómico; repetir a mesma marca não duplica tarefas e marcar noutro dispositivo não apaga os restantes passos. É possível desmarcar. Uma falha de rede não confirma uma marca que não tenha sido guardada.

A relação atual é verificada dentro da própria instrução de escrita. Um mentor não pode consultar o progresso ou marcar tarefas de outro mentor, de um TP indireto ou de alguém que lhe deixou de estar associado. Ao mudar a relação na árvore, a antiga mentora perde o acesso e o novo mentor inicia o seu acompanhamento privado. Os registos anteriores são preservados. As chaves têm os dois emails entre separadores, compatíveis com o mecanismo existente de correção de emails do admin.

As marcas manuais do mentor continuam privadas e independentes do progresso do TP. Esta página não altera os checks de “Começa aqui” nem os registos de presença Welcome Aboard.

## Progresso automático do novo TP

“Tarefas iniciais da equipa” foi retirado da nova área; o acompanhamento passa a estar nesta página. A leitura cruza a relação direta atual com os sete checks de “Começa aqui” guardados pelo próprio TP (v2; apenas curso e sessões são equivalentes no progresso v1). Mostra os sete indicadores no detalhe e confirma automaticamente as tarefas correspondentes do checklist. Acessos e grupos, primeira reunião, curso, primeiras ações e próximos passos têm correspondências explícitas em `comporProgressoMentor`. O check das duas sessões só fica completo com ambas confirmadas. As presenças Zoom e as correções Welcome Aboard existentes também contam, sem o limite de três meses da página retirada.

Estas confirmações são calculadas em cada leitura, identificadas como automáticas e não copiadas para as marcas privadas do mentor. Desmarcar um check no TP retira a sua confirmação automática; uma confirmação independente do mentor permanece. Não se infere que o mentor explicou processos, conheceu sonhos, avaliou resultados ou que o TP conversou com clientes **e** candidatos a partir de um check que permite uma conversa sobre viagens **ou** oportunidade. As tarefas exclusivas do mentor continuam manuais. Não altera checks do TP, registos Welcome Aboard ou presenças.

A página relê automaticamente os dados de dez em dez segundos enquanto estiver visível, ao regressar à janela e após uma marca manual; não é necessário carregar em Atualizar. A consulta filtra os TPs diretos atuais antes de devolver qualquer progresso. Página e API continuam limitadas à conta de teste; esta alteração não abre a nova área ou os checks aos restantes consultores.

## Validação

`node --import tsx scripts/testes-mentor-checklist.ts` verifica o catálogo, os pedidos inválidos e o acesso de teste. Com `DATABASE_URL` e `--postgres`, executa as consultas reais em tabelas temporárias com `ON COMMIT DROP`, sem alterar os dados reais: associação após atualizar a árvore, acesso direto, persistência, idempotência, desmarcar, isolamento entre mentores e reatribuição de um TP.
