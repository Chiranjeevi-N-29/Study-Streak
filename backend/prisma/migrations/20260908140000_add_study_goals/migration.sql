-- AlterEnum
ALTER TYPE "ConditionType" ADD VALUE 'GOALS_COMPLETED';

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalProgressType" AS ENUM ('TASKS', 'FOCUS_TIME', 'MILESTONES', 'MANUAL');

-- AlterTable
ALTER TABLE "StudyTask" ADD COLUMN "goalId" TEXT;

-- CreateTable
CREATE TABLE "StudyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "targetDate" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "progressType" "GoalProgressType" NOT NULL DEFAULT 'FOCUS_TIME',
    "targetValue" INTEGER,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalMilestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyGoal_userId_idx" ON "StudyGoal"("userId");
CREATE INDEX "StudyGoal_userId_status_idx" ON "StudyGoal"("userId", "status");
CREATE INDEX "StudyGoal_userId_targetDate_idx" ON "StudyGoal"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "GoalMilestone_goalId_idx" ON "GoalMilestone"("goalId");

-- CreateIndex
CREATE INDEX "StudyTask_goalId_idx" ON "StudyTask"("goalId");

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "StudyGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGoal" ADD CONSTRAINT "StudyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalMilestone" ADD CONSTRAINT "GoalMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "StudyGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
