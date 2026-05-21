CREATE TABLE IF NOT EXISTS "GoalTargetCohortRole" (
    "goalId" TEXT NOT NULL,
    "cohortRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTargetCohortRole_pkey" PRIMARY KEY ("goalId","cohortRoleId")
);

CREATE INDEX IF NOT EXISTS "GoalTargetCohortRole_cohortRoleId_goalId_idx" ON "GoalTargetCohortRole"("cohortRoleId", "goalId");

ALTER TABLE "GoalTargetCohortRole"
ADD CONSTRAINT "GoalTargetCohortRole_goalId_fkey"
FOREIGN KEY ("goalId") REFERENCES "LearningGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalTargetCohortRole"
ADD CONSTRAINT "GoalTargetCohortRole_cohortRoleId_fkey"
FOREIGN KEY ("cohortRoleId") REFERENCES "CohortRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
