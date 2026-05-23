export type DateStr = string;  // YYYY-MM-DD in the local calendar

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function todayLocal(now: Date = new Date()): DateStr {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parse(d: DateStr): Date {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function prevDay(d: DateStr): DateStr {
  const dt = parse(d);
  dt.setDate(dt.getDate() - 1);
  return todayLocal(dt);
}

export function nextDay(d: DateStr): DateStr {
  const dt = parse(d);
  dt.setDate(dt.getDate() + 1);
  return todayLocal(dt);
}

export function daysBetween(start: DateStr, end: DateStr): number {
  const ms = parse(end).getTime() - parse(start).getTime();
  return Math.round(ms / 86_400_000);
}
