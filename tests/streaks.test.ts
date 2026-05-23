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
      current: 0, status: 'broken', longest: 2
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

// 2026-05-23 is a Saturday. Mon=18, Tue=19, Wed=20, Thu=21, Fri=22, Sat=23, Sun=24
describe('computeStreak — weekdays-only schedule', () => {
  const created = '2025-01-01';

  it('does not penalize Saturday when the habit only runs on weekdays', () => {
    // Mon–Fri done, no completion today (Sat) — schedule says today is an off-day.
    const dates = setOf('2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22');
    expect(computeStreak(dates, '2026-05-23', created, 'weekdays')).toMatchObject({
      current: 5, status: 'on'
    });
  });

  it('counts a 5-day weekday run regardless of weekend gap', () => {
    // Two work weeks complete; weekend in the middle (Sat 16, Sun 17) is invisible to the streak.
    const dates = setOf(
      '2026-05-22', '2026-05-21', '2026-05-20', '2026-05-19', '2026-05-18',
      '2026-05-15', '2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11'
    );
    expect(computeStreak(dates, '2026-05-23', created, 'weekdays')).toMatchObject({
      current: 10, status: 'on'
    });
  });

  it('breaks when the last two weekdays are missed', () => {
    // Wed done, then Thu + Fri missed; today is Sat (off-day).
    const dates = setOf('2026-05-20');
    expect(computeStreak(dates, '2026-05-23', created, 'weekdays')).toMatchObject({
      current: 0, status: 'broken'
    });
  });

  it('allows one skipped weekday inside a run (never miss twice)', () => {
    // Mon–Wed + Fri done, Thu missed → streak continues across the single weekday gap.
    const dates = setOf('2026-05-22', '2026-05-20', '2026-05-19', '2026-05-18');
    const r = computeStreak(dates, '2026-05-23', created, 'weekdays');
    expect(r).toMatchObject({ current: 4, status: 'on' });
  });
});

describe('computeStreak — weekends-only schedule', () => {
  const created = '2025-01-01';

  it('counts back-to-back weekends as a continuous streak', () => {
    // Sat 23 (today), Sun 17, Sat 16 — Mon–Fri between are invisible.
    const dates = setOf('2026-05-23', '2026-05-17', '2026-05-16');
    expect(computeStreak(dates, '2026-05-23', created, 'weekends')).toMatchObject({
      current: 3, status: 'on'
    });
  });

  it('ignores a Wednesday completion entirely for a weekends habit', () => {
    // Today (Sat) not done, last scheduled (Sun 17) not done either → broken,
    // even though there is a midweek completion in history.
    const dates = setOf('2026-05-20');
    expect(computeStreak(dates, '2026-05-23', created, 'weekends')).toMatchObject({
      current: 0, status: 'broken'
    });
  });
});
