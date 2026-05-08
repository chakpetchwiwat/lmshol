CREATE TABLE "UserCourseBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCourseBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCourseBookmark_userId_courseId_key" ON "UserCourseBookmark"("userId", "courseId");
CREATE INDEX "UserCourseBookmark_userId_createdAt_idx" ON "UserCourseBookmark"("userId", "createdAt");
CREATE INDEX "UserCourseBookmark_courseId_idx" ON "UserCourseBookmark"("courseId");

ALTER TABLE "UserCourseBookmark" ADD CONSTRAINT "UserCourseBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCourseBookmark" ADD CONSTRAINT "UserCourseBookmark_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
