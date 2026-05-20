-- AlterTable: Rename role to permission to preserve data, and add roles array column
ALTER TABLE "User" RENAME COLUMN "role" TO "permission";
ALTER TABLE "User" ADD COLUMN "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];
