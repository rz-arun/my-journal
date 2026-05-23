import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { exportAll, previewImport, applyImport } from '../src/lib/backup';

describe('backup', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('round-trips empty DB', async () => {
    const b = await exportAll();
    await applyImport(b);
    expect(await db.habits.count()).toBe(0);
  });

  it('round-trips populated DB without duplicating', async () => {
    await db.habits.put({ id: 'h1', name: 'A', tagIds: [], createdAt: 1, archivedAt: null, sortOrder: 0 });
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: 1 });

    const b = await exportAll();

    await db.delete(); await db.open();
    const diff = await previewImport(b);
    expect(diff.habitsAdded).toBe(1);

    await applyImport(b);
    expect(await db.habits.count()).toBe(1);

    // Apply again — idempotent
    await applyImport(b);
    expect(await db.habits.count()).toBe(1);
  });

  it('throws on unsupported backup version', async () => {
    const bundle = {
      backupVersion: 99,
      exportedAt: new Date().toISOString(),
      habits: [], tags: [], completions: [], dayNotes: [], adHocTodos: []
    };
    await expect(applyImport(bundle as any)).rejects.toThrow('Unsupported backup version');
  });
});
