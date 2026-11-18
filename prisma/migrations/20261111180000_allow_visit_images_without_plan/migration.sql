-- Allow clinical images to be captured for any assigned visit, even before a treatment plan exists.
ALTER TABLE "TreatmentImage" ALTER COLUMN "planId" DROP NOT NULL;
