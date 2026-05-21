-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "expiryDate" TIMESTAMP(3),
    "postAssignmentReminderDays" INTEGER,
    "preDeadlineReminderDays" INTEGER,
    "postAssignmentReminderTime" TEXT,
    "preDeadlineReminderTime" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "departmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalCourse" (
    "goalId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "GoalCourse_pkey" PRIMARY KEY ("goalId","courseId")
);

-- CreateIndex
CREATE INDEX "LearningGoal_status_expiryDate_departmentId_idx" ON "LearningGoal"("status", "expiryDate", "departmentId");

-- CreateIndex
CREATE INDEX "LearningGoal_scope_departmentId_status_idx" ON "LearningGoal"("scope", "departmentId", "status");

-- CreateIndex
CREATE INDEX "GoalCourse_courseId_goalId_idx" ON "GoalCourse"("courseId", "goalId");

-- AddForeignKey
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCourse" ADD CONSTRAINT "GoalCourse_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "LearningGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCourse" ADD CONSTRAINT "GoalCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
