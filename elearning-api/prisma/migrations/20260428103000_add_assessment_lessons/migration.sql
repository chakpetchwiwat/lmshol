-- Add assessment submissions for assessment-type lessons.
CREATE TABLE "AssessmentSubmission" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileMimeType" TEXT,
    "note" TEXT,
    "score" INTEGER,
    "maxScore" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "gradedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssessmentSubmission_lessonId_status_submittedAt_idx" ON "AssessmentSubmission"("lessonId", "status", "submittedAt");
CREATE INDEX "AssessmentSubmission_userId_submittedAt_idx" ON "AssessmentSubmission"("userId", "submittedAt");
CREATE INDEX "AssessmentSubmission_gradedById_idx" ON "AssessmentSubmission"("gradedById");

ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
