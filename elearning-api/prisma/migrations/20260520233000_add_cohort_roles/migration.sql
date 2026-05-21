CREATE TABLE IF NOT EXISTS "CohortRole" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CohortRole_key_key" ON "CohortRole"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "CohortRole_name_key" ON "CohortRole"("name");

INSERT INTO "CohortRole" ("id", "key", "name", "order")
VALUES
    ('cohort_role_trainee', 'trainee', 'Trainee', 0),
    ('cohort_role_inspector', 'inspector', 'Inspector', 1),
    ('cohort_role_observer', 'observer', 'Observer', 2)
ON CONFLICT ("key") DO NOTHING;
