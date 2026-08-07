# Especificação de UI — Primeiro recorte do aplicativo ValidaGiro

**Plataforma:** aplicativo móvel Expo/React Native, inicialmente Android  
**Público principal:** operador de estoque autenticado e vinculado a uma loja  
**Escopo:** leitura de código de barras, identificação de produto, questionário de produto/lote, revisão, envio e preservação de rascunhos  
**Integração:** o aplicativo consulta e envia dados pela API compartilhada com o site; o site não faz parte deste recorte visual  
**Status:** pronto para implementação por Ptah

## 1. Resumo da proposta

O primeiro recorte deve permitir que um operador faça uma coleta completa com o menor número possível de decisões: abrir a leitura, escanear um código, confirmar o produto, preencher os dados do lote, revisar e enviar.

O fluxo é contextual:

- produto existente: exibir um resumo somente leitura dos dados permanentes e abrir diretamente os campos do lote;
- produto novo: solicitar primeiro os dados permanentes mínimos do produto e, em seguida, os dados do lote;
- sem câmera ou leitura malsucedida: oferecer digitação manual sem bloquear a tarefa;
- sem conexão: preservar o preenchimento no aparelho, indicar claramente que o registro ainda não está no site e permitir sincronização posterior;
- envio concluído: confirmar produto e lote registrados e destacar a ação de ler o próximo item.

A experiência deve ser eficiente para operação em pé e com uma mão. A ação principal de cada tela permanece visível, os alvos de toque são amplos e nenhuma informação crítica depende apenas de cor.

## 2. Objetivo da interface

Permitir que um operador registre com confiança um produto e um lote físico, associando código, validade, quantidade e localização, sem duplicar informações permanentes e sem perder o trabalho em caso de interrupção ou falha de rede.

### Resultado esperado da tarefa

Ao final de uma coleta, o operador deve compreender um destes resultados:

1. **Enviado:** o registro foi confirmado pela API e já pode aparecer no site.
2. **Pendente de sincronização:** o registro está salvo no aparelho, mas ainda não foi confirmado pela API.
3. **Requer correção:** algum dado não passou na validação e o formulário foi preservado.

## 3. Problema a resolver

O código comercial identifica normalmente o produto, não o lote. O aplicativo precisa evitar que o operador confunda essas duas entidades e deve deixar explícito que:

- nome, marca, categoria, unidade, conteúdo e preço pertencem ao produto;
- validade, número do lote, quantidade, localização, entrada, custo e observação pertencem àquela ocorrência física do produto;
- o mesmo produto pode ser registrado novamente com outro lote, outra validade ou outra localização;
- um registro salvo localmente ainda não está disponível no site até ser sincronizado.

## 4. Limites do primeiro recorte

### Incluído

- contexto da loja e operador autenticado;
- tela inicial operacional;
- solicitação e tratamento da permissão de câmera;
- leitura de EAN-8, EAN-13, UPC-A e UPC-E, conforme formatos habilitados;
- digitação manual do código;
- consulta de produto por código;
- caminho de produto existente e produto novo;
- questionário de produto e lote;
- validação local, revisão e envio;
- rascunho local e fila de sincronização;
- estados de carregamento, vazio, erro e sucesso;
- possibilidade de iniciar a leitura do próximo item.

### Fora deste recorte

- criação de conta, recuperação de senha e gestão de usuários;
- edição administrativa completa de produtos;
- painel de validades, promoções, tarefas e impressão de etiquetas;
- movimentação posterior de lotes;
- construtor dinâmico de questionários;
- interface do site administrativo.

Quando a sessão não existir ou expirar, a implementação pode exibir uma tela funcional simples de acesso/sessão expirada, mas o desenho completo de autenticação não é objeto desta entrega.

## 5. Arquitetura de navegação

Usar navegação em pilha para a tarefa de coleta. Não introduzir barra inferior no primeiro recorte, pois existe uma única jornada primária.

```text
Início
├── Scanner
│   ├── Digitar código
│   └── Consultando produto
│       ├── Produto existente → Questionário do lote
│       └── Produto novo → Dados do produto → Questionário do lote
├── Rascunhos e pendências
│   └── Retomar formulário / tentar sincronizar
└── Sessão/loja (somente contexto)

Questionário → Revisão → Enviando
├── Sucesso → Ler próximo item / Voltar ao início
├── Pendente offline → Ver pendências / Ler próximo item
└── Erro corrigível → Voltar ao formulário
```

### Regra de retorno

- Voltar do scanner retorna ao início.
- Voltar durante um formulário alterado abre a confirmação **Salvar como rascunho?**.
- As opções são **Salvar rascunho**, **Continuar preenchendo** e a ação destrutiva secundária **Descartar alterações**.
- Nunca descartar silenciosamente respostas preenchidas.
- Voltar da revisão retorna ao último bloco do formulário mantendo todos os valores.

## 6. Estrutura recomendada das telas

### 6.1 Início

#### Objetivo

Iniciar uma nova coleta e tornar visível se existem registros que ainda não chegaram ao site.

#### Estrutura

1. **Cabeçalho compacto**
   - marca/nome `ValidaGiro`;
   - nome da loja em uma linha;
   - avatar ou botão de conta como ação secundária.
2. **Saudação operacional**
   - título: `Registrar produto`;
   - apoio: `Leia o código para cadastrar um novo lote.`
3. **Ação principal em cartão**
   - ícone de código de barras;
   - botão de largura total `Ler código de barras`;
   - apoio `Use a câmera do celular`.
4. **Alternativa**
   - botão secundário `Digitar código`.
5. **Status de sincronização**
   - ocultar se não houver itens;
   - quando houver, exibir cartão `X registros pendentes` com ícone e ação `Ver pendências`;
   - diferenciar `rascunhos` de `aguardando envio` no texto do cartão.

#### Hierarquia

`Ler código de barras` é o único botão preenchido de maior destaque. `Digitar código` usa estilo contornado ou textual. Pendências devem ser perceptíveis, mas não competir visualmente com a nova leitura.

### 6.2 Permissão de câmera

#### Antes da solicitação nativa

Exibir uma explicação própria antes do diálogo do sistema:

- título: `Permitir acesso à câmera`;
- texto: `A câmera é usada somente para ler códigos de barras. Você também pode digitar o código.`;
- ação principal: `Continuar`;
- ação secundária: `Digitar código`.

#### Permissão negada recuperável

Se ainda for possível solicitar novamente:

- manter a explicação;
- ação principal `Tentar novamente`;
- ação secundária `Digitar código`.

#### Permissão bloqueada

Se o sistema não permitir nova solicitação:

- ícone de câmera desativada;
- título `Câmera bloqueada`;
- texto `Ative a permissão da câmera nos ajustes do aparelho ou digite o código.`;
- ação principal `Abrir ajustes`;
- ação secundária `Digitar código`.

Nunca deixar uma tela vazia ou um scanner preto após a negação.

### 6.3 Scanner

#### Objetivo

Capturar um único código legível e impedir leituras repetidas durante a consulta.

#### Estrutura

- câmera ocupando toda a área útil;
- barra superior sobre fundo escurecido, com voltar, título `Ler código` e botão de lanterna;
- moldura central de leitura com proporção horizontal e cantos bem marcados;
- instrução abaixo da moldura: `Aponte para o código de barras`;
- rodapé em superfície sólida/gradiente escuro com botão `Digitar código`;
- texto opcional de ajuda: `Mantenha o código dentro da moldura`.

#### Interação

- após reconhecer um código, emitir feedback háptico curto, congelar novas leituras e apresentar o código detectado;
- iniciar imediatamente a consulta à API;
- oferecer `Ler novamente` se a consulta não puder usar aquele código;
- o botão da lanterna deve informar estado `Lanterna ligada/desligada` para leitor de tela;
- não usar zoom como requisito do MVP.

#### Código inválido ou formato não homologado

Mostrar mensagem sobreposta não bloqueante: `Não reconhecemos este código. Tente novamente ou digite os números.`. Manter as ações `Tentar novamente` e `Digitar código`.

### 6.4 Digitação manual

Apresentar como tela ou folha modal com teclado numérico:

- título `Digitar código`;
- campo `Código de barras`;
- texto de ajuda `Digite os números abaixo do código de barras.`;
- permitir colar;
- remover espaços e separadores visuais antes da consulta, sem alterar zeros iniciais;
- ação principal `Buscar produto`;
- ação secundária `Voltar para a câmera` quando a câmera estiver disponível.

Validar presença e formato suportado sem afirmar que o produto existe. Mensagem: `Confira o código. Use entre 8 e 14 números.`. A validação final pertence à API.

### 6.5 Consulta do produto

#### Loading

Exibir uma tela de transição breve com:

- indicador de progresso;
- título `Buscando produto…`;
- código em fonte monoespaçada ou com dígitos de fácil distinção;
- ação `Cancelar` apenas se a consulta exceder um tempo perceptível; ao cancelar, voltar ao scanner/manual.

O resultado esperado em conexão estável deve aparecer em até 2 segundos. Não usar skeleton de formulário, pois ainda não se sabe qual caminho será aberto.

#### Produto existente

Abrir diretamente o questionário do lote com um cartão de produto no topo:

- selo textual `Produto encontrado`;
- nome do produto como informação principal;
- marca e conteúdo em linha secundária, quando existirem;
- código lido;
- miniatura com placeholder, se houver suporte a foto;
- ação discreta `Este não é o produto` que retorna à leitura;
- dados permanentes em modo somente leitura neste recorte.

Microcopy: `Agora informe os dados deste lote.`

#### Produto não encontrado

Exibir confirmação antes do formulário completo:

- selo textual `Produto novo`;
- título `Produto não cadastrado`;
- código lido;
- texto `Cadastre os dados do produto uma vez. Depois, informe os dados deste lote.`;
- ação principal `Cadastrar produto`;
- ação secundária `Ler outro código`.

Um retorno 404 da busca é estado de negócio e não deve ser apresentado como erro técnico.

### 6.6 Questionário — dados do produto

#### Objetivo

Cadastrar somente os dados permanentes necessários para identificar o SKU. Esta etapa aparece apenas para produto novo ou quando a API indicar explicitamente que os dados obrigatórios estão incompletos.

#### Estrutura

- cabeçalho com voltar, título `Novo produto` e indicador `Etapa 1 de 3`;
- faixa de código confirmado, com o número e ação `Trocar código`;
- formulário em uma coluna;
- rodapé fixo com `Continuar`;
- link `Salvar e sair` como ação secundária.

#### Campos e controles

| Campo | Controle | Obrigatoriedade no recorte | Regra de interface |
|---|---|---:|---|
| Código lido está correto? | confirmação visual do código; não usar checkbox redundante | Sim | seguir implica confirmação; `Trocar código` volta à leitura |
| Nome do produto | texto | Sim | exemplo: `Leite integral 1 L` |
| Marca | texto/autocomplete futuro | Não | permitir `Sem marca` somente se necessário |
| Categoria | seletor pesquisável | Sim | opções fornecidas pela API; não permitir texto livre sem regra de backend |
| Unidade de medida | seletor | Sim | rótulos por extenso, por exemplo `Unidade`, `Quilograma`, `Litro` |
| Conteúdo/peso | número + unidade, ou texto estruturado conforme contrato | Não no recorte visual | exemplo `500 g`; teclado adequado |
| Preço de venda atual | moeda BRL | Sim conforme PRD | exibir `R$`, aceitar centavos e anunciar valor formatado |
| Pode receber promoção automática? | escolha segmentada `Sim` / `Não` | Sim | não usar switch sem rótulo explícito |
| Foto | ação `Adicionar foto` | Opcional | sempre permitir seguir sem foto |

Se o backend definir obrigatoriedade diferente por categoria, a UI deve renderizar a regra devolvida pela versão do questionário, mantendo esta ordem e agrupamento.

### 6.7 Questionário — dados do lote

#### Objetivo

Registrar os dados que diferenciam a entrada física atual das demais ocorrências do mesmo produto.

#### Estrutura

- cabeçalho com voltar, título `Dados do lote`;
- indicador `Etapa 1 de 2` para produto existente ou `Etapa 2 de 3` para produto novo;
- cartão compacto do produto, sempre visível antes dos campos;
- seção `Identificação e validade`;
- seção `Quantidade e local`;
- seção recolhível `Informações adicionais`;
- rodapé fixo com `Revisar cadastro`;
- ação secundária `Salvar e sair`.

#### Campos e controles

| Campo | Controle | Obrigatório | Regra de interface |
|---|---|---:|---|
| Data de validade | seletor de data | Sim | não exigir digitação livre; exibir no padrão `DD/MM/AAAA` |
| Número do lote | texto com opção `Não informado` | Não | não preencher automaticamente com o código do produto |
| Quantidade | número inteiro com teclado numérico | Sim | mínimo 1; não aceitar negativo ou decimal no MVP por unidade |
| Localização | seletor pesquisável | Sim | carregar somente locais autorizados da loja; exibir nome e caminho, se houver |
| Data de entrada | seletor de data | Sim, pré-preenchido | usar a data da loja, não o relógio como fonte definitiva; edição conforme permissão |
| Custo unitário | moeda BRL | Não | nunca bloquear o envio por ausência |
| Observação, avaria ou restrição | texto multilinha | Não | contador apenas se existir limite no contrato |

#### Validações visuais

- validar ao sair do campo e novamente ao avançar;
- apresentar erro abaixo do campo e mover foco para o primeiro erro ao tentar continuar;
- quantidade `0`: `Informe uma quantidade maior que zero.`;
- validade ausente: `Informe a data de validade.`;
- localização ausente: `Selecione onde o produto está armazenado.`;
- validade anterior à entrada: mostrar alerta destacado `A validade é anterior à data de entrada.` e impedir o avanço para perfis sem permissão; se a API admitir confirmação autorizada, apresentar fluxo de confirmação específico, nunca uma aceitação silenciosa;
- falha ao carregar localizações: preservar os demais campos e oferecer `Tentar carregar locais novamente`.

### 6.8 Revisão

#### Objetivo

Permitir conferência explícita antes de criar ou atualizar o produto e registrar o lote.

#### Estrutura

- cabeçalho `Revisar cadastro` e indicador da última etapa;
- aviso curto `Confira antes de enviar. O lote será associado a este produto.`;
- cartão `Produto` com código, nome, marca, categoria, conteúdo e preço;
- cartão `Lote` com validade em maior destaque, número do lote, quantidade, localização e entrada;
- informações opcionais presentes em área secundária; omitir linhas vazias em vez de mostrar vários traços;
- ação `Editar` em cada cartão, levando à etapa correspondente;
- rodapé fixo com ação principal `Enviar cadastro`;
- ação secundária `Salvar como rascunho`.

Para produto existente, o cartão de produto é somente leitura e não exibe `Editar` neste recorte. O rótulo da ação não deve ser apenas `Salvar`, pois o operador precisa saber que haverá sincronização com o site.

### 6.9 Enviando

Ao tocar em `Enviar cadastro`:

- desabilitar a ação imediatamente para evitar múltiplos toques;
- manter a revisão visível sob uma camada de progresso ou usar tela dedicada;
- texto `Enviando cadastro…`;
- apoio `Não feche o aplicativo até confirmarmos o envio.`;
- manter o mesmo identificador de requisição (`clientRequestId`) em novas tentativas do mesmo registro;
- não permitir iniciar outro envio concorrente do mesmo rascunho.

Se a rede cair durante o envio e o resultado for incerto, não declarar falha definitiva nem sucesso. Consultar o estado pelo identificador e, sem confirmação, mover para `Aguardando sincronização`.

### 6.10 Sucesso confirmado

#### Estrutura

- ícone de confirmação com texto, não apenas cor;
- título `Cadastro enviado`;
- apoio `O lote já foi registrado e pode aparecer no site.`;
- resumo curto: produto, quantidade, validade e localização;
- ação principal `Ler próximo item`;
- ação secundária `Voltar ao início`.

Não redirecionar automaticamente: o operador deve ter tempo para reconhecer o resultado.

### 6.11 Rascunho e pendência de sincronização

Rascunho e envio pendente são estados diferentes e devem usar termos consistentes:

- **Rascunho:** preenchimento incompleto ou salvo antes da revisão.
- **Aguardando envio:** formulário completo salvo no aparelho, ainda não enviado.
- **Sincronizando:** tentativa ativa.
- **Erro de sincronização:** a API respondeu com erro ou a tentativa falhou e exige atenção.
- **Enviado:** confirmação recebida da API.

#### Tela de resultado offline

Se o operador concluir sem conexão:

- ícone de nuvem offline + texto;
- título `Salvo no aparelho`;
- apoio `Este cadastro ainda não aparece no site. Enviaremos quando a conexão voltar.`;
- resumo do registro;
- ação principal `Ler próximo item`;
- ação secundária `Ver pendências`.

#### Lista de rascunhos e pendências

Cada item deve apresentar:

- status textual e ícone;
- nome do produto ou `Produto novo`;
- código;
- validade e quantidade, se preenchidas;
- data/hora da última alteração;
- ação coerente: `Continuar`, `Enviar agora` ou `Ver erro`.

Ordenar primeiro erros de sincronização, depois aguardando envio e, por fim, rascunhos, todos por atualização mais recente. O botão `Tentar enviar todos` aparece apenas para registros completos e com conexão.

Excluir rascunho exige confirmação com identificação do produto/código. Não oferecer exclusão direta de um envio em estado incerto até consultar a API.

## 7. Estados transversais e tratamento de erros

### 7.1 Sem conexão antes da consulta do código

Sem um produto confirmado localmente, não presumir se ele existe na base central.

- mostrar banner persistente `Sem conexão`;
- se o aplicativo possuir cópia confiável do produto, pode abrir o formulário indicando `Dados do aparelho`;
- sem cópia, informar `Conecte-se para buscar este produto.` e permitir salvar apenas o código como início de rascunho ou tentar novamente;
- nunca apresentar `Produto novo` somente porque a busca falhou.

### 7.2 Erro da API ao buscar

Mensagem: `Não foi possível buscar o produto.`  
Apoio: `Seus dados não foram alterados. Tente novamente.`  
Ações: `Tentar novamente`, `Digitar outro código` e, quando aplicável, `Voltar para a câmera`.

### 7.3 Erro de validação da API ao enviar

- manter o formulário e o rascunho;
- relacionar cada erro ao campo correspondente;
- no topo, resumo `Revise os campos indicados.`;
- levar foco ao primeiro erro;
- se a regra mudou desde o início, carregar a nova versão do questionário sem apagar respostas compatíveis e explicar `Algumas informações precisam ser atualizadas.`.

### 7.4 Conflito ou produto alterado

Se a API indicar código já cadastrado ou dados concorrentes:

- título `Este produto já foi cadastrado`;
- explicar que os dados atuais da base serão usados;
- preservar e converter os dados de lote preenchidos;
- ação principal `Continuar com o produto encontrado`;
- ação secundária `Revisar`;
- não criar duas fichas de produto.

### 7.5 Erro inesperado

Mensagem: `Algo deu errado.`  
Apoio: `O preenchimento foi salvo neste aparelho.`  
Ações: `Tentar novamente` e `Voltar ao início`.  
Se disponível, mostrar um código curto de suporte em área copiável, sem expor detalhes técnicos.

### 7.6 Sessão expirada

- preservar o rascunho antes de sair do fluxo;
- título `Sua sessão expirou`;
- texto `Entre novamente para continuar e enviar o cadastro.`;
- ação `Entrar novamente`;
- após autenticação, retornar ao formulário ou pendência, respeitando as permissões atuais.

### 7.7 Aplicativo enviado para segundo plano

- pausar a câmera;
- salvar alterações do formulário localmente;
- ao retornar, revalidar sessão e conexão;
- não reabrir a câmera se o usuário já estava em formulário ou revisão.

## 8. Componentes principais

Ptah deve criar componentes reutilizáveis, com contratos visuais consistentes:

| Componente | Responsabilidade |
|---|---|
| `AppHeader` | voltar, título, contexto opcional e ação secundária |
| `StoreContext` | loja ativa e operador, sem permitir troca fora da permissão |
| `PrimaryActionBar` | ação principal fixa respeitando área segura e teclado |
| `BarcodeCamera` | câmera, moldura, lanterna e bloqueio após leitura |
| `BarcodeValue` | apresentação legível do código sem truncar dígitos |
| `ProductSummaryCard` | identidade do produto e estado encontrado/novo |
| `StepIndicator` | posição textual no fluxo; não depender só de barra visual |
| `FormField` | rótulo, obrigatoriedade, ajuda, erro e acessibilidade |
| `SearchSelect` | categoria/localização com busca, loading, vazio e erro |
| `DateField` | abertura de seletor e apresentação local da data |
| `MoneyField` | entrada numérica com formatação BRL sem perda de precisão |
| `StatusBanner` | offline, sincronizando, alerta ou erro com ícone + texto |
| `SyncStatusChip` | rascunho, aguardando envio, sincronizando, erro ou enviado |
| `ReviewSection` | grupo de dados revisáveis e ação editar |
| `ConfirmationDialog` | saída, descarte ou confirmação excepcional |
| `EmptyState` | ausência de rascunhos/pendências com próxima ação clara |

Nomes são indicativos; a implementação pode seguir a convenção do repositório sem alterar as responsabilidades.

## 9. Hierarquia visual e diretrizes de estilo

Como ainda não há design system visual consolidado, usar uma base sóbria, operacional e compatível com tema claro.

### Princípios

- superfícies claras e contraste alto para leitura em ambientes de estoque;
- uma única cor de marca para ações principais;
- verde reservado a confirmação, âmbar a atenção e vermelho a erro/bloqueio;
- status sempre acompanhado por ícone e texto;
- validade na revisão deve ter maior destaque que metadados secundários;
- código de barras deve usar dígitos bem diferenciados e nunca ser truncado;
- seções do formulário devem ser separadas por espaçamento e título, não por excesso de bordas.

### Escala recomendada

- margem lateral: 16 px em celulares compactos, 24 px em telas largas;
- espaçamento base: múltiplos de 4, com 8/12/16/24 como intervalos principais;
- alvo mínimo de toque: 48 × 48 dp;
- botão principal: altura mínima 52 dp;
- campos: altura mínima 48 dp, sem contar ajuda/erro;
- texto de corpo: mínimo 16 sp nos campos e conteúdo essencial;
- legendas: mínimo 14 sp;
- títulos devem respeitar escala de fonte do sistema sem corte.

### Conteúdo e tom

- usar português brasileiro direto e operacional;
- preferir verbos específicos: `Buscar produto`, `Revisar cadastro`, `Enviar cadastro`;
- evitar termos internos como `SKU`, `payload`, `request` e `sync job` na interface;
- usar `produto` e `lote` de forma explícita;
- diferenciar `salvo no aparelho` de `enviado`;
- evitar exclamações em mensagens operacionais;
- mensagens de erro devem informar o ocorrido e a próxima ação.

## 10. Responsividade

### Celular compacto

- uma coluna;
- rodapé de ação fixo;
- conteúdo rolável sem ficar oculto pelo rodapé ou teclado;
- cartões ocupam toda a largura;
- scanner mantém instrução e entrada manual acessíveis em telas baixas.

### Celular grande e coletor Android

- manter uma coluna para preservar o ritmo de preenchimento;
- limitar a largura do conteúdo a aproximadamente 600 dp e centralizar quando houver espaço;
- não aumentar excessivamente a moldura da câmera.

### Tablet

- scanner pode usar câmera em área central limitada, mantendo instruções abaixo;
- formulário com largura máxima entre 640 e 720 dp;
- campos relacionados podem ocupar duas colunas somente quando não prejudicar a ordem de leitura, por exemplo quantidade e custo; validade e localização permanecem em uma coluna por importância;
- ação principal continua no rodapé da área de conteúdo, não no canto distante da tela.

### Orientação e teclado

- priorizar retrato no celular; se paisagem for suportada, não ocultar ações ou instruções;
- ao abrir teclado, rolar o campo focado para uma posição visível;
- o rodapé pode acompanhar o teclado, desde que não cubra mensagens de erro;
- preservar valores e posição aproximada ao girar ou redimensionar.

## 11. Acessibilidade

- atender como referência WCAG 2.2 nível AA quando aplicável ao mobile;
- contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande e limites essenciais;
- suportar TalkBack, ordem lógica de foco e rótulos programáticos;
- anunciar o código reconhecido e o início da busca sem repetir continuamente;
- agrupar nome e detalhes do cartão do produto em uma leitura coerente;
- anunciar erros quando surgirem e associá-los ao campo;
- não usar placeholder como único rótulo;
- marcar obrigatoriedade em texto acessível, não só com asterisco;
- preservar alvos de toque de pelo menos 48 dp;
- respeitar tamanho de fonte do sistema, permitindo quebra de linha nos botões quando necessário;
- fornecer feedback háptico como complemento, nunca como único retorno;
- ícones de lanterna, câmera, editar, voltar e status precisam de nomes acessíveis;
- o foco do diálogo deve entrar no título e retornar ao elemento que o abriu ao fechar;
- seletor de data e listas devem ser operáveis por tecnologias assistivas;
- animações de loading não devem piscar nem impedir leitura do texto.

## 12. Instrumentação mínima da experiência

Disparar os eventos previstos no PRD sem incluir valores sensíveis desnecessários:

- `product_scanned`: após leitura aceita, com formato e origem câmera/manual;
- `barcode_scan_failed`: falha de reconhecimento ou formato;
- `questionnaire_started`: quando o caminho existente/novo for definido;
- `questionnaire_saved_as_draft`: saída voluntária ou salvamento automático relevante;
- `questionnaire_submitted`: toque aceito em enviar, uma vez por `clientRequestId`;
- `questionnaire_sync_failed`: falha confirmada;
- `product_created` e `batch_created`: apenas após confirmação da API.

Registrar também, se o contrato de analytics permitir, etapa abandonada, duração entre leitura e confirmação e origem manual/câmera. Não enviar texto livre de observações, nome do operador ou imagem do produto em analytics.

## 13. Critérios de aceitação implementáveis

### Fluxo principal

1. Na tela inicial, `Ler código de barras` é a ação visual primária e `Digitar código` está disponível como contingência.
2. Ao aceitar a câmera, o operador consegue ler um código homologado e novas leituras ficam bloqueadas enquanto a consulta está em andamento.
3. O código lido ou digitado é exibido integralmente antes do preenchimento.
4. Um produto existente abre com identificação permanente preenchida e somente leitura, seguido diretamente pelos campos de lote.
5. Um produto não encontrado é tratado como `Produto novo`, não como erro, e abre dados do produto antes dos dados do lote.
6. Produto existente não exige novamente nome, marca, categoria, unidade ou preço.
7. Data de validade, quantidade e localização são validadas antes da revisão.
8. O número do lote permanece opcional e nunca é confundido ou preenchido com o código comercial.
9. A revisão separa visualmente `Produto` e `Lote` e permite retornar à etapa editável sem perder respostas.
10. Um único toque em `Enviar cadastro` desabilita o botão e inicia uma única tentativa lógica com `clientRequestId` estável.
11. O sucesso confirmado informa que o registro pode aparecer no site e oferece `Ler próximo item`.

### Permissão e falhas

12. Se a permissão de câmera for negada ou bloqueada, a interface explica o estado e mantém a digitação manual acessível.
13. Uma falha de busca não apresenta o produto como novo e permite tentar novamente sem redigitar um código lido.
14. Erros de campo aparecem junto ao controle, são anunciados e o foco vai ao primeiro erro ao tentar avançar.
15. Falha ao carregar categorias ou localizações não apaga outros campos preenchidos.
16. Ao sair de um formulário alterado, o operador escolhe entre salvar rascunho, continuar ou descartar; nada é perdido silenciosamente.
17. Sessão expirada preserva o preenchimento e retorna o usuário à tarefa após novo acesso, quando autorizado.

### Offline e sincronização

18. Alterações de formulário são persistidas localmente durante o preenchimento e ao enviar o aplicativo para segundo plano.
19. Sem confirmação da API, a interface nunca usa a mensagem `Cadastro enviado`.
20. Um formulário concluído sem conexão aparece como `Salvo no aparelho`/`Aguardando envio` e informa que ainda não está no site.
21. A lista de pendências distingue rascunho, aguardando envio, sincronizando e erro por texto e ícone, não só por cor.
22. Nova tentativa do mesmo registro reutiliza seu `clientRequestId` e não cria uma nova pendência visual.
23. Após confirmação posterior da API, o item muda para `Enviado` e não permanece duplicado na fila.

### Usabilidade e acessibilidade

24. Todos os alvos de toque essenciais têm pelo menos 48 × 48 dp.
25. Campos possuem rótulo persistente, ajuda/erro associado e ordem de foco lógica no TalkBack.
26. Textos essenciais e botões permanecem legíveis com fonte ampliada, sem truncar código, validade ou ação principal.
27. Nenhum status depende apenas de cor; todos usam texto e, quando adequado, ícone.
28. O teclado não cobre o campo ativo, sua mensagem de erro ou a ação necessária para prosseguir.
29. O fluxo principal funciona em celular Android compacto e tablet sem rolagem horizontal.

## 14. Handoff para Ptah

### Ordem de implementação sugerida

1. Criar a base de navegação em pilha, área segura e componentes de formulário/status.
2. Implementar Início, permissão de câmera, scanner e digitação manual com dados simulados.
3. Implementar a bifurcação explícita entre produto existente e novo.
4. Implementar formulários de produto e lote com validação local e preservação de estado.
5. Implementar revisão, loading, sucesso confirmado e erros de API.
6. Implementar rascunhos locais e estados de sincronização, mantendo `clientRequestId` por registro.
7. Conectar aos contratos reais da API sem mover regras de autorização ou negócio para o frontend.
8. Validar em Android real ou emulador: câmera, teclado, fonte ampliada, TalkBack, perda de rede e retomada do aplicativo.

### Regras que não devem ser reinterpretadas na implementação

- câmera é o caminho principal; digitação manual é sempre uma alternativa acessível;
- ausência de resposta da API não significa produto novo;
- produto e lote são blocos distintos em formulário, revisão e payload;
- dados permanentes não são perguntados novamente para produto existente;
- somente confirmação da API autoriza o estado `Enviado`;
- rascunho não é sinônimo de pendência pronta para sincronizar;
- o aplicativo deve preservar o trabalho antes de navegação de saída, expiração de sessão ou segundo plano;
- o site e o aplicativo compartilham dados pela API; o frontend não acessa o banco diretamente.

### Evidências esperadas para validação por Apolo

- captura ou gravação do fluxo produto existente;
- captura ou gravação do fluxo produto novo;
- permissão concedida, negada e bloqueada;
- código inválido e busca indisponível;
- erros dos campos obrigatórios;
- saída com salvamento de rascunho;
- conclusão offline e sincronização posterior;
- proteção contra duplo toque no envio;
- teste com fonte ampliada e TalkBack;
- teste em largura compacta e tablet.

