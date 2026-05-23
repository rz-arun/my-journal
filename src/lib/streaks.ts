import { prevDay, isScheduledFor, type DateStr, type HabitSchedule } from './date';

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
  habitCreatedAt: DateStr,
  schedule: HabitSchedule = 'daily'
): StreakResult {
  // Filter future completions (clock skew defense)
  const validCompletions = new Set<DateStr>();
  for (const d of completions) {
    if (d <= today) validCompletions.add(d);
  }

  // --- Current streak ---
  // Off-days are non-events: they don't increment, don't reset misses, don't break the streak.
  let current = 0;
  let cursor = today;

  // Today is open — counts only if completed (and scheduled), never as a miss.
  if (isScheduledFor(schedule, cursor) && validCompletions.has(cursor)) current++;
  cursor = prevDay(cursor);

  // Past days obey "never miss twice", counted only across scheduled days.
  let misses = 0;
  while (cursor >= habitCreatedAt) {
    if (isScheduledFor(schedule, cursor)) {
      if (validCompletions.has(cursor)) {
        current++;
        misses = 0;
      } else {
        misses++;
        if (misses >= 2) break;
      }
    }
    cursor = prevDay(cursor);
  }

  // --- Status ---
  // "Yesterday" / "day-before" walk only across scheduled days.
  const prevScheduled = (from: DateStr): DateStr | null => {
    let c = prevDay(from);
    while (c >= habitCreatedAt) {
      if (isScheduledFor(schedule, c)) return c;
      c = prevDay(c);
    }
    return null;
  };

  const lastScheduled = prevScheduled(today);
  const beforeLast = lastScheduled ? prevScheduled(lastScheduled) : null;
  let status: StreakStatus;

  const todayIsScheduled = isScheduledFor(schedule, today);
  if (todayIsScheduled && validCompletions.has(today)) {
    status = 'on';
  } else if (lastScheduled === null) {
    // No prior scheduled day in history — fresh.
    status = 'on';
  } else if (validCompletions.has(lastScheduled)) {
    status = 'on';
  } else if (validCompletions.size === 0) {
    status = 'on';
  } else if (beforeLast !== null && validCompletions.has(beforeLast)) {
    status = 'warning';
  } else {
    status = 'broken';
  }

  // --- Longest streak ---
  // Walk all completions in order; consecutive scheduled days OR one scheduled gap continue the run.
  const sorted = Array.from(validCompletions).sort();
  let longest = 0;
  if (sorted.length > 0) {
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      // Count scheduled days strictly between sorted[i-1] and sorted[i].
      let scheduledGap = 0;
      let c = prevDay(sorted[i]);
      while (c > sorted[i - 1]) {
        if (isScheduledFor(schedule, c)) scheduledGap++;
        c = prevDay(c);
      }
      // 0 gap = back-to-back scheduled days; 1 gap = one allowed miss — both continue.
      if (scheduledGap <= 1) {
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
