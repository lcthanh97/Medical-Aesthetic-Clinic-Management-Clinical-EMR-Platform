-- CreateEnum
CREATE TYPE "FollowUpDecision" AS ENUM ('SCHEDULED', 'NOT_NEEDED', 'ON_SYMPTOMS');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "AftercareTemplateScope" AS ENUM ('PERSONAL', 'DEPARTMENT', 'CLINIC');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "followUpPlanId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "followUpPlanId" TEXT;

-- CreateTable
CREATE TABLE "FollowUpPlan" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "decision" "FollowUpDecision" NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'DRAFT',
    "targetDate" TIMESTAMP(3),
    "windowDays" INTEGER,
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'NORMAL',
    "reason" TEXT,
    "preparation" TEXT,
    "homeCare" TEXT,
    "avoid" TEXT,
    "warningSigns" TEXT,
    "patientMessage" TEXT,
    "hideDiagnosis" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT,
    "templateVersion" INTEGER,
    "treatmentSessionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cancelReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AftercareTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "AftercareTemplateScope" NOT NULL,
    "appliesTo" TEXT,
    "homeCare" TEXT,
    "avoid" TEXT,
    "warningSigns" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AftercareTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpPlan_visitId_key" ON "FollowUpPlan"("visitId");

-- CreateIndex
CREATE INDEX "FollowUpPlan_doctorId_status_idx" ON "FollowUpPlan"("doctorId", "status");

-- CreateIndex
CREATE INDEX "FollowUpPlan_targetDate_idx" ON "FollowUpPlan"("targetDate");

-- CreateIndex
CREATE INDEX "Appointment_followUpPlanId_idx" ON "Appointment"("followUpPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_followUpPlanId_idx" ON "Notification"("followUpPlanId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_followUpPlanId_fkey" FOREIGN KEY ("followUpPlanId") REFERENCES "FollowUpPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_followUpPlanId_fkey" FOREIGN KEY ("followUpPlanId") REFERENCES "FollowUpPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AftercareTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_treatmentSessionId_fkey" FOREIGN KEY ("treatmentSessionId") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AftercareTemplate" ADD CONSTRAINT "AftercareTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
