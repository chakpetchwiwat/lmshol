-- AlterTable
ALTER TABLE "Competency" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CompetencyCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CompetencyGroup" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CompetencyLevel" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CourseCompetency" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserCertificateCompetency" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CompetencyLegacyCode" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencyLegacyCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetencyLegacyCode_competencyId_idx" ON "CompetencyLegacyCode"("competencyId");

-- CreateIndex
CREATE INDEX "CompetencyLegacyCode_code_idx" ON "CompetencyLegacyCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyLegacyCode_competencyId_code_key" ON "CompetencyLegacyCode"("competencyId", "code");

-- AddForeignKey
ALTER TABLE "CompetencyLegacyCode" ADD CONSTRAINT "CompetencyLegacyCode_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
