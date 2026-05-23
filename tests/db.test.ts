import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, type Habit, type Tag } from '../src/lib/db';

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
