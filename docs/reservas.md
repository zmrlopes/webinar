# Reservas — Criar templates

Disponível no painel direito de `/consultor/nova-area`, exclusivamente para o email de teste definido em `src/lib/demo.ts`. A API verifica a mesma restrição e a existência do membro na equipa. A área atual não foi alterada.

A entrada principal é **Criar com orçamento**, em três passos: carregar a proposta PDF e confirmar os dados/hotel, escolher formato e estilo, e acrescentar uma frase opcional antes de gerar. Os formatos são story (1080 × 1920) e feed (1080 × 1350). Os estilos Elegante (cartão claro) e Fotográfico (fotografia de fundo) são composições editáveis preenchidas diretamente com os dados confirmados, sem reconstrução de uma referência por IA. A fotografia pode ser própria ou escolhida automaticamente entre os resultados de domínio público/CC0 do destino; se não houver fotografia disponível, é pedido o carregamento de uma imagem própria. A fotografia e os dados são revistos antes da exportação.

Cada composição divulga o hotel selecionado; as outras propostas e hotéis permanecem no assistente para criar outros materiais. O resultado apresenta a pré-visualização, exportação PNG, gravação no histórico/modelos, texto para copiar e acesso ao editor completo. Alterar um preço no editor também atualiza o texto para acompanhar a publicação.

O **Editor de templates** mantém a importação de referências PNG/JPG/WebP. A análise reconstrói textos, formas, fotografias e recortes gráficos em elementos editáveis. A capacidade de hotéis é identificada na referência, até seis opções; um PDF com mais opções permite escolher grupos sem descartar as restantes opções importadas.

Os dados podem ser preenchidos manualmente ou importados de propostas PDF, incluindo PDFs digitalizados. Cada PDF deve ter até 4 MB e 30 páginas. Os dados importados precisam de confirmação. O preço explícito por pessoa prevalece; na sua ausência, o total de cada opção é dividido pelo número de viajantes confirmado, com duas casas decimais. Não se pressupõem números de viajantes ou serviços incluídos.

Todos os elementos podem ser posicionados e dimensionados no editor. Os textos podem usar dados da viagem, uma opção de hotel ou texto livre. O logótipo local `public/icligo-logo.png` e o nome iCliGo são desenhados num bloco canónico protegido; os dados enviados pelo cliente não substituem a marca.

Há sugestões de frases editáveis e procura de fotografias de domínio público/CC0 na Wikimedia Commons, com origem e créditos no ficheiro final. Fotografias próprias podem substituir as sugestões.

Modelos guardam o desenho sem os dados do orçamento. Materiais guardam o desenho e os dados, permitindo reabrir, editar, duplicar e exportar em PNG; o histórico pode ser exportado num ZIP. A persistência usa registos `reservas:v1:<email>:item:<uuid>` em `dashboard_config`, com consultas limitadas ao email da conta, seguindo a identificação por email da plataforma existente. Não é necessária uma nova migração.

## Configuração e validação

`OPENAI_API_KEY` é usada apenas no servidor. `RESERVAS_AI_MODEL` é opcional (por defeito `gpt-4.1`). Os pedidos à Responses API usam `store: false`; referências têm saída estruturada, validada antes de entrar no editor. Quando não existe uma chave OpenAI, é reutilizada a integração `ANTHROPIC_API_KEY` da plataforma, também com imagens, PDFs e saída estruturada (`RESERVAS_CLAUDE_MODEL`, por defeito `claude-sonnet-5`). Sem qualquer chave, o editor manual e a exportação continuam a funcionar. As sugestões de fotografias necessitam de acesso à Wikimedia; não usam a chave de IA.

Referências raster são reconstruídas, não importadas como ficheiros de design com as fontes originais. Composições complexas e fontes específicas podem precisar de ajustes no editor; a imagem original permanece disponível para comparação. Para melhores resultados, usar uma exportação do material final sem a interface do Canva ou do navegador.

Verificação: `npm run test:reservas`, `npm run typecheck` e `npm run build`. Os testes automatizados não alteram dados reais; cobrem os dois estilos e formatos, seleção do hotel, preservação da proposta original, ausência de serviços inventados, legendas atualizadas, valores ausentes, preços por opção, capacidade do modelo, datas, proteção da marca, isolamento dos registos, bloqueio fora da conta de teste, ficheiros inválidos, análise e importação de PDFs.
