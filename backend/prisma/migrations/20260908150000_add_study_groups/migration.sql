-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_MEMBER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_GOAL_MILESTONE';

-- CreateEnum
CREATE TYPE "StudyGroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GroupGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "StudyGroup" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inviteCode" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "status" "StudyGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupGoal" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetMinutes" INTEGER NOT NULL,
    "currentMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "GroupGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GroupGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupFocusContribution" (
    "id" TEXT NOT NULL,
    "groupGoalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusSessionId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupFocusContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupStreak" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyGroup_inviteCode_key" ON "StudyGroup"("inviteCode");
CREATE INDEX "StudyGroup_ownerId_idx" ON "StudyGroup"("ownerId");
CREATE INDEX "StudyGroup_inviteCode_idx" ON "StudyGroup"("inviteCode");
CREATE INDEX "StudyGroup_status_idx" ON "StudyGroup"("status");

-- CreateIndex
CREATE INDEX "StudyGroupMember_groupId_idx" ON "StudyGroupMember"("groupId");
CREATE INDEX "StudyGroupMember_userId_idx" ON "StudyGroupMember"("userId");
CREATE UNIQUE INDEX "StudyGroupMember_groupId_userId_key" ON "StudyGroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupGoal_groupId_idx" ON "GroupGoal"("groupId");
CREATE INDEX "GroupGoal_groupId_status_idx" ON "GroupGoal"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupFocusContribution_groupGoalId_idx" ON "GroupFocusContribution"("groupGoalId");
CREATE INDEX "GroupFocusContribution_groupGoalId_date_idx" ON "GroupFocusContribution"("groupGoalId", "date");
CREATE INDEX "GroupFocusContribution_userId_idx" ON "GroupFocusContribution"("userId");
CREATE UNIQUE INDEX "GroupFocusContribution_groupGoalId_focusSessionId_key" ON "GroupFocusContribution"("groupGoalId", "focusSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupStreak_groupId_key" ON "GroupStreak"("groupId");

-- AddForeignKey
ALTER TABLE "StudyGroupMember" ADD CONSTRAINT "StudyGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyGroupMember" ADD CONSTRAINT "StudyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGoal" ADD CONSTRAINT "GroupGoal_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupFocusContribution" ADD CONSTRAINT "GroupFocusContribution_groupGoalId_fkey" FOREIGN KEY ("groupGoalId") REFERENCES "GroupGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStreak" ADD CONSTRAINT "GroupStreak_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
