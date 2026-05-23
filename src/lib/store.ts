import { writable } from 'svelte/store';
import { todayLocal, type DateStr } from './date';

/** The "current day" the UI is showing. Updated at midnight. */
export const today = writable<DateStr>(todayLocal());

/** Trigger a refresh whenever data mutates. Components subscribe to re-fetch. */
export const dataVersion = writable<number>(0);

export function bumpData() {
  dataVersion.update(v => v + 1);
}

/** Schedule a refresh of `today` at the next local midnight. */
export function scheduleMidnightTick(): () => void {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ms = midnight.getTime() - now.getTime();
  const handle = setTimeout(() => {
    today.set(todayLocal());
    scheduleMidnightTick();
  }, ms);
  return () => clearTimeout(handle);
}
