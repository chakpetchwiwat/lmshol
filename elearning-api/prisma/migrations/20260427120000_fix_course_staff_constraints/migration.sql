CREATE TABLE "CourseStaff" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CourseStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseStaff_courseId_userId_role_key"
ON "CourseStaff"("courseId", "userId", "role");

CREATE INDEX "CourseStaff_courseId_idx"
ON "CourseStaff"("courseId");

CREATE INDEX "CourseStaff_userId_idx"
ON "CourseStaff"("userId");

CREATE INDEX "CourseStaff_courseId_role_idx"
ON "CourseStaff"("courseId", "role");

CREATE INDEX "CourseStaff_courseId_role_isPrimary_idx"
ON "CourseStaff"("courseId", "role", "isPrimary");

CREATE UNIQUE INDEX "CourseStaff_one_owner_per_course"
ON "CourseStaff"("courseId")
WHERE "role" = 'owner';

CREATE UNIQUE INDEX "CourseStaff_one_primary_instructor_per_course"
ON "CourseStaff"("courseId")
WHERE "role" = 'instructor' AND "isPrimary" = true;

ALTER TABLE "CourseStaff"
ADD CONSTRAINT "CourseStaff_courseId_fkey"
FOREIGN KEY ("courseId")
REFERENCES "Course"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CourseStaff"
ADD CONSTRAINT "CourseStaff_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
