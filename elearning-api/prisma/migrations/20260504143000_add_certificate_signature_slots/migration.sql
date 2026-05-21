ALTER TABLE "InstructorPreset"
ADD COLUMN IF NOT EXISTS "signatureTitle" TEXT,
ADD COLUMN IF NOT EXISTS "signatureImageUrl" TEXT;

ALTER TABLE "CourseCertificateSetting"
ADD COLUMN IF NOT EXISTS "signatureSlots" JSONB;
