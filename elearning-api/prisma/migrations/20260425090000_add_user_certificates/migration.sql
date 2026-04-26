CREATE TABLE "UserCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "noExpiration" BOOLEAN NOT NULL DEFAULT false,
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "fileUrl" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCertificate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserCertificate_userId_issueDate_idx" ON "UserCertificate"("userId", "issueDate");
CREATE INDEX "UserCertificate_userId_createdAt_idx" ON "UserCertificate"("userId", "createdAt");

ALTER TABLE "UserCertificate" ADD CONSTRAINT "UserCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
