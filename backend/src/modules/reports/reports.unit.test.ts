import { describe, it, expect } from 'vitest';
import { resolveDateRange } from './reports.service.js';

describe('resolveDateRange', () => {
  it('returns 30-day range by default for "30d"', () => {
    const result = resolveDateRange('30d');
    expect(result.numDays).toBe(30);
    expect(result.label).toBe('Last 30 Days');
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
  });

  it('returns 7-day range for "7d"', () => {
    const result = resolveDateRange('7d');
    expect(result.numDays).toBe(7);
    expect(result.label).toBe('Last 7 Days');
  });

  it('returns 90-day range for "90d"', () => {
    const result = resolveDateRange('90d');
    expect(result.numDays).toBe(90);
    expect(result.label).toBe('Last 90 Days');
  });

  it('returns custom range when startDate and endDate are provided', () => {
    const start = '2026-01-01';
    const end = '2026-01-31';
    const result = resolveDateRange('custom', start, end);
    expect(result.startDate).toBe(start);
    expect(result.endDate).toBe(end);
    expect(result.numDays).toBe(31);
    expect(result.label).toContain('Jan');
  });

  it('falls back to 30d when custom is requested without dates', () => {
    const result = resolveDateRange('custom');
    expect(result.numDays).toBe(30);
  });

  it('endDate equals today for predefined ranges', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const result = resolveDateRange('30d');
    expect(result.endDate).toBe(todayStr);
  });

  it('all-time range covers 365 days', () => {
    const result = resolveDateRange('all');
    expect(result.numDays).toBe(365);
    expect(result.label).toBe('All Time');
  });
});
