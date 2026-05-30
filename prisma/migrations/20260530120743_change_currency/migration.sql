-- Rename IRR → IRT in Currency enum, migrating all existing data
BEGIN;
CREATE TYPE "Currency_new" AS ENUM ('USD', 'EUR', 'GBP', 'IRT', 'TRY');
ALTER TABLE "public"."Relationship" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "public"."SplitSession" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Relationship" ALTER COLUMN "currency" TYPE "Currency_new"
  USING (CASE WHEN "currency"::text = 'IRR' THEN 'IRT' ELSE "currency"::text END)::"Currency_new";
ALTER TABLE "SplitSession" ALTER COLUMN "currency" TYPE "Currency_new"
  USING (CASE WHEN "currency"::text = 'IRR' THEN 'IRT' ELSE "currency"::text END)::"Currency_new";
ALTER TYPE "Currency" RENAME TO "Currency_old";
ALTER TYPE "Currency_new" RENAME TO "Currency";
DROP TYPE "public"."Currency_old";
ALTER TABLE "Relationship" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "SplitSession" ALTER COLUMN "currency" SET DEFAULT 'USD';
COMMIT;
