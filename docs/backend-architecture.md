# Arquitetura backend e banco de dados — primeiro recorte vertical do ValidaGiro

**Status:** proposta pronta para implementação  
**Escopo:** leitura de código, consulta de produto, questionário de produto e lote, sincronização idempotente e consulta pelo site  
**Stack:** NestJS, Prisma e PostgreSQL gerenciado  
**Fora deste documento:** decisões de interface, câmera, navegação e implementação visual do aplicativo ou site

## 1. Objetivo técnico

Entregar uma API única, consumida pelo aplicativo e pelo site, que permita:

1. autenticar o usuário e determinar as empresas e lojas às quais ele tem acesso;
2. consultar um produto pelo código de barras dentro da empresa selecionada;
3. obter a versão vigente do questionário e os cadastros auxiliares;
4. receber uma coleta contendo produto e lote;
5. criar, de forma atômica, produto quando necessário, lote, movimento inicial de estoque, respostas e auditoria;
6. repetir com segurança uma tentativa depois de timeout ou perda de rede usando o mesmo `clientRequestId`;
7. disponibilizar imediatamente os dados gravados para o site pela mesma API.

O primeiro recorte deve ser um **monólito modular**, e não microserviços. A separação em módulos existe para preservar limites de negócio e permitir evolução, sem introduzir filas distribuídas ou consistência eventual antes de serem necessárias.

## 2. Diagnóstico do estado atual

### O que existe agora

- O repositório contém o PRD do ValidaGiro.
- O PRD recomenda aplicativo React Native/Expo, site Next.js, API NestJS e PostgreSQL.
- O fluxo prioritário e a distinção entre produto e lote estão definidos conceitualmente.
- Ainda não há backend, schema Prisma, migrações nem contrato OpenAPI implementados.

### O que deve permanecer

- Aplicativo e site acessam a mesma API; nenhum deles acessa o banco diretamente.
- Produto representa o SKU; lote representa validade, quantidade e localização.
- O código comercial comum identifica produto, não lote.
- Empresa e loja fazem parte do contexto de autorização e persistência.
- A data civil e o fuso da loja são autoritativos para regras de validade.
- O formulário pode permanecer fixo na primeira versão, mas toda coleta registra a versão usada.

### O que precisa ser criado neste recorte

- Workspace monorepo e aplicação NestJS.
- Autenticação por JWT e autorização por empresa, loja e permissão.
- Modelos Prisma, constraints PostgreSQL, índices e políticas de isolamento.
- Módulos de catálogo, questionário, localização, coleta, estoque e auditoria.
- Contrato REST versionado em `/v1` e documento OpenAPI gerado pela API.
- Estratégia de idempotência, outbox offline do cliente e reconciliação de tentativas incertas.
- Testes de integração com PostgreSQL real e testes explícitos de isolamento multiempresa.

## 3. Arquitetura proposta

### 3.1 Estrutura do monorepo

Usar `pnpm` workspaces e Turborepo. Estrutura-alvo:

```text
apps/
  api/                    # NestJS; único processo de backend no MVP
  mobile/                 # React Native/Expo; responsabilidade frontend
  web/                    # Next.js; responsabilidade frontend
packages/
  database/               # schema Prisma, migrações, client e seeds
  api-client/             # cliente e tipos gerados do OpenAPI
  config/                 # configurações TypeScript/ESLint compartilhadas
docs/
  backend-architecture.md
```

`packages/api-client` deve ser gerado a partir do OpenAPI, e não manter DTOs copiados manualmente. Regras de negócio e validações autoritativas ficam na API; compartilhar tipos não significa duplicar regras nos clientes.

### 3.2 Organização interna da API

```text
apps/api/src/
  main.ts
  app.module.ts
  common/
    auth/
    errors/
    http/
    observability/
    prisma/
  modules/
    identity/
    tenancy/
    catalog/
    locations/
    questionnaires/
    intake/
    inventory/
    audit/
    health/
```

Responsabilidades:

| Módulo | Responsabilidade neste recorte |
|---|---|
| `identity` | Validar JWT, resolver o usuário interno e expor o contexto de identidade |
| `tenancy` | Resolver empresa/loja, memberships, papéis e permissões; impedir acesso cruzado |
| `catalog` | Categorias, produtos, códigos de barras, normalização e consulta |
| `locations` | Listar e validar localizações ativas da loja |
| `questionnaires` | Publicar a versão vigente e preservar definições imutáveis |
| `intake` | Orquestrar o envio idempotente e sua transação atômica; consultar sincronização |
| `inventory` | Criar lote e movimento inicial; manter as invariantes de quantidade |
| `audit` | Gravar eventos imutáveis na mesma transação das alterações |
| `health` | Liveness, readiness e verificação de banco |

Dependências permitidas: `intake` orquestra serviços públicos de `catalog`, `questionnaires`, `locations`, `inventory` e `audit`. `inventory` pode consultar `catalog`, mas módulos de domínio não dependem de `intake`. Controllers não acessam Prisma diretamente.

Não criar repositório genérico. Cada módulo deve possuir repositórios orientados ao domínio, sempre exigindo um `TenantContext` explícito.

### 3.3 Fluxo da coleta

1. O cliente obtém JWT no provedor de identidade.
2. `GET /v1/me/context` informa empresas, lojas e papéis autorizados.
3. O cliente seleciona a loja e passa `X-Store-Id` nas rotas operacionais.
4. A API valida a loja contra a membership atual e deriva `companyId`; o cliente nunca escolhe `companyId` no payload.
5. O cliente consulta código, questionário, categorias e localizações.
6. O cliente gera um UUID para `clientRequestId` antes da primeira tentativa e não o troca em retries.
7. `POST /v1/intake-submissions` valida e grava toda a coleta em uma única transação PostgreSQL.
8. Depois do commit, a consulta de lotes do site já retorna o lote. Não há replicação, webhook ou fila neste recorte.

## 4. Contexto multiempresa, autenticação e autorização

### 4.1 Autenticação

No MVP, Supabase Auth pode emitir o JWT. A API deve:

- aceitar apenas `Authorization: Bearer <token>` por HTTPS;
- validar assinatura por JWKS, algoritmo permitido, `iss`, `aud`, `exp` e `nbf`;
- mapear o `sub` do token para `User.authSubject`;
- usar a membership no banco como fonte de verdade para empresa, loja e papel;
- nunca confiar em `companyId`, papel ou lista de lojas enviados pelo cliente ou presentes apenas em metadados editáveis do JWT;
- recusar usuário, membership, empresa ou loja inativos;
- não receber nem armazenar senha na API.

Se outro provedor for adotado, apenas o adaptador de identidade muda; `authSubject` continua sendo a ligação externa.

### 4.2 Seleção de loja

Rotas operacionais exigem `X-Store-Id: <uuid>`. O guard de tenancy:

1. resolve a membership pelo usuário autenticado;
2. valida que a loja está ativa e pertence à mesma empresa;
3. valida que a membership abrange a loja ou todas as lojas da empresa;
4. cria um `TenantContext` imutável com `userId`, `membershipId`, `companyId`, `storeId`, `role` e `permissions`.

Uma loja de outra empresa deve produzir `404 RESOURCE_NOT_FOUND`, evitando revelar sua existência. Falta de permissão para uma loja conhecida no contexto da mesma empresa produz `403 FORBIDDEN`.

### 4.3 Papéis e permissões iniciais

| Papel | Permissões do recorte |
|---|---|
| `COMPANY_ADMIN` | todas as lojas; leitura e escrita; editar produto; exceção de datas; administrar cadastros auxiliares |
| `STORE_MANAGER` | loja(s) atribuída(s); leitura e escrita; editar produto; exceção de datas |
| `STOCK_OPERATOR` | loja(s) atribuída(s); consultar e criar produto/lote; não pode confirmar exceção nem habilitar promoção automática |
| `VIEWER` | somente leitura no site nas lojas atribuídas |

Permissões internas mínimas: `catalog:read`, `product:create`, `product:update`, `batch:create`, `batch:read`, `batch:override-entry-date`, `batch:override-expiry-before-entry`, `promotion-eligibility:update`, `sync:read`, `sync:read:any`.

Para operador, `automaticPromotionEligible` deve ser `false`. Valor `true` exige `promotion-eligibility:update`. O motor de promoções está fora deste recorte.

### 4.4 Isolamento no banco

Toda tabela operacional carrega `company_id`; tabelas ligadas a loja também carregam `store_id`. Relações usam chaves compostas para impedir, no próprio PostgreSQL, referências entre empresas ou lojas.

Aplicar duas camadas:

1. **Obrigatória:** todos os repositórios recebem `TenantContext` e incluem `companyId` e, quando aplicável, `storeId` nos filtros.
2. **Defesa em profundidade:** RLS nas tabelas operacionais, usando `set_config('app.user_subject', ..., true)`, `set_config('app.company_id', ..., true)` e `set_config('app.store_id', ..., true)` dentro da transação Prisma.

O runtime deve usar um papel PostgreSQL dedicado, sem `SUPERUSER` e sem `BYPASSRLS`. O papel dono das migrações é separado. Em pool transacional, todo `set_config` precisa ocorrer com `is_local = true` e todas as operações subsequentes dentro da mesma transação; nunca persistir contexto na sessão.

A resolução inicial de membership é permitida por uma policy baseada em `app.user_subject`. Jobs futuros devem abrir uma transação por empresa/loja e definir contexto explícito.

## 5. Modelo Prisma/PostgreSQL

### 5.1 Convenções

- IDs: UUID gerado no servidor/banco.
- Datas civis (`expiryDate`, `entryDate`): PostgreSQL `date`; JSON no formato `YYYY-MM-DD`.
- Instantes: `timestamptz` em UTC.
- Valores monetários: `Decimal(12,2)` e moeda ISO 4217; nunca `float`.
- Quantidades: `Decimal(18,3)`. Para unidade `UNIT`, exigir escala zero.
- Nomes Prisma em `camelCase`; tabelas/colunas PostgreSQL em `snake_case` via `@@map`/`@map`.
- Entidades mutáveis possuem `createdAt`, `updatedAt` e `version Int @default(1)` quando houver update concorrente.
- Produto, loja, categoria e localização são inativados; não há exclusão física pela API.
- Auditoria e movimentos nunca são atualizados ou apagados pelo runtime.

### 5.2 Entidades e campos

#### Identidade e tenancy

`User`

- `id`, `authSubject` único, `displayName`, `email` opcional, `status`, timestamps.
- E-mail serve para suporte/exibição, não como chave de autorização.

`Company`

- `id`, `legalName`, `displayName`, `status`, timestamps.

`Store`

- `id`, `companyId`, `name`, `timezone` (IANA, por exemplo `America/Fortaleza`), `status`, timestamps.
- `@@unique([id, companyId])` para suportar FKs compostas.

`Membership`

- `id`, `companyId`, `userId`, `role`, `allStores`, `status`, timestamps.
- `@@unique([companyId, userId])` e `@@unique([id, companyId])`.

`MembershipStore`

- `membershipId`, `companyId`, `storeId`.
- FK composta para membership e loja na mesma empresa.
- `@@id([membershipId, storeId])`.

#### Catálogo

`Category`

- `id`, `companyId`, `name`, `active`, timestamps.
- nome único, sem diferenciar maiúsculas/minúsculas, dentro da empresa. Implementar índice único em `lower(name)` por migração SQL.

`Product`

- `id`, `companyId`, `categoryId`, `name`, `brand?`, `unitOfMeasure`, `packageContentValue?`, `packageContentUnit?`, `salePrice`, `currency`, `automaticPromotionEligible`, `active`, `version`, timestamps.
- FK composta `(categoryId, companyId)` para categoria.
- `automaticPromotionEligible` começa `false` quando criado por operador.

`ProductBarcode`

- `id`, `companyId`, `productId`, `format`, `rawValue`, `canonicalValue`, `active`, timestamps.
- `@@unique([companyId, canonicalValue])`: um código canônico identifica no máximo um produto na empresa.
- FK composta `(productId, companyId)` para produto.
- Índice `(companyId, productId, active)`.

EAN-8, EAN-13 e UPC-A são validados por tamanho e dígito verificador e convertidos para a representação GTIN-14 canônica, preservando zeros à esquerda. UPC-E deve ser expandido por biblioteca homologada antes de virar GTIN-14. Código `INTERNAL` é normalizado com Unicode NFKC e remoção de espaços externos; permanece sensível a maiúsculas/minúsculas. GS1 com lote/data está fora deste recorte.

#### Questionário e coleta

`QuestionnaireVersion`

- `id`, `code` (`PRODUCT_INTAKE`), `version` inteiro, `schemaVersion`, `definition Json`, `checksum`, `status`, `publishedAt`, `supportedUntil?`, timestamps.
- `@@unique([code, version])`.
- Uma versão publicada é imutável. Para alterar perguntas, publicar uma nova versão.

`IntakeSubmission`

- `id`, `companyId`, `storeId`, `actorUserId`, `questionnaireVersionId`, `clientRequestId`, `requestHash`, `status`, `deviceId`, `deviceAppVersion`, `capturedAt`, `receivedAt`, `completedAt?`, `productId?`, `batchId?`, `initialMovementId?`, `responseSnapshot? Json`, timestamps.
- `@@unique([companyId, clientRequestId])`.
- Índices `(companyId, storeId, receivedAt desc)` e `(companyId, actorUserId, receivedAt desc)`.
- CHECK: quando `status = COMPLETED`, produto, lote, movimento, `completedAt` e snapshot são obrigatórios.

`IntakeAnswer`

- `id`, `companyId`, `submissionId`, `questionKey`, `section` (`PRODUCT`/`BATCH`/`META`), `value Json`, `createdAt`.
- `@@unique([submissionId, questionKey])`.
- As respostas são geradas no servidor a partir do DTO validado, evitando duas fontes conflitantes no mesmo request.

#### Loja, lote e estoque

`Location`

- `id`, `companyId`, `storeId`, `code`, `name`, `active`, timestamps.
- `@@unique([companyId, storeId, code])` e `@@unique([id, companyId, storeId])`.

`Batch`

- `id`, `companyId`, `storeId`, `productId`, `locationId`, `batchNumber?`, `normalizedBatchNumber?`, `expiryDate`, `entryDate`, `receivedQuantity`, `currentQuantity`, `unitCost?`, `currency?`, `observation?`, `status`, `version`, timestamps.
- FKs compostas garantem produto da empresa e localização da mesma empresa/loja.
- CHECKs: `received_quantity > 0`, `current_quantity >= 0`, custos não negativos.
- Índices para o site: `(companyId, storeId, expiryDate, status)`, `(companyId, storeId, productId, expiryDate)` e `(companyId, storeId, locationId, status)`.

O primeiro envio cria um novo lote. O sistema não deve fundir automaticamente lotes apenas porque número, validade e localização coincidem: sem um identificador físico confiável, isso pode combinar estoques distintos. A proteção contra repetição do mesmo envio é o `clientRequestId`. Uma futura operação explícita de “adicionar ao lote existente” terá contrato e movimento próprios.

`StockMovement`

- `id`, `companyId`, `storeId`, `batchId`, `type` (`INTAKE` neste recorte), `quantityDelta`, `balanceAfter`, `submissionId`, `actorUserId`, `occurredAt`, `reason?`, `createdAt`.
- `@@unique([submissionId])`: uma coleta gera exatamente um movimento inicial.
- CHECKs: `quantity_delta > 0` para `INTAKE` e `balance_after >= 0`.
- O movimento e o saldo do lote nascem na mesma transação. Movimentos são append-only.

#### Auditoria

`AuditEvent`

- `id`, `companyId`, `storeId?`, `actorUserId?`, `action`, `entityType`, `entityId`, `before? Json`, `after? Json`, `clientRequestId?`, `correlationId`, `ipHash?`, `userAgent?`, `createdAt`.
- Índices `(companyId, entityType, entityId, createdAt desc)` e `(companyId, clientRequestId)`.
- O papel de runtime recebe apenas `INSERT` e `SELECT`, nunca `UPDATE` ou `DELETE`.

### 5.3 Migrações e integridade

Prisma é a fonte do modelo, mas constraints que Prisma não expressa devem entrar como SQL na mesma migração:

- CHECKs de quantidade, dinheiro e estado completo da submissão;
- índice funcional de categoria;
- policies RLS;
- grants de auditoria/movimentos append-only;
- triggers apenas se uma invariant não puder ser garantida por constraint ou transação. Não colocar regra de negócio comum em trigger.

Não usar `db push` em ambientes compartilhados. Fluxo: criar migração local, revisar SQL, executar testes numa base vazia e numa cópia anonimizada, aplicar em staging, fazer backup e então promover a mesma migração em produção. Seeds devem criar a versão `PRODUCT_INTAKE/1` e dados de demonstração apenas fora de produção.

## 6. Contratos REST

### 6.1 Convenções HTTP

- Prefixo: `/v1`.
- JSON UTF-8; nomes em `camelCase`.
- `X-Store-Id` obrigatório em rotas de loja.
- `X-Correlation-Id` opcional; se ausente ou inválido, a API gera UUID e sempre o devolve.
- Datas civis são strings `YYYY-MM-DD`; instantes são ISO 8601 com offset/UTC.
- Decimais são strings (`"12.90"`, `"2.500"`) para não perder precisão.
- IDs são UUID.
- Paginação por cursor opaco, nunca offset nas listagens operacionais.
- OpenAPI gerado por decorators e validado no CI; `packages/api-client` é regenerado quando o contrato muda.

### 6.2 Contexto do usuário

`GET /v1/me/context`

Resposta `200`:

```json
{
  "user": { "id": "uuid", "displayName": "Operador" },
  "companies": [
    {
      "id": "uuid",
      "name": "Empresa piloto",
      "role": "STOCK_OPERATOR",
      "stores": [{ "id": "uuid", "name": "Loja 01", "timezone": "America/Fortaleza" }]
    }
  ]
}
```

### 6.3 Consulta do produto

`GET /v1/products/lookup?barcode={valor}&format={EAN_8|EAN_13|UPC_A|UPC_E|INTERNAL}`

Exige `catalog:read` e `X-Store-Id`. O código é normalizado no servidor.

Resposta `200`:

```json
{
  "product": {
    "id": "uuid",
    "name": "Leite integral 1L",
    "brand": "Marca",
    "categoryId": "uuid",
    "unitOfMeasure": "UNIT",
    "packageContent": { "value": "1.000", "unit": "L" },
    "salePrice": { "amount": "6.49", "currency": "BRL" },
    "automaticPromotionEligible": false,
    "version": 1
  },
  "barcode": { "rawValue": "789...", "format": "EAN_13", "canonicalValue": "0..." }
}
```

Código inexistente retorna `404 PRODUCT_NOT_FOUND`. Código malformado ou com dígito verificador inválido retorna `422 INVALID_BARCODE`.

### 6.4 Dados auxiliares

- `GET /v1/questionnaires/product-intake/current` — versão publicada vigente, definição, checksum e `ETag`.
- `GET /v1/categories?active=true` — categorias da empresa selecionada.
- `GET /v1/locations?active=true` — localizações da loja selecionada.

O questionário responde `Cache-Control: private, max-age=300` e suporta `If-None-Match`/`304`. Uma versão já publicada continua consultável em `GET /v1/questionnaires/product-intake/versions/{version}` enquanto estiver suportada.

### 6.5 Envio idempotente da coleta

`POST /v1/intake-submissions`

Exige `batch:create`, `X-Store-Id` e payload de no máximo 64 KiB. Exemplo de produto novo:

```json
{
  "clientRequestId": "0d7026e9-df51-42e5-aa64-bdd5186b45e0",
  "questionnaireVersion": 1,
  "device": {
    "deviceId": "2bee39bc-d06b-4e53-9e1b-1f61eb187251",
    "appVersion": "1.0.0",
    "capturedAt": "2026-08-06T21:10:00Z"
  },
  "barcode": {
    "value": "7891234567895",
    "format": "EAN_13",
    "source": "CAMERA",
    "confirmed": true
  },
  "product": {
    "mode": "CREATE",
    "name": "Leite integral 1L",
    "brand": "Marca",
    "categoryId": "7a0f9b2e-f263-4aa7-a258-e44b903f820d",
    "unitOfMeasure": "UNIT",
    "packageContent": { "value": "1.000", "unit": "L" },
    "salePrice": { "amount": "6.49", "currency": "BRL" },
    "automaticPromotionEligible": false
  },
  "batch": {
    "expiryDate": "2026-08-30",
    "batchNumber": "L2408A",
    "quantity": "12",
    "locationId": "95e57fca-e018-4b67-b5bb-9d68f3b16663",
    "entryDate": "2026-08-06",
    "unitCost": { "amount": "4.20", "currency": "BRL" },
    "observation": null
  }
}
```

Para produto conhecido, `product` muda para:

```json
{
  "mode": "EXISTING",
  "id": "41d93f28-1873-43c8-ac21-34f270c07994",
  "observedVersion": 3
}
```

O servidor reconsulta o código e exige que ele pertença ao produto informado. `observedVersion` é registrado para diagnóstico, mas não bloqueia a criação do lote, pois esta operação não edita o produto.

Resposta original `201`:

```json
{
  "submissionId": "uuid",
  "clientRequestId": "0d7026e9-df51-42e5-aa64-bdd5186b45e0",
  "status": "COMPLETED",
  "product": { "id": "uuid", "created": true, "version": 1 },
  "batch": {
    "id": "uuid",
    "expiryDate": "2026-08-30",
    "quantity": "12.000",
    "locationId": "uuid"
  },
  "initialMovementId": "uuid",
  "completedAt": "2026-08-06T21:10:03.284Z"
}
```

Um replay válido retorna o mesmo corpo com `200` e header `Idempotency-Replayed: true`. A tentativa original responde `Idempotency-Replayed: false`.

### 6.6 Consulta de sincronização

`GET /v1/sync/submissions/{clientRequestId}`

Exige a mesma empresa e, para operador, o mesmo ator da submissão. Gerente/admin com `sync:read:any` pode consultar submissões da loja.

- `200`: devolve o mesmo resultado e `status: COMPLETED`.
- `404 SYNC_SUBMISSION_NOT_FOUND`: não há commit visível para aquela chave no escopo atual.

Neste recorte, a transação é síncrona; não existe estado persistente parcialmente concluído. Um request concorrente com a mesma chave pode aguardar o primeiro commit e então retornar replay.

### 6.7 Consulta pelo site

`GET /v1/batches?cursor=&limit=50&productId=&expiryFrom=&expiryTo=&locationId=&status=`

Exige `batch:read` e `X-Store-Id`. `limit` varia de 1 a 100. Ordenação padrão: `expiryDate ASC, id ASC` (FEFO). Resposta:

```json
{
  "items": [
    {
      "id": "uuid",
      "product": { "id": "uuid", "name": "Leite integral 1L", "barcode": "789..." },
      "batchNumber": "L2408A",
      "expiryDate": "2026-08-30",
      "daysRemaining": 24,
      "quantity": "12.000",
      "location": { "id": "uuid", "code": "GEL-01", "name": "Geladeira 1" },
      "status": "ACTIVE",
      "createdAt": "2026-08-06T21:10:03.284Z"
    }
  ],
  "nextCursor": null
}
```

`daysRemaining` usa `expiryDate - data civil atual da loja`; o relógio do dispositivo não participa. A classificação promocional e jobs diários ficam fora deste recorte.

## 7. Validações e regras de negócio

### 7.1 Validação de entrada

- Ativar `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true` e transformação controlada.
- Rejeitar UUIDs inválidos, strings apenas com espaços, campos desconhecidos e enums desconhecidos.
- `name`: 2–160 caracteres; `brand`: até 100; `batchNumber`: até 80; `observation`: até 500.
- Código: 4–64 caracteres antes da validação específica; `confirmed` deve ser `true`.
- `quantity`: maior que zero e no máximo `999999999999999.999`; inteiro se a unidade do produto for `UNIT`.
- Dinheiro: maior ou igual a zero, no máximo duas casas e moeda `BRL` no piloto.
- `capturedAt` pode estar no passado por operação offline, mas não mais de 90 dias; não é usado como hora de commit.
- `entryDate` ausente assume a data civil atual da loja.
- Operador só pode informar `entryDate` diferente da data atual com `batch:override-entry-date`.
- `expiryDate < entryDate` é rejeitada, salvo se houver `expiryBeforeEntryConfirmation: { confirmed: true, reason: "..." }` e permissão `batch:override-expiry-before-entry`.
- Categoria, localização, produto e questionário devem estar ativos/suportados no mesmo tenant.

### 7.2 Produto novo e concorrência

- `CREATE` exige todos os campos permanentes mínimos.
- A API normaliza o código antes de consultar ou gravar.
- Se outro request criar o mesmo código na empresa antes do commit, a constraint única vence a corrida.
- Se o request concorrente tem outro `clientRequestId`, retornar `409 PRODUCT_ALREADY_EXISTS` com o ID do produto existente apenas quando o ator pode consultá-lo. Não anexar silenciosamente a coleta, porque os dados permanentes podem divergir.
- O cliente deve pedir revisão, mudar para `EXISTING` e criar uma nova tentativa com novo `clientRequestId`.
- Produto conhecido não é atualizado pelo endpoint de coleta. Correções futuras usam `PATCH /products/{id}` com `If-Match`/versão e permissão própria.

### 7.3 Transação da coleta

A transação deve executar, nesta ordem lógica:

1. tentar inserir `IntakeSubmission` com chave, hash e estado interno de processamento;
2. validar novamente questionário, categoria, produto e localização no contexto transacional;
3. criar produto e barcode quando `mode = CREATE`, ou validar vínculo quando `EXISTING`;
4. criar o lote com saldo inicial igual à quantidade;
5. criar o movimento `INTAKE`;
6. persistir as respostas canônicas;
7. inserir eventos de auditoria para produto novo, lote e movimento;
8. completar a submissão e gravar o snapshot da resposta;
9. realizar commit.

Qualquer erro desfaz tudo, inclusive a submissão. Nunca deve existir lote sem movimento inicial, resposta sem submissão, ou produto parcial produzido por uma coleta que falhou.

## 8. Idempotência

### 8.1 Identidade e hash do request

- `clientRequestId` é UUID v4 aleatório gerado pelo cliente uma única vez.
- Escopo de unicidade no banco: `(companyId, clientRequestId)`.
- A chave pertence ao ator que concluiu o primeiro request. Outro ator não pode usar a mesma chave para replay; retorna `403 IDEMPOTENCY_KEY_OWNED` sem revelar o resultado.
- Calcular `requestHash = SHA-256` sobre JSON canônico do método, versão da rota, `companyId`, `storeId` e corpo completo sem `clientRequestId`.
- Usar serialização canônica determinística; ordem de propriedades não altera o hash, mas qualquer valor semântico, inclusive `capturedAt`, altera.

Se a chave já existe:

- mesmo ator, mesma loja e mesmo hash: devolver o resultado persistido, sem executar regra ou escrita novamente;
- mesmo ator e hash diferente: `409 IDEMPOTENCY_KEY_REUSED`;
- mesmo ator, hash igual, mas loja diferente: o hash diverge e retorna o mesmo conflito;
- ator diferente: `403 IDEMPOTENCY_KEY_OWNED`.

### 8.2 Corrida e falha do processo

A inserção da submissão ocorre no início da mesma transação das entidades. A constraint única serializa dois requests simultâneos com a mesma chave. Ao capturar a violação única, o serviço aguarda/consulta a linha vencedora, compara hash e devolve replay.

Se o processo cair antes do commit, PostgreSQL desfaz a submissão e todos os dados; um retry pode executar normalmente. Se a conexão cair depois do commit, o retry ou `GET /sync/submissions/{clientRequestId}` encontra o resultado completo.

Guardar o snapshot do resultado enquanto a submissão existir. Coletas são registros operacionais/auditáveis e não devem ser apagadas pelo fluxo comum. Uma política futura de retenção pode remover apenas metadados técnicos não necessários, nunca lote, movimento ou auditoria.

## 9. Operação offline e sincronização

O cliente mantém uma outbox SQLite. Embora sua implementação seja responsabilidade do aplicativo, a API assume este protocolo:

| Estado local | Significado |
|---|---|
| `DRAFT` | questionário incompleto; ainda não enviável |
| `PENDING` | payload completo, validado localmente e com `clientRequestId` fixo |
| `SENDING` | tentativa em andamento |
| `SYNCED` | API confirmou `201`, replay `200` ou consulta de sync encontrou `COMPLETED` |
| `RETRYABLE_ERROR` | rede, timeout, `408`, `429` ou `5xx` |
| `NEEDS_REVIEW` | erro permanente de validação, conflito de catálogo ou versão não suportada |

Regras do protocolo:

- Payload `PENDING` é imutável. Editar uma tentativa pendente gera novo `clientRequestId` e marca a anterior como substituída localmente.
- Outbox pertence ao usuário autenticado que a criou e só sincroniza quando a mesma identidade e loja estiverem ativas.
- Retry automático usa backoff exponencial com jitter; respeita `Retry-After` em `429`.
- Em `401`, renovar token uma vez; persistindo o erro, parar e pedir login.
- Em timeout/resultado incerto, consultar o endpoint de sync antes de reenviar; reenviar com a mesma chave também é seguro.
- Erros `422`, `403` e conflitos `409` não entram em loop automático.
- A definição do questionário e seu checksum são salvos com o rascunho. Versões publicadas são imutáveis e continuam aceitas durante uma janela mínima de 90 dias, suficiente para o limite de `capturedAt`.
- Se a versão não for mais suportada, retornar `409 QUESTIONNAIRE_VERSION_UNSUPPORTED` com a versão atual; o cliente abre revisão e gera uma nova tentativa depois da migração dos campos.
- Ordenação da outbox é por criação, mas um item em revisão não bloqueia os demais.

## 10. Auditoria e observabilidade

### 10.1 Auditoria

Registrar na mesma transação:

- `PRODUCT_CREATED` quando aplicável;
- `BATCH_CREATED`;
- `STOCK_MOVEMENT_CREATED`;
- `INTAKE_SUBMISSION_COMPLETED`.

Cada evento inclui tenant, ator, entidade, `clientRequestId` e `correlationId`. `before`/`after` deve conter somente campos relevantes; tokens, cabeçalhos de autorização e dados pessoais desnecessários nunca entram no log. IP pode ser armazenado como hash rotacionável, conforme política de privacidade.

Replay idempotente não cria nova auditoria de negócio. Pode incrementar métrica técnica `intake_idempotency_replay_total`.

### 10.2 Logs, métricas e traces

- Logs JSON com `correlationId`, rota, status, latência, `userId`, `companyId` e `storeId`; nunca logar JWT ou payload completo.
- OpenTelemetry no HTTP, Prisma e transação de coleta.
- Métricas mínimas: latência e erros por rota, conexões do pool, `intake_submissions_total`, `intake_failures_total{code}`, `intake_idempotency_replay_total`, `barcode_lookup_total{found}`, duração da transação.
- Alertas: taxa de `5xx`, indisponibilidade do banco, pool saturado e crescimento de latência.
- SLO do piloto: 95% das consultas de código abaixo de 1 segundo e 95% dos requests comuns abaixo de 2 segundos, descontando câmera e rede do dispositivo.

## 11. Tratamento de erros

Envelope único:

```json
{
  "error": {
    "code": "LOCATION_NOT_FOUND",
    "message": "Localização não encontrada.",
    "fields": [{ "path": "batch.locationId", "code": "INVALID_REFERENCE" }],
    "retryable": false,
    "correlationId": "uuid"
  }
}
```

| HTTP | Uso |
|---|---|
| `400` | JSON inválido ou header obrigatório ausente |
| `401` | token ausente, inválido ou expirado |
| `403` | identidade válida, mas sem permissão |
| `404` | recurso não existe no tenant ou não pode ser revelado |
| `409` | conflito de barcode, chave idempotente ou versão de questionário |
| `422` | DTO ou regra de negócio inválida |
| `429` | rate limit, com `Retry-After` |
| `500` | erro inesperado, sem detalhes internos |
| `503` | dependência indisponível ou readiness falha |

Mapear erros de unicidade conhecidos para códigos de domínio. Nunca retornar mensagem SQL, stack trace ou nome de constraint ao cliente. `retryable` só é verdadeiro para condições realmente transitórias.

## 12. Segurança operacional

- HTTPS obrigatório e HSTS no gateway.
- CORS apenas para origens web autorizadas; aplicativo nativo não depende de CORS.
- Limite inicial configurável: consulta de código 120/minuto por usuário; submissão 30/minuto por usuário/dispositivo; endpoints de contexto 60/minuto.
- Limite de corpo 64 KiB; fotos não entram no payload e usarão upload separado no futuro.
- Segredos apenas no gerenciador do ambiente; rotação de chave e credencial de banco documentada.
- Banco não exposto publicamente; TLS na conexão e backups criptografados.
- MFA recomendado para admin/gerente no provedor de identidade.
- Dependências e imagem de container verificadas no CI.
- Readiness falha quando a API não consegue executar consulta simples no PostgreSQL; liveness não depende de serviços externos.

## 13. Estratégia de testes

### 13.1 Testes unitários

- Normalização e dígito verificador de EAN-8, EAN-13, UPC-A e UPC-E.
- Canonicalização e hash idempotente, incluindo ordens diferentes de propriedades.
- Datas civis no fuso da loja e validação de validade/entrada.
- Permissões por papel e campos restritos.
- Validação de quantidade por unidade de medida e decimais monetários.

### 13.2 Integração com PostgreSQL real

Usar Testcontainers ou banco efêmero PostgreSQL; SQLite não substitui estes testes.

- Migração sobe do zero e seeds são repetíveis.
- Produto, lote, movimento, respostas, submissão e auditoria são criados juntos.
- Falha injetada antes do commit deixa zero registros parciais.
- Dez requests concorrentes com mesma chave/corpo criam exatamente um lote e um movimento; os demais são replay.
- Mesma chave com corpo diferente retorna `409` e não altera dados.
- Dois requests com chaves diferentes e o mesmo barcode novo produzem um produto; o perdedor recebe conflito sem lote parcial.
- Constraint impede barcode duplicado na empresa e permite o mesmo barcode em empresas diferentes.
- FK composta impede lote apontar para produto/localização de outro tenant.
- RLS bloqueia leitura e escrita cruzada mesmo quando um filtro da aplicação é omitido intencionalmente no teste.
- Movimento e auditoria não podem ser atualizados/apagados pelo papel runtime.

### 13.3 Contrato e e2e da API

- OpenAPI passa por lint e breaking-change check.
- Cliente gerado compila para mobile e web.
- Fluxos conhecidos e desconhecidos exercitam `lookup -> auxiliares -> submission -> sync -> batches`.
- 401/403/404 não revelam tenant.
- Replay preserva o corpo do resultado e não duplica auditoria.
- Paginação por cursor não perde nem repete lote com ordenação estável.
- Datas e decimais mantêm formato exato no round trip.

## 14. Critérios de aceite técnicos

O backend do primeiro recorte está aprovado quando:

1. um usuário autenticado só enxerga empresas e lojas autorizadas;
2. o mesmo barcode pode existir em empresas diferentes, mas não aponta para dois produtos ativos na mesma empresa;
3. produto conhecido é retornado com dados permanentes pela API;
4. produto desconhecido retorna contrato estável para o fluxo de cadastro;
5. uma coleta válida cria produto quando necessário, lote, entrada de estoque, respostas e auditoria em um único commit;
6. dois lotes do mesmo produto podem ter validade e localização diferentes;
7. nenhum código comum é tratado como identificador de lote;
8. repetir o mesmo `clientRequestId` com o mesmo conteúdo não cria duplicidade;
9. reutilizar a chave com conteúdo diferente falha de forma determinística;
10. timeout após commit pode ser reconciliado pelo endpoint de sync;
11. dados de uma coleta aparecem imediatamente no endpoint consumido pelo site;
12. quantidade negativa, referências cruzadas e datas inválidas são bloqueadas no serviço e, quando aplicável, no banco;
13. testes concorrentes e multiempresa passam contra PostgreSQL real;
14. a API publica OpenAPI e o CI confirma que o client gerado compila;
15. logs e erros possuem correlação sem expor token ou detalhes internos.

## 15. Riscos e decisões conscientes

| Risco/decisão | Tratamento |
|---|---|
| Dois registros físicos sem número de lote podem parecer iguais | Não fundir semanticamente no primeiro recorte; idempotência resolve repetição técnica, não ambiguidade física |
| Produto criado em corrida por outro operador | Constraint de barcode e conflito explícito para revisão |
| Questionário muda enquanto aparelho está offline | Versões imutáveis e janela de suporte de 90 dias |
| Uso de RLS com Prisma/pool | Contexto somente dentro de transação e testes de vazamento; papel runtime sem bypass |
| Preço/elegibilidade informados por operador | Preço auditado; elegibilidade automática só pode ser ativada por permissão elevada |
| `capturedAt` adulterado no dispositivo | Mantido apenas para rastreio; regras e auditoria usam tempo do servidor e data local da loja |
| Código GTIN não carrega lote | Produto e lote permanecem entidades separadas; suporte GS1 avançado é evolução posterior |

## 16. Handoff para implementação do backend

Ordem recomendada para Hefesto:

1. criar workspace de API e `packages/database` sem tocar nas decisões de frontend;
2. implementar schema Prisma, SQL complementar, migrations e seeds;
3. implementar identidade, tenancy, contexto transacional e testes de RLS primeiro;
4. implementar catálogo, normalização de barcode, questionário e localizações;
5. implementar `intake` como orquestrador transacional e idempotente;
6. implementar leitura de lotes e endpoint de sync;
7. gerar OpenAPI e `api-client`;
8. adicionar testes unitários, integração PostgreSQL, concorrência, tenant e e2e;
9. submeter para revisão de Argos com evidências dos testes, plano de migração e exemplos de resposta.

Não antecipar neste recorte motor de promoções, etiquetas, importação de PDV, jobs diários, upload de fotos, atualização de estoque existente ou formulário arbitrariamente dinâmico. Esses itens devem evoluir como módulos/contratos próprios depois de o fluxo vertical estar validado.
