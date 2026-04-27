-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'VALID', 'REVOKED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "CertificateIssueMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "CertificateSignatureType" AS ENUM ('INSTRUCTOR', 'CUSTOM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "CertificateOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signatureImageUrl" TEXT,
ADD COLUMN     "signatureTitle" TEXT;

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateHtml" TEXT NOT NULL,
    "templateCss" TEXT NOT NULL,
    "orientation" "CertificateOrientation" NOT NULL DEFAULT 'LANDSCAPE',
    "pageSize" TEXT NOT NULL DEFAULT 'A4',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCertificateSetting" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "issueMode" "CertificateIssueMode" NOT NULL DEFAULT 'AUTOMATIC',
    "signatureType" "CertificateSignatureType" NOT NULL DEFAULT 'INSTRUCTOR',
    "signerNameOverride" TEXT,
    "signerTitleOverride" TEXT,
    "signatureImageUrl" TEXT,
    "passingScore" INTEGER,
    "expiryMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCertificateSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "pdfUrl" TEXT,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseCertificateSetting_courseId_key" ON "CourseCertificateSetting"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNo_key" ON "Certificate"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationToken_key" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_userId_courseId_idx" ON "Certificate"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Certificate_verificationToken_idx" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_certificateNo_idx" ON "Certificate"("certificateNo");

-- AddForeignKey
ALTER TABLE "CourseCertificateSetting" ADD CONSTRAINT "CourseCertificateSetting_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCertificateSetting" ADD CONSTRAINT "CourseCertificateSetting_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS certificate_serial_seq START 1;

-- CreatePartialIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_active_user_course_unique"
ON "Certificate"("userId", "courseId")
WHERE "status" <> 'REVOKED';
