-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('COMPANY_ADMIN', 'STORE_MANAGER', 'STOCK_OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "BarcodeFormat" AS ENUM ('EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'INTERNAL');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('UNIT', 'KG', 'G', 'L', 'ML');

-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AnswerSection" AS ENUM ('PRODUCT', 'BATCH', 'META');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'EXPIRED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INTAKE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_subject" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "all_stores" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_stores" (
    "membership_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,

    CONSTRAINT "membership_stores_pkey" PRIMARY KEY ("membership_id","store_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "brand" VARCHAR(100),
    "unit_of_measure" "UnitOfMeasure" NOT NULL,
    "package_content_value" DECIMAL(18,3),
    "package_content_unit" VARCHAR(16),
    "sale_price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "automatic_promotion_eligible" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "format" "BarcodeFormat" NOT NULL,
    "raw_value" VARCHAR(64) NOT NULL,
    "canonical_value" VARCHAR(64) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_versions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "supported_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "questionnaire_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_submissions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "questionnaire_version_id" UUID NOT NULL,
    "client_request_id" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PROCESSING',
    "device_id" UUID NOT NULL,
    "device_app_version" VARCHAR(32) NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "product_id" UUID,
    "batch_id" UUID,
    "initial_movement_id" UUID,
    "response_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "intake_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_answers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "question_key" VARCHAR(100) NOT NULL,
    "section" "AnswerSection" NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "batch_number" VARCHAR(80),
    "normalized_batch_number" VARCHAR(80),
    "expiry_date" DATE NOT NULL,
    "entry_date" DATE NOT NULL,
    "received_quantity" DECIMAL(18,3) NOT NULL,
    "current_quantity" DECIMAL(18,3) NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "currency" CHAR(3),
    "observation" VARCHAR(500),
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity_delta" DECIMAL(18,3) NOT NULL,
    "balance_after" DECIMAL(18,3) NOT NULL,
    "submission_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "store_id" UUID,
    "actor_user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "client_request_id" UUID,
    "correlation_id" UUID NOT NULL,
    "ip_hash" VARCHAR(128),
    "user_agent" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");

-- CreateIndex
CREATE INDEX "stores_company_id_status_idx" ON "stores"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stores_id_company_id_key" ON "stores"("id", "company_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_company_id_user_id_key" ON "memberships"("company_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_id_company_id_key" ON "memberships"("id", "company_id");

-- CreateIndex
CREATE INDEX "membership_stores_store_id_company_id_idx" ON "membership_stores"("store_id", "company_id");

-- CreateIndex
CREATE INDEX "categories_company_id_active_idx" ON "categories"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_company_id_key" ON "categories"("id", "company_id");

-- CreateIndex
CREATE INDEX "products_company_id_active_idx" ON "products"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "products_id_company_id_key" ON "products"("id", "company_id");

-- CreateIndex
CREATE INDEX "product_barcodes_company_id_product_id_active_idx" ON "product_barcodes"("company_id", "product_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_company_id_canonical_value_key" ON "product_barcodes"("company_id", "canonical_value");

-- CreateIndex
CREATE INDEX "questionnaire_versions_code_status_version_idx" ON "questionnaire_versions"("code", "status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_versions_code_version_key" ON "questionnaire_versions"("code", "version");

-- CreateIndex
CREATE INDEX "locations_company_id_store_id_active_idx" ON "locations"("company_id", "store_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "locations_company_id_store_id_code_key" ON "locations"("company_id", "store_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_id_company_id_store_id_key" ON "locations"("id", "company_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_batch_id_key" ON "intake_submissions"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_initial_movement_id_key" ON "intake_submissions"("initial_movement_id");

-- CreateIndex
CREATE INDEX "intake_submissions_company_id_store_id_received_at_idx" ON "intake_submissions"("company_id", "store_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "intake_submissions_company_id_actor_user_id_received_at_idx" ON "intake_submissions"("company_id", "actor_user_id", "received_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_company_id_client_request_id_key" ON "intake_submissions"("company_id", "client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_id_company_id_key" ON "intake_submissions"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_id_company_id_store_id_key" ON "intake_submissions"("id", "company_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_batch_id_company_id_store_id_key" ON "intake_submissions"("batch_id", "company_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submissions_initial_movement_id_company_id_store_id_key" ON "intake_submissions"("initial_movement_id", "company_id", "store_id");

-- CreateIndex
CREATE INDEX "intake_answers_company_id_submission_id_idx" ON "intake_answers"("company_id", "submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_answers_submission_id_question_key_key" ON "intake_answers"("submission_id", "question_key");

-- CreateIndex
CREATE INDEX "batches_company_id_store_id_expiry_date_status_idx" ON "batches"("company_id", "store_id", "expiry_date", "status");

-- CreateIndex
CREATE INDEX "batches_company_id_store_id_product_id_expiry_date_idx" ON "batches"("company_id", "store_id", "product_id", "expiry_date");

-- CreateIndex
CREATE INDEX "batches_company_id_store_id_location_id_status_idx" ON "batches"("company_id", "store_id", "location_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "batches_id_company_id_store_id_key" ON "batches"("id", "company_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_submission_id_key" ON "stock_movements"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_id_company_id_store_id_key" ON "stock_movements"("id", "company_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_submission_id_company_id_store_id_key" ON "stock_movements"("submission_id", "company_id", "store_id");

-- CreateIndex
CREATE INDEX "stock_movements_company_id_store_id_batch_id_occurred_at_idx" ON "stock_movements"("company_id", "store_id", "batch_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_company_id_entity_type_entity_id_created_at_idx" ON "audit_events"("company_id", "entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_company_id_client_request_id_idx" ON "audit_events"("company_id", "client_request_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_stores" ADD CONSTRAINT "membership_stores_membership_id_company_id_fkey" FOREIGN KEY ("membership_id", "company_id") REFERENCES "memberships"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_stores" ADD CONSTRAINT "membership_stores_store_id_company_id_fkey" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_company_id_fkey" FOREIGN KEY ("category_id", "company_id") REFERENCES "categories"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_company_id_fkey" FOREIGN KEY ("product_id", "company_id") REFERENCES "products"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_store_id_company_id_fkey" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_store_id_company_id_fkey" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_questionnaire_version_id_fkey" FOREIGN KEY ("questionnaire_version_id") REFERENCES "questionnaire_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_product_id_company_id_fkey" FOREIGN KEY ("product_id", "company_id") REFERENCES "products"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_batch_id_company_id_store_id_fkey" FOREIGN KEY ("batch_id", "company_id", "store_id") REFERENCES "batches"("id", "company_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_initial_movement_id_company_id_store_id_fkey" FOREIGN KEY ("initial_movement_id", "company_id", "store_id") REFERENCES "stock_movements"("id", "company_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_answers" ADD CONSTRAINT "intake_answers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_answers" ADD CONSTRAINT "intake_answers_submission_id_company_id_fkey" FOREIGN KEY ("submission_id", "company_id") REFERENCES "intake_submissions"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_store_id_company_id_fkey" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_product_id_company_id_fkey" FOREIGN KEY ("product_id", "company_id") REFERENCES "products"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_location_id_company_id_store_id_fkey" FOREIGN KEY ("location_id", "company_id", "store_id") REFERENCES "locations"("id", "company_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_store_id_company_id_fkey" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_company_id_store_id_fkey" FOREIGN KEY ("batch_id", "company_id", "store_id") REFERENCES "batches"("id", "company_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_submission_id_company_id_store_id_fkey" FOREIGN KEY ("submission_id", "company_id", "store_id") REFERENCES "intake_submissions"("id", "company_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_store_id_company_id_fkey" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity rules not expressible in Prisma's schema language.
CREATE UNIQUE INDEX "categories_company_name_ci_key" ON "categories" ("company_id", lower("name"));
ALTER TABLE "products" ADD CONSTRAINT "products_sale_price_nonnegative" CHECK ("sale_price" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_currency_brl" CHECK ("currency" = 'BRL');
ALTER TABLE "products" ADD CONSTRAINT "products_package_content_pair" CHECK (("package_content_value" IS NULL) = ("package_content_unit" IS NULL));
ALTER TABLE "batches" ADD CONSTRAINT "batches_received_quantity_positive" CHECK ("received_quantity" > 0);
ALTER TABLE "batches" ADD CONSTRAINT "batches_current_quantity_nonnegative" CHECK ("current_quantity" >= 0);
ALTER TABLE "batches" ADD CONSTRAINT "batches_unit_cost_nonnegative" CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0);
ALTER TABLE "batches" ADD CONSTRAINT "batches_currency_pair" CHECK (("unit_cost" IS NULL AND "currency" IS NULL) OR ("unit_cost" IS NOT NULL AND "currency" = 'BRL'));
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_intake_positive" CHECK ("type" <> 'INTAKE' OR "quantity_delta" > 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_balance_nonnegative" CHECK ("balance_after" >= 0);
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_completed_has_result" CHECK (
  "status" <> 'COMPLETED' OR
  ("completed_at" IS NOT NULL AND "product_id" IS NOT NULL AND "batch_id" IS NOT NULL AND "initial_movement_id" IS NOT NULL AND "response_snapshot" IS NOT NULL)
);

CREATE FUNCTION prevent_published_questionnaire_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'PUBLISHED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'published questionnaire versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER questionnaire_versions_immutable
BEFORE UPDATE ON "questionnaire_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_published_questionnaire_mutation();

-- A concrete runtime role is deliberately different from the migration owner.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'validagiro_runtime') THEN
    CREATE ROLE validagiro_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'validagiro_rls_resolver') THEN
    CREATE ROLE validagiro_rls_resolver NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO validagiro_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM validagiro_runtime;
GRANT SELECT ON "users", "companies", "stores", "memberships", "membership_stores", "questionnaire_versions" TO validagiro_runtime;
GRANT SELECT ON "categories", "products", "product_barcodes", "locations", "intake_submissions", "intake_answers", "batches", "stock_movements", "audit_events" TO validagiro_runtime;
GRANT INSERT, UPDATE ON "products", "product_barcodes", "intake_submissions", "batches" TO validagiro_runtime;
GRANT INSERT ON "intake_answers", "stock_movements", "audit_events" TO validagiro_runtime;
REVOKE UPDATE, DELETE ON "stock_movements", "audit_events" FROM validagiro_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM validagiro_rls_resolver;
GRANT SELECT ON "users", "companies", "stores", "memberships", "membership_stores", "intake_submissions" TO validagiro_rls_resolver;

-- Narrow resolvers are the only code executed with the non-login BYPASSRLS role.
-- They return no row unless app.user_subject has an active company membership.
CREATE FUNCTION resolve_store_access(p_store_id uuid)
RETURNS TABLE (
  store_id uuid, company_id uuid, store_name varchar, store_timezone varchar,
  store_status "RecordStatus", company_status "RecordStatus",
  membership_id uuid, membership_role "MembershipRole", assigned boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT s.id, s.company_id, s.name, s.timezone, s.status, c.status,
         m.id, m.role,
         (m.all_stores OR EXISTS (
           SELECT 1 FROM public.membership_stores ms
           WHERE ms.membership_id = m.id AND ms.company_id = m.company_id AND ms.store_id = s.id
         ))
  FROM public.stores s
  JOIN public.companies c ON c.id = s.company_id
  JOIN public.memberships m ON m.company_id = s.company_id AND m.status = 'ACTIVE'
  JOIN public.users u ON u.id = m.user_id AND u.status = 'ACTIVE'
  WHERE s.id = p_store_id
    AND u.auth_subject = current_setting('app.user_subject', true)
  LIMIT 1
$$;

CREATE FUNCTION resolve_intake_idempotency(p_company_id uuid, p_client_request_id uuid)
RETURNS TABLE (actor_user_id uuid, store_id uuid, request_hash char(64), submission_status "SubmissionStatus")
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT s.actor_user_id, s.store_id, s.request_hash, s.status
  FROM public.intake_submissions s
  JOIN public.memberships m ON m.company_id = s.company_id AND m.status = 'ACTIVE'
  JOIN public.users u ON u.id = m.user_id AND u.status = 'ACTIVE'
  WHERE s.company_id = p_company_id
    AND s.client_request_id = p_client_request_id
    AND u.auth_subject = current_setting('app.user_subject', true)
  LIMIT 1
$$;

ALTER FUNCTION resolve_store_access(uuid) OWNER TO validagiro_rls_resolver;
ALTER FUNCTION resolve_intake_idempotency(uuid, uuid) OWNER TO validagiro_rls_resolver;
REVOKE ALL ON FUNCTION resolve_store_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION resolve_intake_idempotency(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_store_access(uuid) TO validagiro_runtime;
GRANT EXECUTE ON FUNCTION resolve_intake_idempotency(uuid, uuid) TO validagiro_runtime;

-- Initial identity resolution is restricted by app.user_subject. No tenant id
-- supplied by a client is trusted before membership/store resolution succeeds.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY; ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY; ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY; ALTER TABLE "stores" FORCE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY; ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
ALTER TABLE "membership_stores" ENABLE ROW LEVEL SECURITY; ALTER TABLE "membership_stores" FORCE ROW LEVEL SECURITY;

CREATE POLICY users_identity ON "users" FOR SELECT USING ("auth_subject" = current_setting('app.user_subject', true));
CREATE POLICY memberships_identity ON "memberships" FOR SELECT USING (
  "user_id" IN (SELECT "id" FROM "users" WHERE "auth_subject" = current_setting('app.user_subject', true))
);
CREATE POLICY membership_stores_identity ON "membership_stores" FOR SELECT USING (
  "membership_id" IN (SELECT "id" FROM "memberships")
);
CREATE POLICY companies_identity ON "companies" FOR SELECT USING (
  "id" IN (SELECT "company_id" FROM "memberships" WHERE "status" = 'ACTIVE')
);
CREATE POLICY stores_identity ON "stores" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "memberships" m
    WHERE m."company_id" = "stores"."company_id" AND m."status" = 'ACTIVE'
      AND (m."all_stores" OR EXISTS (
        SELECT 1 FROM "membership_stores" ms WHERE ms."membership_id" = m."id" AND ms."store_id" = "stores"."id"
      ))
  )
);

-- Operational tables require transaction-local company/store context.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY; ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY; ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
ALTER TABLE "product_barcodes" ENABLE ROW LEVEL SECURITY; ALTER TABLE "product_barcodes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY; ALTER TABLE "locations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "intake_submissions" ENABLE ROW LEVEL SECURITY; ALTER TABLE "intake_submissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "intake_answers" ENABLE ROW LEVEL SECURITY; ALTER TABLE "intake_answers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "batches" ENABLE ROW LEVEL SECURITY; ALTER TABLE "batches" FORCE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY; ALTER TABLE "stock_movements" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY; ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY categories_tenant ON "categories" USING ("company_id"::text = current_setting('app.company_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true));
CREATE POLICY products_tenant ON "products" USING ("company_id"::text = current_setting('app.company_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true));
CREATE POLICY product_barcodes_tenant ON "product_barcodes" USING ("company_id"::text = current_setting('app.company_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true));
CREATE POLICY intake_answers_tenant ON "intake_answers" USING ("company_id"::text = current_setting('app.company_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true));
CREATE POLICY locations_tenant_store ON "locations" USING ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true));
CREATE POLICY intake_submissions_tenant_store ON "intake_submissions" USING ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true));
CREATE POLICY batches_tenant_store ON "batches" USING ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true));
CREATE POLICY stock_movements_tenant_store ON "stock_movements" USING ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true)) WITH CHECK ("company_id"::text = current_setting('app.company_id', true) AND "store_id"::text = current_setting('app.store_id', true));
CREATE POLICY audit_events_tenant_store ON "audit_events" USING ("company_id"::text = current_setting('app.company_id', true) AND ("store_id" IS NULL OR "store_id"::text = current_setting('app.store_id', true))) WITH CHECK ("company_id"::text = current_setting('app.company_id', true) AND ("store_id" IS NULL OR "store_id"::text = current_setting('app.store_id', true)));

CREATE FUNCTION prevent_append_only_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'append-only table cannot be mutated'; END;
$$;
CREATE TRIGGER stock_movements_append_only BEFORE UPDATE OR DELETE ON "stock_movements" FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
