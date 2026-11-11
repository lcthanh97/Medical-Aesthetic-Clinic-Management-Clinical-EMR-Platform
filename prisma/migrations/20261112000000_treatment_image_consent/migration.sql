CREATE TABLE "TreatmentImageConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "planId" TEXT,
  "signerName" TEXT NOT NULL,
  "signerRelationship" TEXT NOT NULL,
  "recordedByEmployeeId" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "TreatmentImageConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TreatmentImageConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TreatmentImageConsent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TreatmentImageConsent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TreatmentImageConsent_recordedByEmployeeId_fkey" FOREIGN KEY ("recordedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TreatmentImageConsent_visitId_planId_consentedAt_idx" ON "TreatmentImageConsent"("visitId", "planId", "consentedAt");
CREATE INDEX "TreatmentImageConsent_patientId_consentedAt_idx" ON "TreatmentImageConsent"("patientId", "consentedAt");
