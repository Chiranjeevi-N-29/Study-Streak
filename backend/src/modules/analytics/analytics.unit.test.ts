import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as analyticsService from './analytics.service.js';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    streak: {
      findUnique: vi.fn(),
    },
    studyPlan: {
      findMany: vi.fn(),
    },
    dailyReflection: {
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('AnalyticsService Unit Tests', () => {
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  it('should compute zero metrics gracefully for a new user with no study plans', async () => {
    mockPrisma.streak.findUnique.mockResolvedValue(null);
    mockPrisma.studyPlan.findMany.mockResolvedValue([]);
    mockPrisma.dailyReflection.findMany.mockResolvedValue([]);

    const res = await analyticsService.getUserAnalytics('user-1', '30d');

    expect(res.range).toBe('30d');
    expect(res.kpis.currentStreak).toBe(0);
    expect(res.kpis.longestStreak).toBe(0);
    expect(res.kpis.successfulDays).toBe(0);
    expect(res.kpis.totalStudyMinutes).toBe(0);
    expect(res.kpis.completionRate).toBe(0);
    expect(res.categoryBreakdown).toEqual([]);
    expect(res.dailyTimeSeries.length).toBe(30);
  });

  it('should aggregate total study time, completion rates, and categories correctly', async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    mockPrisma.streak.findUnique.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 4,
      longestStreak: 7,
    });

    mockPrisma.studyPlan.findMany.mockResolvedValue([
      {
        id: 'p-1',
        userId: 'user-1',
        date: todayStr,
        status: 'COMPLETED',
        minimumStudyTarget: 60,
        tasks: [
          {
            id: 't-1',
            title: 'Solve LeetCode',
            category: 'dsa',
            priority: 'HIGH',
            estimatedDuration: 45,
            actualDuration: 60,
            status: 'COMPLETED',
          },
          {
            id: 't-2',
            title: 'Read Spring Boot',
            category: 'Java',
            priority: 'MEDIUM',
            estimatedDuration: 30,
            actualDuration: 30,
            status: 'COMPLETED',
          },
        ],
      },
    ]);

    mockPrisma.dailyReflection.findMany.mockResolvedValue([]);

    const res = await analyticsService.getUserAnalytics('user-1', '30d');

    expect(res.kpis.currentStreak).toBe(4);
    expect(res.kpis.longestStreak).toBe(7);
    expect(res.kpis.successfulDays).toBe(1);
    expect(res.kpis.totalStudyMinutes).toBe(90);
    expect(res.kpis.completedTasksCount).toBe(2);
    expect(res.kpis.plannedTasksCount).toBe(2);
    expect(res.kpis.completionRate).toBe(100);

    // Verify Category normalization (dsa -> Dsa)
    const dsaCat = res.categoryBreakdown.find((c) => c.category === 'Dsa');
    expect(dsaCat).toBeDefined();
    expect(dsaCat?.studyMinutes).toBe(60);

    const javaCat = res.categoryBreakdown.find((c) => c.category === 'Java');
    expect(javaCat).toBeDefined();
    expect(javaCat?.studyMinutes).toBe(30);
  });
});
