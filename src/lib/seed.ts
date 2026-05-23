import { db, type Habit, type Tag } from './db';

const SEED_TAGS: Tag[] = [
  { id: 'career', name: 'Career', color: '#7ab4ff' },
  { id: 'health', name: 'Health', color: '#7ad198' },
  { id: 'personal', name: 'Personal', color: '#d489d3' },
  { id: 'long-term', name: 'Long term', color: '#e3a44b' }
];

const SEED_HABITS: Habit[] = [
  { id: 's1', name: 'Study something new', emoji: '📚', tagIds: ['career', 'long-term'],
    createdAt: Date.now(), archivedAt: null, sortOrder: 0 },
  { id: 's2', name: 'Exercise 20 min', emoji: '🏃', tagIds: ['health'],
    createdAt: Date.now(), archivedAt: null, sortOrder: 1 },
  { id: 's3', name: 'Write something', emoji: '✍️', tagIds: ['personal'],
    createdAt: Date.now(), archivedAt: null, sortOrder: 2 }
];

/** Seeds tags and habits if the DB is empty. Safe to call on every load. */
export async function seedIfEmpty(): Promise<void> {
  const habitCount = await db.habits.count();
  if (habitCount > 0) return;
  await db.tags.bulkPut(SEED_TAGS);
  await db.habits.bulkPut(SEED_HABITS);
}
