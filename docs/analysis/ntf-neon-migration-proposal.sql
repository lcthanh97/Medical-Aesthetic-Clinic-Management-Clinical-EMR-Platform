-- Review artifact for a future Prisma migration. No backfill of legacy notifications.
-- Requires a decision on the authoritative follow-up marker and approved permissions.
BEGIN;

-- Proposed evidence model, subject to appointment owner approval.
-- Existing appointments do not become follow-ups merely by receiving revision 1.
ALTER TABLE "Appointment"
  ADD COLUMN "notificationRevision" INTEGER NOT NULL DEFAULT 1 CHECK ("notificationRevision" > 0);

CREATE TABLE "AppointmentFollowUp" (
  "appointmentId" TEXT PRIMARY KEY REFERENCES "Appointment" ("id"),
  "sourceVisitId" TEXT NOT NULL REFERENCES "Visit" ("id"),
  "confirmedByEmployeeId" TEXT NOT NULL REFERENCES "Employee" ("id"),
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "procedureCategory" TEXT,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'APPROVED', 'RETIRED')),
  "approvedByEmployeeId" TEXT REFERENCES "Employee" ("id"),
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("code", "version", "channel"),
  UNIQUE ("id", "version"),
  CHECK ("status" <> 'APPROVED' OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL))
);

CREATE TABLE "NotificationRule" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "kind" TEXT NOT NULL,
  "offsetMinutes" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL,
  "quietStart" TIME,
  "quietEnd" TIME,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "approvedByEmployeeId" TEXT REFERENCES "Employee" ("id"),
  "approvedAt" TIMESTAMP(3),
  CHECK (("quietStart" IS NULL) = ("quietEnd" IS NULL)),
  CHECK (NOT "enabled" OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL))
);

CREATE TABLE "PatientCommunicationPreference" (
  "patientId" TEXT NOT NULL REFERENCES "Patient" ("id"),
  "channel" TEXT NOT NULL,
  "contactVerifiedAt" TIMESTAMP(3),
  "consentAt" TIMESTAMP(3),
  "optOutAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("patientId", "channel")
);

CREATE TABLE "AftercareInstruction" (
  "id" TEXT PRIMARY KEY,
  "treatmentSessionId" TEXT NOT NULL REFERENCES "TreatmentSession" ("id"),
  "patientId" TEXT NOT NULL REFERENCES "Patient" ("id"),
  "procedureId" TEXT NOT NULL REFERENCES "ProcedureCatalog" ("id"),
  "templateId" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "approvedText" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("approvalStatus" IN ('DRAFT', 'APPROVED', 'RETIRED')),
  "approvedByEmployeeId" TEXT REFERENCES "Employee" ("id"),
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("templateId", "templateVersion") REFERENCES "NotificationTemplate" ("id", "version"),
  UNIQUE ("treatmentSessionId", "version"),
  CHECK ("approvalStatus" <> 'APPROVED' OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL))
);

ALTER TABLE "Notification"
  ADD COLUMN "patientId" TEXT REFERENCES "Patient" ("id"),
  ADD COLUMN "appointmentId" TEXT REFERENCES "Appointment" ("id"),
  ADD COLUMN "appointmentRevision" INTEGER,
  ADD COLUMN "treatmentSessionId" TEXT REFERENCES "TreatmentSession" ("id"),
  ADD COLUMN "aftercareInstructionId" TEXT REFERENCES "AftercareInstruction" ("id"),
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "idempotencyKey" TEXT UNIQUE,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD CONSTRAINT "Notification_appointment_revision_check" CHECK (
    ("appointmentId" IS NULL AND "appointmentRevision" IS NULL)
    OR ("appointmentId" IS NOT NULL AND "appointmentRevision" IS NOT NULL AND "appointmentRevision" > 0)
  ),
  ADD CONSTRAINT "Notification_template_version_fkey"
    FOREIGN KEY ("templateId", "templateVersion") REFERENCES "NotificationTemplate" ("id", "version") MATCH FULL;

CREATE INDEX "Notification_appointmentId_revision_idx" ON "Notification" ("appointmentId", "appointmentRevision");
CREATE INDEX "Notification_treatmentSessionId_idx" ON "Notification" ("treatmentSessionId");
CREATE INDEX "Notification_outbox_due_idx" ON "Notification" ("scheduledAt")
  WHERE "idempotencyKey" IS NOT NULL AND "cancelledAt" IS NULL;
COMMIT;

-- See the companion rollback artifact. Once used, preserve audit history,
-- disable workers and use a forward fix.
