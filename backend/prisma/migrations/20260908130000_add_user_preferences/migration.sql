-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyStudyGoalMinutes" INTEGER NOT NULL DEFAULT 60,
    "preferredStudyDays" TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']::TEXT[],
    "preferredStudyStartTime" TEXT NOT NULL DEFAULT '09:00',
    "preferredStudyEndTime" TEXT NOT NULL DEFAULT '18:00',
    "defaultFocusDurationMinutes" INTEGER NOT NULL DEFAULT 25,
    "defaultBreakDurationMinutes" INTEGER NOT NULL DEFAULT 5,
    "longBreakDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "autoStartBreak" BOOLEAN NOT NULL DEFAULT false,
    "weekStartsOn" TEXT NOT NULL DEFAULT 'Monday',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
