# Treatment schema redesign

The treatment domain follows the design in `ChinhsuaDB.docx`:

```text
TreatmentProtocolTemplate
  -> ProtocolStageTemplate
    -> ProtocolStepTemplate
      -> ProtocolStepMaterial

Patient -> TreatmentPlan -> TreatmentStage -> TreatmentStep -> TreatmentSession
                                                     |              |
                                                     |              +-> TreatmentImage
                                                     |              +-> EquipmentUsage
                                                     |              +-> TreatmentConsumption
                                                     |
                                                     +-> ProcedureCatalog
```

Inventory is recorded in the unified `InventoryTransaction` ledger. Medicines
use the normalized `MedicineIngredient -> ActiveIngredient` relationship, and
ingredient safety rules are stored in `IngredientInteraction`.

## Invariants enforced in PostgreSQL

- A plan can have only one `TreatmentStage` with status `IN_PROGRESS`.
- A protocol material, treatment consumption, or inventory transaction must
  reference exactly one of medicine or supply.
- An ingredient cannot interact with itself.
- Stage, step, and session sequence numbers are unique within their parent.

## Production migration

Migration `20261006010000_treatment_schema_redesign` converts legacy plans and
steps without discarding them. Each existing plan receives an initial stage;
duplicate legacy step numbers are resequenced deterministically. Because the
legacy rows had no employee author, they reference the technical employee
`SYSTEM-MIGRATION` so `createdById` remains mandatory.

The database and Prisma model are verified with `prisma migrate diff`; the
expected result is `No difference detected`.
