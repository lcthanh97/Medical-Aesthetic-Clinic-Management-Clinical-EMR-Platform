-- Review only. Roll back solely before the proposed schema has been used.
BEGIN;
LOCK TABLE "Notification", "Appointment", "AppointmentFollowUp", "AftercareInstruction",
  "NotificationTemplate", "NotificationRule", "PatientCommunicationPreference" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Notification" WHERE "patientId" IS NOT NULL OR "appointmentId" IS NOT NULL
      OR "appointmentRevision" IS NOT NULL OR "treatmentSessionId" IS NOT NULL
      OR "aftercareInstructionId" IS NOT NULL OR "templateId" IS NOT NULL
      OR "templateVersion" IS NOT NULL OR "idempotencyKey" IS NOT NULL OR "cancelledAt" IS NOT NULL)
    OR EXISTS (SELECT 1 FROM "Appointment" WHERE "notificationRevision" <> 1)
    OR EXISTS (SELECT 1 FROM "AppointmentFollowUp")
    OR EXISTS (SELECT 1 FROM "AftercareInstruction")
    OR EXISTS (SELECT 1 FROM "NotificationTemplate")
    OR EXISTS (SELECT 1 FROM "NotificationRule")
    OR EXISTS (SELECT 1 FROM "PatientCommunicationPreference")
  THEN
    RAISE EXCEPTION 'Notification schema has been used; preserve history and use a forward fix';
  END IF;
END;
$$;

ALTER TABLE "Notification"
  DROP CONSTRAINT "Notification_template_version_fkey",
  DROP CONSTRAINT "Notification_appointment_revision_check",
  DROP COLUMN "patientId",
  DROP COLUMN "appointmentId",
  DROP COLUMN "appointmentRevision",
  DROP COLUMN "treatmentSessionId",
  DROP COLUMN "aftercareInstructionId",
  DROP COLUMN "templateId",
  DROP COLUMN "templateVersion",
  DROP COLUMN "idempotencyKey",
  DROP COLUMN "cancelledAt";

DROP TABLE "AftercareInstruction", "NotificationTemplate", "NotificationRule",
  "PatientCommunicationPreference", "AppointmentFollowUp";
ALTER TABLE "Appointment" DROP COLUMN "notificationRevision";
COMMIT;
