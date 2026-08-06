# ValidaGiro

Monorepo do aplicativo de leitura e coleta de validade. O backend é uma API NestJS única, com Prisma/PostgreSQL, consumida pelo aplicativo e futuramente pelo site.

## Pré-requisitos

- Node.js 22 ou superior
- pnpm 11
- Docker para o PostgreSQL local e para executar a bateria de integração

## Executar a API localmente

1. Copie `apps/api/.env.example` para `apps/api/.env`. O `.env.example` da raiz também contém as variáveis opcionais do Docker Compose.
2. Inicie o PostgreSQL: `docker compose up -d postgres`. Na primeira criação do volume, o bootstrap cria `validagiro_owner` e o login separado `validagiro_runtime`, sem `SUPERUSER` nem `BYPASSRLS`.
3. Instale as dependências: `pnpm install`.
4. Gere o Prisma Client e aplique as migrações: `pnpm db:generate && pnpm db:migrate`.
5. Popule os dados de demonstração: `pnpm db:seed`.
6. Inicie: `pnpm dev`.

A API fica em `http://localhost:3000/v1`, a documentação OpenAPI em `http://localhost:3000/docs` e os health checks em `http://localhost:3000/health/live` e `/health/ready`.

No desenvolvimento, envie `X-Dev-Auth-Subject: dev-user-geovanni`. Essa autenticação só é aceita quando `NODE_ENV` é `development`/`test` **e** `DEV_AUTH_ENABLED=true`; o processo recusa essa combinação em produção. Use também o `X-Store-Id` impresso pelo seed.

Em staging/produção, configure `JWT_ISSUER`, `JWT_AUDIENCE` e `JWT_JWKS_URI` e use TLS. `DATABASE_URL` pertence ao papel `validagiro_runtime`; `DIRECT_DATABASE_URL` pertence ao owner de migrações e só deve existir em jobs de migração/seed. A migração força RLS, aplica grants mínimos e revoga mutações das tabelas append-only. O papel runtime nunca pode receber `SUPERUSER`, `BYPASSRLS` ou ownership. Não use `prisma db push` em ambientes compartilhados.

As resoluções pré-tenant de loja e colisão idempotente usam funções `SECURITY DEFINER` com retorno mínimo. Elas pertencem ao papel sem login `validagiro_rls_resolver`; `PUBLIC` não possui `EXECUTE`, e o runtime só recebe execução dessas duas funções. O resolver nunca devolve dados sem uma membership ativa correspondente a `app.user_subject`.

## Verificação

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contracts:generate
pnpm contracts:lint
pnpm audit --prod --audit-level high
```

Testes que requerem PostgreSQL usam `TEST_DATABASE_URL` (owner descartável) e `RUNTIME_DATABASE_URL` (papel real sem bypass). Para executá-los, aplique antes as migrações e o seed nessa base descartável e rode `pnpm --filter @validagiro/api test:integration`. A CI sempre fornece PostgreSQL e executa essa suíte; nela, ausência dessas URLs não é permitida pelo workflow. A suíte cobre migração/seed repetível, rollback, concorrência idempotente, FKs multiempresa, RLS e tabelas append-only.

O OpenAPI versionado é gerado em `packages/contracts/openapi.json`; `packages/contracts/src/generated-api.ts` é o client type-safe gerado e compilado junto aos contratos Zod. Regere ambos com `pnpm contracts:generate` sempre que uma rota mudar.

Se o volume Docker já existia antes da criação do bootstrap de papéis, remova somente esse volume de desenvolvimento de forma consciente e recrie-o, ou provisione `validagiro_runtime` manualmente antes da migração. Nunca reutilize as senhas de exemplo fora da máquina local.
