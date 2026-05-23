import { describe, it, expect } from 'vitest';
import { computeStreak } from '../src/lib/streaks';

function setOf(...dates: string[]) {
  return new Set(dates);
}

describe('computeStreak', () => {
  const created = '2025-01-01';

  it('returns 0/on for an empty habit', () => {
    expect(computeStreak(setOf(), '2026-05-23', created)).toMatchObject({
      current: 0, status: 'on', longest: 0
    });
  });

  it('counts today when only today is done', () => {
    expect(computeStreak(setOf('2026-05-23'), '2026-05-23', created)).toMatchObject({
      current: 1, status: 'on'
    });
  });

  it('counts a 10-day perfect run', () => {
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(2026, 4, 14 + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    expect(computeStreak(new Set(days), '2026-05-23', created)).toMatchObject({
      current: 10, status: 'on'
    });
  });

  it('does not penalize today being open (yesterday and before are done)', () => {
    expect(computeStreak(setOf('2026-05-22', '2026-05-21'), '2026-05-23', created)).toMatchObject({
      current: 2, status: 'on'
    });
  });

  it('shows warning when yesterday was missed but day-before-yesterday was done', () => {
    expect(computeStreak(setOf('2026-05-21', '2026-05-20'), '2026-05-23', created)).toMatchObject({
      current: 2, status: 'warning'
    });
  });

  it('shows broken when two consecutive misses precede today', () => {
    expect(computeStreak(setOf('2026-05-20', '2026-05-19'), '2026-05-23', created)).toMatchObject({
      current: 0, status: 'broken'
    });
  });

  it('counts a 9-day run with a single internal gap as 9 (skip-once allowed)', () => {
    const dates = setOf(
      '2026-05-23', '2026-05-22', '2026-05-21',
      '2026-05-19', '2026-05-18', '2026-05-17',
      '2026-05-16', '2026-05-15', '2026-05-14'
    );
    expect(computeStreak(dates, '2026-05-23', created)).toMatchObject({
      current: 9, status: 'on'
    });
  });

  it('resets to a fresh count of 1 after a two-day break, when today is done', () => {
    const dates = setOf('2026-05-23', '2026-05-20', '2026-05-19', '2026-05-18');
    expect(computeStreak(dates, '2026-05-23', created)).toMatchObject({
      current: 1, status: 'on'
    });
  });

  it('does not walk past habitCreatedAt', () => {
    expect(computeStreak(setOf('2026-05-23'), '2026-05-23', '2026-05-23')).toMatchObject({
      current: 1
    });
  });

  it('ignores completions for future dates (clock skew defense)', () => {
    expect(computeStreak(setOf('2027-01-01', '2026-05-23'), '2026-05-23', created)).toMatchObject({
      current: 1, status: 'on'
    });
  });

  it('computes longest across history', () => {
    const dates = setOf(
      '2026-05-23', '2026-05-22',
      '2026-05-19', '2026-05-18', '2026-05-17',
      '2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11', '2026-05-10'
    );
    const r = computeStreak(dates, '2026-05-23', '2026-05-01');
    expect(r.longest).toBe(5);
  });

  it('totalDays counts unique completions', () => {
    const dates = setOf('2026-05-23', '2026-05-22', '2026-05-15');
    expect(computeStreak(dates, '2026-05-23', created).totalDays).toBe(3);
  });
});
