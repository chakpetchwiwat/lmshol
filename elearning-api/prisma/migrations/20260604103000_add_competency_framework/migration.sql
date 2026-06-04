CREATE TABLE IF NOT EXISTS "CompetencyGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetencyGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompetencyCategory" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetencyCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Competency" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "gbtLevel" TEXT,
    "competencyType" TEXT,
    "code" TEXT NOT NULL,
    "legacyCode" TEXT,
    "sourceRole" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditionsNote" TEXT,
    "measurementLevelCount" INTEGER,
    "measurementDescription" TEXT,
    "sourceColumnK" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompetencyLevel" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "measurementCriteria" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetencyLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CourseCompetency" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "requiredLevel" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseCompetency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserCertificateCompetency" (
    "id" TEXT NOT NULL,
    "userCertificateId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "requiredLevel" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCertificateCompetency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetencyGroup_code_key" ON "CompetencyGroup"("code");
CREATE INDEX IF NOT EXISTS "CompetencyGroup_status_displayOrder_idx" ON "CompetencyGroup"("status", "displayOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "CompetencyCategory_code_key" ON "CompetencyCategory"("code");
CREATE INDEX IF NOT EXISTS "CompetencyCategory_groupId_status_displayOrder_idx" ON "CompetencyCategory"("groupId", "status", "displayOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "Competency_code_key" ON "Competency"("code");
CREATE INDEX IF NOT EXISTS "Competency_categoryId_status_displayOrder_idx" ON "Competency"("categoryId", "status", "displayOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "CompetencyLevel_competencyId_level_key" ON "CompetencyLevel"("competencyId", "level");
CREATE INDEX IF NOT EXISTS "CompetencyLevel_competencyId_displayOrder_idx" ON "CompetencyLevel"("competencyId", "displayOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "CourseCompetency_courseId_competencyId_key" ON "CourseCompetency"("courseId", "competencyId");
CREATE INDEX IF NOT EXISTS "CourseCompetency_competencyId_idx" ON "CourseCompetency"("competencyId");

CREATE UNIQUE INDEX IF NOT EXISTS "UserCertificateCompetency_userCertificateId_competencyId_key" ON "UserCertificateCompetency"("userCertificateId", "competencyId");
CREATE INDEX IF NOT EXISTS "UserCertificateCompetency_competencyId_idx" ON "UserCertificateCompetency"("competencyId");

ALTER TABLE "CompetencyCategory"
ADD CONSTRAINT "CompetencyCategory_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "CompetencyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Competency"
ADD CONSTRAINT "Competency_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "CompetencyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetencyLevel"
ADD CONSTRAINT "CompetencyLevel_competencyId_fkey"
FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseCompetency"
ADD CONSTRAINT "CourseCompetency_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseCompetency"
ADD CONSTRAINT "CourseCompetency_competencyId_fkey"
FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCertificateCompetency"
ADD CONSTRAINT "UserCertificateCompetency_userCertificateId_fkey"
FOREIGN KEY ("userCertificateId") REFERENCES "UserCertificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCertificateCompetency"
ADD CONSTRAINT "UserCertificateCompetency_competencyId_fkey"
FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCertificate" ALTER COLUMN "trainingItem" SET DEFAULT 'unclassified';

UPDATE "UserCertificate"
SET "trainingItem" = 'unclassified'
WHERE "trainingItem" IS NULL OR btrim("trainingItem") = '';
