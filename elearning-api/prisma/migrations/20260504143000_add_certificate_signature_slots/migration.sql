ALTER TABLE "InstructorPreset"
ADD COLUMN "signatureTitle" TEXT,
ADD COLUMN "signatureImageUrl" TEXT;

ALTER TABLE "CourseCertificateSetting"
ADD COLUMN "signatureSlots" JSONB;
