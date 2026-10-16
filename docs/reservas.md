# Reservas — Criar templates

Disponível no painel direito de `/consultor/nova-area`, exclusivamente para o email de teste definido em `src/lib/demo.ts`. A API verifica a mesma restrição e a existência do membro na equipa. A área atual não foi alterada.

A entrada principal é **Criar com orçamento**, em três passos: carregar a proposta PDF e confirmar os dados/hotel, escolher o modelo, e acrescentar uma frase opcional antes de gerar.

**Criar modelo do Canva** configura uma base fixa privada. Exportar do Canva uma cópia sem os textos que mudam entre viagens; manter o fundo e a decoração. Carregar preferencialmente PNG a 1080 × 1920 ou 1080 × 1350, até 1,5 MB. O formato é inferido; imagens com outras proporções são rejeitadas. PNGs nestas dimensões e dentro do limite são conservados sem recompressão; exportações proporcionais são normalizadas sem recorte. JPG/WebP também são aceites, mas a conversão para PNG tem de caber no limite.

O resultado e o modelo permitem clicar nos textos/imagens, arrastar, redimensionar pelo canto e desfazer (até 30 alterações na sessão; um arrasto é uma alteração). O painel de ajustes mostra conteúdo, tipo de letra, tamanho em píxeis, cor, negrito, maiúsculas e alinhamento; fotografias podem ser substituídas no mesmo espaço. No telemóvel abre um painel inferior com botão Fechar. Os formulários técnicos ficam recolhidos em “Mais opções: dados, elementos e desenho”. Alterar um campo ligado ao orçamento atualiza os dados e a legenda, sem quebrar essa ligação.

As dez fontes são Arial, Georgia, Montserrat, Bebas Neue, Poppins, Playfair Display, Oswald, Raleway, Lora e Dancing Script. As seis famílias novas vêm do [repositório oficial Google Fonts](https://github.com/google/fonts/tree/main/ofl); os ficheiros e licenças OFL são distribuídos em `public/fonts`. Carregamento e exportação usam os mesmos ficheiros locais e aguardam a fonte escolhida; uma falha impede exportar silenciosamente com outra fonte. Fontes do Canva não são importadas automaticamente. Textos maiores ajustam-se ao espaço configurado.

Um exemplo completo pode ser carregado como guia sobreposta apenas durante a edição. A guia não entra no PNG. A marca canónica permanece protegida e pode ser posicionada no espaço reservado do desenho. O fundo PNG continua a ser uma imagem fixa: apenas os campos sobrepostos são editáveis.

No passo 2, **O meu template do Canva** usa esses modelos e o respetivo formato. Preencher um orçamento mantém a base e as coordenadas dos campos, sem análise/reconstrução por IA. Para mudar a fotografia entre viagens, adicionar um campo Fotografia; uma imagem integrada na base é fixa. Bases PNG transparentes podem ficar por cima dos campos de fotografia. Ao guardar um modelo, o servidor remove os dados do orçamento e as fotografias variáveis. O material final conserva os dados e fotografias no histórico. Créditos das fotografias sugeridas acompanham o texto da publicação nos modelos fixos, sem acrescentar um rodapé à base.

Como alternativa, **A minha referência** permite reconstruir uma imagem com IA. Esta opção pode alterar o desenho; não garante fidelidade à imagem. A análise é reutilizada ao gerar outro orçamento no mesmo formato; mudar a imagem ou formato exige nova análise. Uma falha na análise mantém a referência e os dados, sem substituir o desenho por um modelo genérico.

Em alternativa, **Modelos disponíveis** oferece os estilos Elegante (cartão claro) e Fotográfico (fotografia de fundo). Os formatos são story (1080 × 1920) e feed (1080 × 1350). A fotografia do destino pode ser própria ou escolhida automaticamente entre resultados de domínio público/CC0; se não houver fotografia disponível, é pedido o carregamento de uma imagem própria. A referência define o desenho; a fotografia do destino é colocada nos espaços de fotografia desse desenho. A fotografia e os dados são revistos antes da exportação.

Cada composição começa pelo hotel selecionado. Nas referências com vários espaços, são incluídas as restantes opções até à capacidade do desenho; as outras propostas e hotéis permanecem no assistente para criar outros materiais. O resultado apresenta a pré-visualização, comparação com a referência, exportação PNG, gravação no histórico/modelos, texto para copiar e acesso ao editor completo. Alterar um preço no editor também atualiza o texto para acompanhar a publicação.

O **Editor de templates** mantém a importação de referências PNG/JPG/WebP. A análise reconstrói textos, formas, fotografias e recortes gráficos em elementos editáveis. A capacidade de hotéis é identificada na referência, até seis opções; um PDF com mais opções permite escolher grupos sem descartar as restantes opções importadas.

Os dados podem ser preenchidos manualmente ou importados de propostas PDF, incluindo PDFs digitalizados. Cada PDF deve ter até 4 MB e 30 páginas. Os dados importados precisam de confirmação. O preço explícito por pessoa prevalece; na sua ausência, o total de cada opção é dividido pelo número de viajantes confirmado, com duas casas decimais. Não se pressupõem números de viajantes ou serviços incluídos.

Todos os elementos podem ser posicionados e dimensionados no editor. Os textos podem usar dados da viagem, uma opção de hotel ou texto livre. O logótipo local `public/icligo-logo.png` e o nome iCliGo são desenhados num bloco canónico protegido; os dados enviados pelo cliente não substituem a marca.

Há sugestões de frases editáveis e procura de fotografias de domínio público/CC0 na Wikimedia Commons, com origem e créditos no ficheiro final. Fotografias próprias podem substituir as sugestões.

Modelos guardam o desenho sem os dados do orçamento. Materiais guardam o desenho e os dados, permitindo reabrir, editar, duplicar e exportar em PNG; o histórico pode ser exportado num ZIP. A persistência usa registos `reservas:v1:<email>:item:<uuid>` em `dashboard_config`, com consultas limitadas ao email da conta, seguindo a identificação por email da plataforma existente. Não é necessária uma nova migração.

## Configuração e validação

`OPENAI_API_KEY` é usada apenas no servidor. `RESERVAS_AI_MODEL` é opcional (por defeito `gpt-4.1`). Os pedidos à Responses API usam `store: false`; referências têm saída estruturada, validada antes de entrar no editor. Quando não existe uma chave OpenAI, é reutilizada a integração `ANTHROPIC_API_KEY` da plataforma, também com imagens, PDFs e saída estruturada (`RESERVAS_CLAUDE_MODEL`, por defeito `claude-sonnet-5`). Sem qualquer chave, o editor manual e a exportação continuam a funcionar. As sugestões de fotografias necessitam de acesso à Wikimedia; não usam a chave de IA.

Referências raster são reconstruídas, não importadas como ficheiros de design com as fontes originais. Composições complexas e fontes específicas podem precisar de ajustes no editor; a imagem original permanece disponível para comparação. Para melhores resultados, usar uma exportação do material final sem a interface do Canva ou do navegador.

Verificação: `npm run test:reservas`, `npm run typecheck` e `npm run build`. Os testes automatizados não alteram dados reais; cobrem os dois estilos e formatos, seleção do hotel, preservação da proposta original, ausência de serviços inventados, legendas atualizadas, valores ausentes, preços por opção, capacidade do modelo, datas, proteção da marca, isolamento dos registos, bloqueio fora da conta de teste, ficheiros inválidos, análise e importação de PDFs.
