ALTER TABLE "Appointment" ADD COLUMN "serviceId" TEXT;

CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
