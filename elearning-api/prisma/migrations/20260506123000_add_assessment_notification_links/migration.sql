ALTER TABLE "UserNotification"
ADD COLUMN IF NOT EXISTS "assessmentSubmissionId" TEXT,
ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;

CREATE INDEX IF NOT EXISTS "UserNotification_assessmentSubmissionId_scheduledFor_idx"
ON "UserNotification"("assessmentSubmissionId", "scheduledFor");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserNotification_assessmentSubmissionId_fkey'
  ) THEN
    ALTER TABLE "UserNotification"
    ADD CONSTRAINT "UserNotification_assessmentSubmissionId_fkey"
    FOREIGN KEY ("assessmentSubmissionId") REFERENCES "AssessmentSubmission"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
