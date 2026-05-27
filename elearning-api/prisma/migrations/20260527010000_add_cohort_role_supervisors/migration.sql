CREATE TABLE IF NOT EXISTS "CohortRoleSupervisor" (
    "cohortRoleId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CohortRoleSupervisor_pkey" PRIMARY KEY ("cohortRoleId","supervisorId")
);

CREATE INDEX IF NOT EXISTS "CohortRoleSupervisor_supervisorId_idx" ON "CohortRoleSupervisor"("supervisorId");

ALTER TABLE "CohortRoleSupervisor"
ADD CONSTRAINT "CohortRoleSupervisor_cohortRoleId_fkey"
FOREIGN KEY ("cohortRoleId") REFERENCES "CohortRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CohortRoleSupervisor"
ADD CONSTRAINT "CohortRoleSupervisor_supervisorId_fkey"
FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
