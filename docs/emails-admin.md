A ferramenta está em `/admin/emails` e usa a autenticação admin existente.

Preparação para produção:

1. Aplicar `npm run migrar` para criar as tabelas da migração 053.
2. Configurar `BREVO_API_KEY`, o remetente existente (`BREVO_SENDER_EMAIL` e `BREVO_SENDER_NAME`) e `CRON_SECRET` no alojamento.
3. Publicar o código e a configuração `vercel.json`, incluindo o cron `/api/cron/emails` a cada minuto. O plano do alojamento tem de aceitar essa frequência e o tempo máximo de 60 segundos.

Não é criada nenhuma campanha nem enviado nenhum email ao instalar ou testar a ferramenta.

O admin escreve texto simples, escolhe várias listas e revê antes de confirmar. Cada endereço é normalizado e recebe uma cópia por campanha. A lista fica fixada na confirmação, sem incluir novas inscrições posteriores. A data é interpretada pelo PostgreSQL em `Europe/Lisbon`, independentemente do fuso do navegador. Nas horas repetidas na mudança de outono, o PostgreSQL escolhe a ocorrência em horário padrão.

O campo Anexo aceita um ficheiro Excel (.xlsx/.xls), CSV, PDF, Word (.doc/.docx) ou imagem PNG/JPG até 3 MB. A migração 054 acrescenta o armazenamento do ficheiro na própria campanha. O envio usa multipart, valida o tamanho e a assinatura do formato no servidor, e guarda o ficheiro na mesma transação do agendamento. A Brevo recebe o anexo em base64 em cada email. O histórico apenas lê o nome e tamanho; o download exige autenticação admin. Campanhas anteriores mantêm-se sem anexo.

“Inscritos dia 14” lê `evento_inscricoes`, atualmente o Teambuilding de 14/11/2026. Uma inscrição para vários participantes tem apenas o email do titular. “Todos os registados na plataforma” junta contactos das sessões não canceladas, do evento e consultores com link pessoal. “Todos os consultores” lê toda a equipa. “Consultores com painel” lê os links pessoais. Cada lista de equipa inclui a líder e todos os descendentes, mesmo se também pertencerem a uma subequipa. Os critérios estão descritos junto a cada lista.

As campanhas usam diretamente a Brevo, sem os campos partilhados das automações ActiveCampaign. Não alteram subscrições nas listas ActiveCampaign. As regras de bloqueio e entrega da Brevo continuam a aplicar-se. “Enviado” indica aceitação pelo fornecedor, não comprovação de entrega na caixa de entrada.

O cron reclama atomicamente um destinatário de cada vez, com bloqueios e `skip locked`, e processa até 30 por execução, durante aproximadamente 45 segundos mais a última chamada. Listas grandes podem demorar várias execuções. Cancelar impede novas reclamações; emails já reclamados podem ainda sair.

Uma exceção do fornecedor deixa o destinatário em `incerto`. Uma execução interrompida deixa-o em `a_enviar`, contado como incerto após dez minutos. Estes casos nunca voltam automaticamente à fila: verificar na Brevo antes de preparar um novo envio. Esta escolha evita repetições quando o fornecedor aceita uma mensagem mas a resposta se perde. O detalhe do histórico permite consultar os endereços e os estados.

Verificação: `npm run test:emails` (fornecedor e base substituídos em memória, sem envio real) e `npm run typecheck`.
