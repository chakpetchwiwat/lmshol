CREATE INDEX IF NOT EXISTS "User_status_departmentId_tierId_idx" ON "User"("status", "departmentId", "tierId");

CREATE INDEX IF NOT EXISTS "User_departmentId_status_idx" ON "User"("departmentId", "status");

CREATE INDEX IF NOT EXISTS "Lesson_courseId_order_idx" ON "Lesson"("courseId", "order");

CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "QuizAttempt_lessonId_createdAt_idx" ON "QuizAttempt"("lessonId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserCourse_courseId_status_completedAt_idx" ON "UserCourse"("courseId", "status", "completedAt");

CREATE INDEX IF NOT EXISTS "UserCourse_userId_status_completedAt_idx" ON "UserCourse"("userId", "status", "completedAt");

CREATE INDEX IF NOT EXISTS "UserCourse_userId_completedAt_idx" ON "UserCourse"("userId", "completedAt");

CREATE INDEX IF NOT EXISTS "LearningGoal_status_expiryDate_departmentId_idx" ON "LearningGoal"("status", "expiryDate", "departmentId");

CREATE INDEX IF NOT EXISTS "LearningGoal_scope_departmentId_status_idx" ON "LearningGoal"("scope", "departmentId", "status");

CREATE INDEX IF NOT EXISTS "GoalCourse_courseId_goalId_idx" ON "GoalCourse"("courseId", "goalId");
