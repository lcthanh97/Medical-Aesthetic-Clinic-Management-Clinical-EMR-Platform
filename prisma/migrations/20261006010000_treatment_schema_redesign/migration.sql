-- Treatment workflow redesign from ChinhsuaDB.docx.
-- This migration preserves the existing treatment plans and steps by moving
-- each legacy plan into a generated first stage.

BEGIN;

-- Existing sessions and auxiliary treatment tables are empty in production.
ALTER TABLE "EquipmentUsage" DROP CONSTRAINT IF EXISTS "EquipmentUsage_treatmentSessionId_fkey";
DROP TABLE IF EXISTS "TreatmentStepExecution" CASCADE;
DROP TABLE IF EXISTS "TreatmentSupplyUsage" CASCADE;
DROP TABLE IF EXISTS "TreatmentSupplyNorm" CASCADE;
DROP TABLE IF EXISTS "SkinImage" CASCADE;
DROP TABLE IF EXISTS "TreatmentSession" CASCADE;
DROP TABLE IF EXISTS "MedicineTransaction" CASCADE;
DROP TABLE IF EXISTS "SupplyTransaction" CASCADE;
DROP TABLE IF EXISTS "InteractionAlert" CASCADE;
DROP TABLE IF EXISTS "InteractionRule" CASCADE;

-- Historical plans do not have an author. A technical employee preserves the
-- NOT NULL audit invariant without assigning them to a real clinician.
INSERT INTO "Employee" ("id", "employeeCode", "fullName")
VALUES ('migration-system-employee', 'SYSTEM-MIGRATION', 'System Migration')
ON CONFLICT ("employeeCode") DO NOTHING;

CREATE TABLE "TreatmentProtocolTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "indication" TEXT,
  "contraindication" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreatmentProtocolTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreatmentProtocolTemplate_code_version_key"
  ON "TreatmentProtocolTemplate"("code", "version");

CREATE TABLE "ProtocolStageTemplate" (
  "id" TEXT NOT NULL,
  "protocolId" TEXT NOT NULL,
  "stageType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "orderNo" INTEGER NOT NULL,
  "goal" TEXT,
  "durationDays" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProtocolStageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProtocolStageTemplate_protocolId_orderNo_key"
  ON "ProtocolStageTemplate"("protocolId", "orderNo");

CREATE TABLE "ProcedureCatalog" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "defaultDurationMinutes" INTEGER,
  "basePrice" DECIMAL(65,30),
  "requiresConsent" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProcedureCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcedureCatalog_code_key" ON "ProcedureCatalog"("code");

CREATE TABLE "ProtocolStepTemplate" (
  "id" TEXT NOT NULL,
  "stageTemplateId" TEXT NOT NULL,
  "procedureId" TEXT,
  "orderNo" INTEGER NOT NULL,
  "instruction" TEXT NOT NULL,
  "repeatCount" INTEGER NOT NULL DEFAULT 1,
  "intervalDays" INTEGER,
  "plannedDurationMinutes" INTEGER,
  "defaultParameters" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProtocolStepTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProtocolStepTemplate_stageTemplateId_orderNo_key"
  ON "ProtocolStepTemplate"("stageTemplateId", "orderNo");

ALTER TABLE "TreatmentPlan"
  ADD COLUMN "patientId" TEXT,
  ADD COLUMN "protocolTemplateId" TEXT,
  ADD COLUMN "diagnosisSummary" TEXT,
  ADD COLUMN "goal" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "expectedEndDate" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "TreatmentPlan" p
SET "patientId" = v."patientId",
    "createdById" = COALESCE(v."employeeId", 'migration-system-employee'),
    "status" = CASE
      WHEN lower(p."status") LIKE '%đang%' THEN 'ACTIVE'
      WHEN lower(p."status") LIKE '%hoàn%' THEN 'COMPLETED'
      WHEN lower(p."status") LIKE '%hủy%' THEN 'CANCELLED'
      ELSE 'DRAFT'
    END
FROM "Visit" v
WHERE v."id" = p."visitId";

ALTER TABLE "TreatmentPlan"
  ALTER COLUMN "patientId" SET NOT NULL,
  ALTER COLUMN "createdById" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "TreatmentStage" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "stageType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "orderNo" INTEGER NOT NULL,
  "goal" TEXT,
  "plannedStartDate" TIMESTAMP(3),
  "plannedEndDate" TIMESTAMP(3),
  "actualStartDate" TIMESTAMP(3),
  "actualEndDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreatmentStage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreatmentStage_planId_orderNo_key" ON "TreatmentStage"("planId", "orderNo");
CREATE INDEX "TreatmentStage_planId_status_idx" ON "TreatmentStage"("planId", "status");
CREATE UNIQUE INDEX "TreatmentStage_one_in_progress_per_plan"
  ON "TreatmentStage"("planId") WHERE "status" = 'IN_PROGRESS';

INSERT INTO "TreatmentStage" (
  "id", "planId", "stageType", "name", "orderNo", "status", "createdAt", "updatedAt"
)
SELECT
  p."id" || '-stage-1',
  p."id",
  CASE
    WHEN lower(p."stage") LIKE '%tấn%' THEN 'ATTACK'
    WHEN lower(p."stage") LIKE '%phục hồi%' THEN 'RECOVERY'
    ELSE 'MAINTENANCE'
  END,
  COALESCE(NULLIF(p."stage", ''), 'Giai đoạn 1'),
  1,
  CASE WHEN p."status" = 'ACTIVE' THEN 'IN_PROGRESS' ELSE 'PENDING' END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TreatmentPlan" p;

ALTER TABLE "TreatmentStep" RENAME TO "_TreatmentStepLegacy";
ALTER TABLE "_TreatmentStepLegacy" RENAME CONSTRAINT "TreatmentStep_pkey" TO "_TreatmentStepLegacy_pkey";

CREATE TABLE "TreatmentStep" (
  "id" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "procedureId" TEXT,
  "orderNo" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "repeatCount" INTEGER NOT NULL DEFAULT 1,
  "intervalDays" INTEGER,
  "plannedDurationMinutes" INTEGER,
  "defaultParameters" JSONB,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreatmentStep_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TreatmentStep" (
  "id", "stageId", "orderNo", "content", "status", "createdAt", "updatedAt"
)
SELECT
  s."id",
  s."planId" || '-stage-1',
  row_number() OVER (PARTITION BY s."planId" ORDER BY s."orderNo", s."id")::int,
  s."content",
  CASE
    WHEN lower(s."status") LIKE '%đang%' THEN 'IN_PROGRESS'
    WHEN lower(s."status") LIKE '%hoàn%' THEN 'COMPLETED'
    WHEN lower(s."status") LIKE '%hủy%' THEN 'CANCELLED'
    ELSE 'PENDING'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_TreatmentStepLegacy" s;

DROP TABLE "_TreatmentStepLegacy" CASCADE;
CREATE UNIQUE INDEX "TreatmentStep_stageId_orderNo_key" ON "TreatmentStep"("stageId", "orderNo");

ALTER TABLE "TreatmentPlan" DROP CONSTRAINT IF EXISTS "TreatmentPlan_serviceId_fkey";
ALTER TABLE "TreatmentPlan" DROP COLUMN "serviceId", DROP COLUMN "stage";

CREATE INDEX "TreatmentPlan_patientId_status_idx" ON "TreatmentPlan"("patientId", "status");
CREATE INDEX "TreatmentPlan_visitId_idx" ON "TreatmentPlan"("visitId");

CREATE TABLE "TreatmentSession" (
  "id" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "stepId" TEXT,
  "visitId" TEXT NOT NULL,
  "sessionNo" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "performedById" TEXT,
  "treatmentArea" TEXT,
  "clinicalNotes" TEXT,
  "patientResponse" TEXT,
  "adverseReaction" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreatmentSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreatmentSession_stageId_sessionNo_key" ON "TreatmentSession"("stageId", "sessionNo");
CREATE INDEX "TreatmentSession_visitId_status_idx" ON "TreatmentSession"("visitId", "status");

CREATE TABLE "TreatmentImage" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "sessionId" TEXT,
  "visitId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "imageType" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "bodyArea" TEXT,
  "description" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "capturedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreatmentImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TreatmentImage_planId_capturedAt_idx" ON "TreatmentImage"("planId", "capturedAt");

-- Normalize medicine ingredients before dropping the legacy text column.
CREATE TABLE "ActiveIngredient" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActiveIngredient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActiveIngredient_code_key" ON "ActiveIngredient"("code");
CREATE UNIQUE INDEX "ActiveIngredient_name_key" ON "ActiveIngredient"("name");

CREATE TABLE "MedicineIngredient" (
  "medicineId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "concentration" DECIMAL(65,30),
  "concentrationUnit" TEXT,
  CONSTRAINT "MedicineIngredient_pkey" PRIMARY KEY ("medicineId", "ingredientId")
);

INSERT INTO "ActiveIngredient" ("id", "code", "name", "updatedAt")
SELECT
  'legacy-' || md5(lower(trim("activeIngredient"))),
  'LEGACY-' || upper(substr(md5(lower(trim("activeIngredient"))), 1, 12)),
  trim("activeIngredient"),
  CURRENT_TIMESTAMP
FROM "Medicine"
WHERE NULLIF(trim("activeIngredient"), '') IS NOT NULL
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "MedicineIngredient" ("medicineId", "ingredientId")
SELECT m."id", i."id"
FROM "Medicine" m
JOIN "ActiveIngredient" i ON i."name" = trim(m."activeIngredient")
WHERE NULLIF(trim(m."activeIngredient"), '') IS NOT NULL;

ALTER TABLE "Medicine"
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'unit',
  ADD COLUMN "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "minStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Medicine" ALTER COLUMN "unit" DROP DEFAULT, ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Medicine" DROP COLUMN "activeIngredient";

ALTER TABLE "Supply"
  ADD COLUMN "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "minStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Supply" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "ProtocolStepMaterial" (
  "id" TEXT NOT NULL,
  "stepTemplateId" TEXT NOT NULL,
  "medicineId" TEXT,
  "supplyId" TEXT,
  "plannedQuantity" DECIMAL(65,30) NOT NULL,
  "unit" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProtocolStepMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProtocolStepMaterial_one_product_check"
    CHECK (("medicineId" IS NOT NULL)::int + ("supplyId" IS NOT NULL)::int = 1)
);
CREATE INDEX "ProtocolStepMaterial_stepTemplateId_idx" ON "ProtocolStepMaterial"("stepTemplateId");

CREATE TABLE "TreatmentConsumption" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "medicineId" TEXT,
  "supplyId" TEXT,
  "plannedQuantity" DECIMAL(65,30),
  "actualQuantity" DECIMAL(65,30) NOT NULL,
  "unit" TEXT NOT NULL,
  "unitCost" DECIMAL(65,30) NOT NULL,
  "totalCost" DECIMAL(65,30) NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreatmentConsumption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TreatmentConsumption_one_product_check"
    CHECK (("medicineId" IS NOT NULL)::int + ("supplyId" IS NOT NULL)::int = 1)
);
CREATE INDEX "TreatmentConsumption_sessionId_idx" ON "TreatmentConsumption"("sessionId");

CREATE TABLE "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "medicineId" TEXT,
  "supplyId" TEXT,
  "transactionType" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "unit" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "balanceBefore" DECIMAL(65,30) NOT NULL,
  "balanceAfter" DECIMAL(65,30) NOT NULL,
  "createdById" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryTransaction_one_product_check"
    CHECK (("medicineId" IS NOT NULL)::int + ("supplyId" IS NOT NULL)::int = 1)
);
CREATE INDEX "InventoryTransaction_medicineId_createdAt_idx" ON "InventoryTransaction"("medicineId", "createdAt");
CREATE INDEX "InventoryTransaction_supplyId_createdAt_idx" ON "InventoryTransaction"("supplyId", "createdAt");
CREATE INDEX "InventoryTransaction_referenceType_referenceId_idx" ON "InventoryTransaction"("referenceType", "referenceId");

CREATE TABLE "IngredientInteraction" (
  "id" TEXT NOT NULL,
  "ingredientAId" TEXT NOT NULL,
  "ingredientBId" TEXT NOT NULL,
  "interactionType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "recommendation" TEXT,
  "minIntervalHours" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IngredientInteraction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IngredientInteraction_different_ingredients_check" CHECK ("ingredientAId" <> "ingredientBId")
);
CREATE UNIQUE INDEX "IngredientInteraction_ingredientAId_ingredientBId_interactionType_key"
  ON "IngredientInteraction"("ingredientAId", "ingredientBId", "interactionType");

CREATE TABLE "InteractionAlert" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "treatmentPlanId" TEXT,
  "interactionId" TEXT,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "InteractionAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InteractionAlert_visitId_status_idx" ON "InteractionAlert"("visitId", "status");

ALTER TABLE "EquipmentUsage"
  ADD COLUMN "operatorId" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SignedConsent"
  ADD COLUMN "treatmentPlanId" TEXT,
  ADD COLUMN "planVersion" INTEGER,
  ADD COLUMN "signedByPatientId" TEXT,
  ADD COLUMN "signedByEmployeeId" TEXT,
  ADD COLUMN "documentUrl" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "SignedConsent_treatmentPlanId_idx" ON "SignedConsent"("treatmentPlanId");

-- Foreign keys.
ALTER TABLE "TreatmentProtocolTemplate" ADD CONSTRAINT "TreatmentProtocolTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocolStageTemplate" ADD CONSTRAINT "ProtocolStageTemplate_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "TreatmentProtocolTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProtocolStepTemplate" ADD CONSTRAINT "ProtocolStepTemplate_stageTemplateId_fkey" FOREIGN KEY ("stageTemplateId") REFERENCES "ProtocolStageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProtocolStepTemplate" ADD CONSTRAINT "ProtocolStepTemplate_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ProcedureCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocolStepMaterial" ADD CONSTRAINT "ProtocolStepMaterial_stepTemplateId_fkey" FOREIGN KEY ("stepTemplateId") REFERENCES "ProtocolStepTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProtocolStepMaterial" ADD CONSTRAINT "ProtocolStepMaterial_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocolStepMaterial" ADD CONSTRAINT "ProtocolStepMaterial_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_protocolTemplateId_fkey" FOREIGN KEY ("protocolTemplateId") REFERENCES "TreatmentProtocolTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentStage" ADD CONSTRAINT "TreatmentStage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentStep" ADD CONSTRAINT "TreatmentStep_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TreatmentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentStep" ADD CONSTRAINT "TreatmentStep_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ProcedureCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TreatmentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "TreatmentStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentImage" ADD CONSTRAINT "TreatmentImage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentImage" ADD CONSTRAINT "TreatmentImage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentImage" ADD CONSTRAINT "TreatmentImage_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentImage" ADD CONSTRAINT "TreatmentImage_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicineIngredient" ADD CONSTRAINT "MedicineIngredient_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicineIngredient" ADD CONSTRAINT "MedicineIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ActiveIngredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngredientInteraction" ADD CONSTRAINT "IngredientInteraction_ingredientAId_fkey" FOREIGN KEY ("ingredientAId") REFERENCES "ActiveIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IngredientInteraction" ADD CONSTRAINT "IngredientInteraction_ingredientBId_fkey" FOREIGN KEY ("ingredientBId") REFERENCES "ActiveIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentConsumption" ADD CONSTRAINT "TreatmentConsumption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TreatmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentConsumption" ADD CONSTRAINT "TreatmentConsumption_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentConsumption" ADD CONSTRAINT "TreatmentConsumption_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentConsumption" ADD CONSTRAINT "TreatmentConsumption_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipmentUsage" ADD CONSTRAINT "EquipmentUsage_treatmentSessionId_fkey" FOREIGN KEY ("treatmentSessionId") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipmentUsage" ADD CONSTRAINT "EquipmentUsage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_signedByPatientId_fkey" FOREIGN KEY ("signedByPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_signedByEmployeeId_fkey" FOREIGN KEY ("signedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteractionAlert" ADD CONSTRAINT "InteractionAlert_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InteractionAlert" ADD CONSTRAINT "InteractionAlert_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteractionAlert" ADD CONSTRAINT "InteractionAlert_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "IngredientInteraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
