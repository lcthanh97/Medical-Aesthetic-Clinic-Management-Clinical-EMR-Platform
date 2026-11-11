ALTER TABLE "TreatmentImage"
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSizeBytes" INTEGER,
  ADD COLUMN "checksumSha256" TEXT,
  ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hiddenReason" TEXT,
  ADD COLUMN "hiddenById" TEXT,
  ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE TABLE "ImageNoteRevision" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImageNoteRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TreatmentImage_visitId_capturedAt_idx"
  ON "TreatmentImage"("visitId", "capturedAt");
CREATE INDEX "TreatmentImage_isHidden_capturedAt_idx"
  ON "TreatmentImage"("isHidden", "capturedAt");
CREATE UNIQUE INDEX "TreatmentImage_planId_checksumSha256_capturedAt_key"
  ON "TreatmentImage"("planId", "checksumSha256", "capturedAt");
CREATE UNIQUE INDEX "ImageNoteRevision_imageId_version_key"
  ON "ImageNoteRevision"("imageId", "version");
CREATE INDEX "ImageNoteRevision_imageId_createdAt_idx"
  ON "ImageNoteRevision"("imageId", "createdAt");

ALTER TABLE "TreatmentImage"
  ADD CONSTRAINT "TreatmentImage_hiddenById_fkey"
  FOREIGN KEY ("hiddenById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImageNoteRevision"
  ADD CONSTRAINT "ImageNoteRevision_imageId_fkey"
  FOREIGN KEY ("imageId") REFERENCES "TreatmentImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImageNoteRevision"
  ADD CONSTRAINT "ImageNoteRevision_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
