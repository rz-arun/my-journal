import { prevDay, type DateStr } from './date';

export type StreakStatus = 'on' | 'warning' | 'broken';

export interface StreakResult {
  current: number;
  status: StreakStatus;
  longest: number;
  totalDays: number;
}

export function computeStreak(
  completions: Set<DateStr>,
  today: DateStr,
  habitCreatedAt: DateStr
): StreakResult {
  // Filter future completions (clock skew defense)
  const validCompletions = new Set<DateStr>();
  for (const d of completions) {
    if (d <= today) validCompletions.add(d);
  }

  // --- Current streak ---
  let current = 0;
  let cursor = today;

  // Today is open — counts only if completed, never as a miss
  if (validCompletions.has(cursor)) current++;
  cursor = prevDay(cursor);

  // Past days obey "never miss twice"
  let misses = 0;
  while (cursor >= habitCreatedAt) {
    if (validCompletions.has(cursor)) {
      current++;
      misses = 0;
    } else {
      misses++;
      if (misses >= 2) break;
    }
    cursor = prevDay(cursor);
  }

  // --- Status ---
  const yesterday = prevDay(today);
  const dayBefore = prevDay(yesterday);
  let status: StreakStatus;

  if (validCompletions.has(today)) {
    // Today is done — streak is alive
    status = 'on';
  } else if (yesterday < habitCreatedAt) {
    // Habit was just created today; no history to evaluate
    status = 'on';
  } else if (validCompletions.has(yesterday)) {
    // Yesterday done, today still open — no jeopardy
    status = 'on';
  } else if (validCompletions.size === 0) {
    // Never started — not broken, just fresh
    status = 'on';
  } else {
    // Yesterday was missed; check day-before
    const dBefore = dayBefore >= habitCreatedAt;
    if (dBefore && validCompletions.has(dayBefore)) {
      status = 'warning';
    } else {
      status = 'broken';
    }
  }

  // --- Longest streak (walk all completions, same rule) ---
  const sorted = Array.from(validCompletions).sort();
  let longest = 0;
  if (sorted.length > 0) {
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86_400_000;
      if (gap === 1) {
        run++;
      } else if (gap === 2) {
        run++;
      } else {
        longest = Math.max(longest, run);
        run = 1;
      }
    }
    longest = Math.max(longest, run);
  }

  longest = Math.max(longest, current);

  return {
    current,
    status,
    longest,
    totalDays: validCompletions.size
  };
}
