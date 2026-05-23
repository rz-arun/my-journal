import Dexie, { type Table } from 'dexie';
import type { DateStr } from './date';

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  tagIds: string[];
  createdAt: number;
  archivedAt: number | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Completion {
  habitId: string;
  date: DateStr;
  completedAt: number;
}

export interface DayNote {
  date: DateStr;
  text: string;
  updatedAt: number;
}

export interface AdHocTodo {
  id: string;
  date: DateStr;
  text: string;
  done: boolean;
  doneAt: number | null;
}

class JournalDB extends Dexie {
  habits!: Table<Habit, string>;
  tags!: Table<Tag, string>;
  completions!: Table<Completion, [string, DateStr]>;
  dayNotes!: Table<DayNote, DateStr>;
  adHocTodos!: Table<AdHocTodo, string>;

  constructor() {
    super('myjournal');
    this.version(1).stores({
      habits: 'id, archivedAt, sortOrder',
      tags: 'id',
      completions: '[habitId+date], date, habitId',
      dayNotes: 'date',
      adHocTodos: 'id, date'
    });
  }
}

export const db = new JournalDB();

// --- Helpers ---

export async function getActiveHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray();
  return all
    .filter(h => h.archivedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getArchivedHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray();
  return all
    .filter(h => h.archivedAt !== null)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
}

/** Returns `true` if completion was added, `false` if removed. */
export async function toggleCompletion(habitId: string, date: DateStr): Promise<boolean> {
  const existing = await db.completions.get([habitId, date]);
  if (existing) {
    await db.completions.delete([habitId, date]);
    return false;
  }
  await db.completions.put({ habitId, date, completedAt: Date.now() });
  return true;
}

export async function getCompletionsForHabit(habitId: string): Promise<Set<DateStr>> {
  const rows = await db.completions.where('habitId').equals(habitId).toArray();
  return new Set(rows.map(r => r.date));
}

export async function getCompletionsForDate(date: DateStr): Promise<Set<string>> {
  const rows = await db.completions.where('date').equals(date).toArray();
  return new Set(rows.map(r => r.habitId));
}

export async function upsertDayNote(date: DateStr, text: string): Promise<void> {
  await db.dayNotes.put({ date, text, updatedAt: Date.now() });
}

export async function getDayNote(date: DateStr): Promise<string> {
  return (await db.dayNotes.get(date))?.text ?? '';
}

export async function addAdHocTodo(date: DateStr, text: string): Promise<void> {
  await db.adHocTodos.put({
    id: crypto.randomUUID(),
    date, text, done: false, doneAt: null
  });
}

export async function toggleAdHocTodo(id: string): Promise<void> {
  const t = await db.adHocTodos.get(id);
  if (!t) return;
  await db.adHocTodos.put({
    ...t,
    done: !t.done,
    doneAt: !t.done ? Date.now() : null
  });
}

export async function deleteAdHocTodo(id: string): Promise<void> {
  await db.adHocTodos.delete(id);
}

export async function getAdHocTodosForDate(date: DateStr): Promise<AdHocTodo[]> {
  return db.adHocTodos.where('date').equals(date).toArray();
}

export async function moveHabit(habitId: string, direction: 'up' | 'down'): Promise<void> {
  const active = await getActiveHabits();
  const idx = active.findIndex(h => h.id === habitId);
  if (idx < 0) return;
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= active.length) return;
  const a = active[idx], b = active[swap];
  await db.habits.bulkPut([
    { ...a, sortOrder: b.sortOrder },
    { ...b, sortOrder: a.sortOrder }
  ]);
}
