# Database completeness review

## Scope

The schema was reviewed against the clinic ERD, patient journey and assigned feature list. Reporting and dashboards remain derived views and do not own database tables.

## Tables added

- Authentication: `RefreshToken`.
- Service catalogue and prepayment traceability: `ServiceCatalog`, `InvoiceItem`, `PaymentAllocation`.
- Dermatology image timeline: `SkinImage`.
- Treatment delivery: `TreatmentSession`, `TreatmentStepExecution`.
- Treatment materials and inventory audit: `TreatmentSupplyNorm`, `TreatmentSupplyUsage`, `SupplyTransaction`, `MedicineTransaction`.
- Equipment lifecycle: `EquipmentMaintenance`.
- Consent evidence: `ConsentAudit`.
- Interaction warnings: `InteractionRule`, `InteractionAlert`.
- Notification delivery history: `NotificationDelivery`.

## Existing data preserved

The migration contains no table or column drops. Existing `Allergy.diagnosisDate`, `MedicalHistory.diagnosisDate`, `TreatmentStep.executorId` and `TreatmentStep.time` fields were added to the Prisma schema instead of being removed from Neon.

## Migration

`prisma/migrations/20261006000000_complete_clinic_modules/migration.sql`
