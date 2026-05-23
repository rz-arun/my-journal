import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, type Habit, type Tag } from '../src/lib/db';
import {
  getActiveHabits, toggleCompletion, getCompletionsForHabit, setDayNoteText
} from '../src/lib/db';

describe('db schema', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('has all five tables', () => {
    expect(db.habits).toBeDefined();
    expect(db.tags).toBeDefined();
    expect(db.completions).toBeDefined();
    expect(db.dayNotes).toBeDefined();
    expect(db.adHocTodos).toBeDefined();
  });

  it('round-trips a habit', async () => {
    const h: Habit = {
      id: 'h1',
      name: 'Study Rust',
      emoji: '📚',
      tagIds: ['career'],
      createdAt: Date.now(),
      archivedAt: null,
      sortOrder: 0
    };
    await db.habits.put(h);
    expect(await db.habits.get('h1')).toEqual(h);
  });

  it('round-trips a tag', async () => {
    const t: Tag = { id: 'career', name: 'Career', color: '#7ab4ff' };
    await db.tags.put(t);
    expect(await db.tags.get('career')).toEqual(t);
  });

  it('completions use composite key [habitId+date]', async () => {
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: Date.now() });
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: Date.now() });
    const all = await db.completions.where({ habitId: 'h1' }).toArray();
    expect(all).toHaveLength(1);
  });

  it('queries completions by date', async () => {
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: 1 });
    await db.completions.put({ habitId: 'h2', date: '2026-05-23', completedAt: 1 });
    await db.completions.put({ habitId: 'h1', date: '2026-05-22', completedAt: 1 });
    const today = await db.completions.where('date').equals('2026-05-23').toArray();
    expect(today).toHaveLength(2);
  });
});

describe('db helpers', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('getActiveHabits returns non-archived in sortOrder', async () => {
    await db.habits.bulkPut([
      { id: 'a', name: 'A', tagIds: [], createdAt: 1, archivedAt: null, sortOrder: 2 },
      { id: 'b', name: 'B', tagIds: [], createdAt: 1, archivedAt: 999, sortOrder: 1 },
      { id: 'c', name: 'C', tagIds: [], createdAt: 1, archivedAt: null, sortOrder: 1 }
    ]);
    const active = await getActiveHabits();
    expect(active.map(h => h.id)).toEqual(['c', 'a']);
  });

  it('toggleCompletion adds when absent, removes when present', async () => {
    const result1 = await toggleCompletion('h1', '2026-05-23');
    expect(result1).toBe(true);
    expect((await db.completions.toArray())).toHaveLength(1);

    const result2 = await toggleCompletion('h1', '2026-05-23');
    expect(result2).toBe(false);
    expect((await db.completions.toArray())).toHaveLength(0);
  });

  it('getCompletionsForHabit returns set of date strings', async () => {
    await db.completions.bulkPut([
      { habitId: 'h1', date: '2026-05-23', completedAt: 1 },
      { habitId: 'h1', date: '2026-05-22', completedAt: 1 },
      { habitId: 'h2', date: '2026-05-23', completedAt: 1 }
    ]);
    const s = await getCompletionsForHabit('h1');
    expect(s.has('2026-05-23')).toBe(true);
    expect(s.has('2026-05-22')).toBe(true);
    expect(s.size).toBe(2);
  });

  it('setDayNoteText creates and updates', async () => {
    await setDayNoteText('2026-05-23', 'first');
    await setDayNoteText('2026-05-23', 'second');
    expect((await db.dayNotes.get('2026-05-23'))?.text).toBe('second');
  });

  it('mood and text persist independently on the same day', async () => {
    const { setDayNoteMood, getDayNoteRecord } = await import('../src/lib/db');
    await setDayNoteText('2026-05-24', 'good day');
    await setDayNoteMood('2026-05-24', 4);
    let rec = await getDayNoteRecord('2026-05-24');
    expect(rec.text).toBe('good day');
    expect(rec.mood).toBe(4);

    // Updating text should preserve mood
    await setDayNoteText('2026-05-24', 'great day');
    rec = await getDayNoteRecord('2026-05-24');
    expect(rec.text).toBe('great day');
    expect(rec.mood).toBe(4);

    // Clearing mood should preserve text
    await setDayNoteMood('2026-05-24', undefined);
    rec = await getDayNoteRecord('2026-05-24');
    expect(rec.text).toBe('great day');
    expect(rec.mood).toBeUndefined();
  });
});
