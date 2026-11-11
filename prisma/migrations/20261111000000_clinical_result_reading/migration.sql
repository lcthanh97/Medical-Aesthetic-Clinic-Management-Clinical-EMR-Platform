ALTER TABLE "LabResult"
  ADD COLUMN "finding" TEXT,
  ADD COLUMN "professionalConclusion" TEXT,
  ADD COLUMN "fileUrl" TEXT,
  ADD COLUMN "fileMimeType" TEXT,
  ADD COLUMN "fileName" TEXT;

ALTER TABLE "ImagingResult"
  ADD COLUMN "finding" TEXT,
  ADD COLUMN "professionalConclusion" TEXT,
  ADD COLUMN "fileMimeType" TEXT,
  ADD COLUMN "fileName" TEXT;
