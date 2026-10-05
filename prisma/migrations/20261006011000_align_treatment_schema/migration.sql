BEGIN;

ALTER INDEX "IngredientInteraction_ingredientAId_ingredientBId_interactionTy"
  RENAME TO "IngredientInteraction_ingredientAId_ingredientBId_interacti_key";

ALTER TABLE "TreatmentPlan" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

COMMIT;
