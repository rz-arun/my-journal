import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayLocal, prevDay, nextDay, daysBetween, type DateStr } from '../src/lib/date';

describe('date helpers', () => {
  afterEach(() => vi.useRealTimers());

  describe('todayLocal', () => {
    it('returns YYYY-MM-DD for the local calendar day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-23T15:30:00'));
      expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('does not roll over at UTC midnight if local time is still the previous day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 23, 59, 0));  // month is 0-indexed
      expect(todayLocal()).toBe('2026-05-23');
    });

    it('rolls over at local midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 24, 0, 1, 0));
      expect(todayLocal()).toBe('2026-05-24');
    });
  });

  describe('prevDay', () => {
    it('subtracts one day in the simple case', () => {
      expect(prevDay('2026-05-23')).toBe('2026-05-22');
    });
    it('crosses month boundary', () => {
      expect(prevDay('2026-03-01')).toBe('2026-02-28');
    });
    it('respects leap year', () => {
      expect(prevDay('2024-03-01')).toBe('2024-02-29');
    });
    it('crosses year boundary', () => {
      expect(prevDay('2026-01-01')).toBe('2025-12-31');
    });
  });

  describe('nextDay', () => {
    it('adds one day', () => {
      expect(nextDay('2026-05-23')).toBe('2026-05-24');
    });
    it('crosses month boundary', () => {
      expect(nextDay('2026-02-28')).toBe('2026-03-01');
    });
    it('respects leap year', () => {
      expect(nextDay('2024-02-28')).toBe('2024-02-29');
    });
  });

  describe('daysBetween', () => {
    it('returns 0 for same day', () => {
      expect(daysBetween('2026-05-23', '2026-05-23')).toBe(0);
    });
    it('returns positive for later end', () => {
      expect(daysBetween('2026-05-20', '2026-05-23')).toBe(3);
    });
    it('returns negative for earlier end', () => {
      expect(daysBetween('2026-05-23', '2026-05-20')).toBe(-3);
    });
  });
});
