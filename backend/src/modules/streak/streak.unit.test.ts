import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak.service.js';

describe('Streak Calculation Unit Tests', () => {
  // Helper to map simple string array of categories to the expected input structure
  const makeDays = (categories: ('SUCCESS' | 'REST' | 'MISSED' | 'PENDING')[]) => {
    return categories.map((cat, idx) => ({
      date: `2026-08-${String(idx + 1).padStart(2, '0')}`,
      category: cat,
    }));
  };

  it('Case 1: Consecutive success', () => {
    const days = makeDays(['SUCCESS', 'SUCCESS', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.successfulStudyDays).toBe(3);
    expect(result.lastActiveDate).toBe('2026-08-03');
  });

  it('Case 2: Missed day breaks streak', () => {
    const days = makeDays(['SUCCESS', 'SUCCESS', 'MISSED', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
    expect(result.successfulStudyDays).toBe(3);
    expect(result.lastActiveDate).toBe('2026-08-04');
  });

  it('Case 3: Rest day bridges streak', () => {
    const days = makeDays(['SUCCESS', 'SUCCESS', 'REST', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.successfulStudyDays).toBe(3);
    expect(result.lastActiveDate).toBe('2026-08-04');
  });

  it('Case 4: Multiple rest days bridge streak', () => {
    const days = makeDays(['SUCCESS', 'REST', 'REST', 'REST', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.successfulStudyDays).toBe(2);
    expect(result.lastActiveDate).toBe('2026-08-05');
  });

  it('Case 5: Rest day after missed day does NOT repair streak', () => {
    const days = makeDays(['SUCCESS', 'MISSED', 'REST', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.successfulStudyDays).toBe(2);
    expect(result.lastActiveDate).toBe('2026-08-04');
  });

  it('Case 6: Rest day at the beginning', () => {
    const days = makeDays(['REST', 'SUCCESS', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.successfulStudyDays).toBe(2);
    expect(result.lastActiveDate).toBe('2026-08-03');
  });

  it('Case 7: Only rest days', () => {
    const days = makeDays(['REST', 'REST', 'REST']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.successfulStudyDays).toBe(0);
    expect(result.lastActiveDate).toBeNull();
  });

  it('Case 8: Only missed days', () => {
    const days = makeDays(['MISSED', 'MISSED', 'MISSED']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.successfulStudyDays).toBe(0);
    expect(result.lastActiveDate).toBeNull();
  });

  it('Case 9: Pending today preserves yesterday streak', () => {
    const days = makeDays(['SUCCESS', 'SUCCESS', 'SUCCESS', 'PENDING']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.successfulStudyDays).toBe(3);
    expect(result.lastActiveDate).toBe('2026-08-03');
  });

  it('Case 10: Success after previous broken streak', () => {
    const days = makeDays(['SUCCESS', 'SUCCESS', 'MISSED', 'SUCCESS', 'SUCCESS']);
    const result = calculateStreak(days);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.successfulStudyDays).toBe(4);
    expect(result.lastActiveDate).toBe('2026-08-05');
  });
});
