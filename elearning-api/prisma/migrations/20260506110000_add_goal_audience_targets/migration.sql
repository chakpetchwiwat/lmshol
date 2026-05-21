CREATE TABLE IF NOT EXISTS "GoalTargetDepartment" (
    "goalId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTargetDepartment_pkey" PRIMARY KEY ("goalId","departmentId")
);

CREATE TABLE IF NOT EXISTS "GoalTargetUser" (
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTargetUser_pkey" PRIMARY KEY ("goalId","userId")
);

CREATE INDEX IF NOT EXISTS "GoalTargetDepartment_departmentId_goalId_idx" ON "GoalTargetDepartment"("departmentId", "goalId");
CREATE INDEX IF NOT EXISTS "GoalTargetUser_userId_goalId_idx" ON "GoalTargetUser"("userId", "goalId");

ALTER TABLE "GoalTargetDepartment"
ADD CONSTRAINT "GoalTargetDepartment_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalTargetDepartment"
ADD CONSTRAINT "GoalTargetDepartment_goalId_fkey"
FOREIGN KEY ("goalId") REFERENCES "LearningGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalTargetUser"
ADD CONSTRAINT "GoalTargetUser_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalTargetUser"
ADD CONSTRAINT "GoalTargetUser_goalId_fkey"
FOREIGN KEY ("goalId") REFERENCES "LearningGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "GoalTargetDepartment" ("goalId", "departmentId")
SELECT "id", "departmentId"
FROM "LearningGoal"
WHERE "scope" = 'DEPARTMENT'
  AND "departmentId" IS NOT NULL
ON CONFLICT DO NOTHING;
