
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserNotification_userId_scheduledFor_readAt_idx"
ON "UserNotification"("userId", "scheduledFor", "readAt");

CREATE INDEX "UserNotification_goalId_scheduledFor_idx"
ON "UserNotification"("goalId", "scheduledFor");

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_goalId_fkey"
FOREIGN KEY ("goalId") REFERENCES "LearningGoal"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
