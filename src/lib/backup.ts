import { db } from './db';

const BACKUP_VERSION = 1;

export interface BackupBundle {
  backupVersion: number;
  exportedAt: string;
  habits: unknown[];
  tags: unknown[];
  completions: unknown[];
  dayNotes: unknown[];
  adHocTodos: unknown[];
}

export async function exportAll(): Promise<BackupBundle> {
  return {
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    habits:      await db.habits.toArray(),
    tags:        await db.tags.toArray(),
    completions: await db.completions.toArray(),
    dayNotes:    await db.dayNotes.toArray(),
    adHocTodos:  await db.adHocTodos.toArray()
  };
}

export function downloadBundle(bundle: BackupBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `myjournal-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportDiff {
  habitsAdded: number;
  tagsAdded: number;
  completionsAdded: number;
  dayNotesAdded: number;
  adHocTodosAdded: number;
}

export async function previewImport(bundle: BackupBundle): Promise<ImportDiff> {
  const existing = {
    habits:      new Set((await db.habits.toArray()).map(h => h.id)),
    tags:        new Set((await db.tags.toArray()).map(t => t.id)),
    completions: new Set((await db.completions.toArray()).map(c => `${c.habitId}|${c.date}`)),
    dayNotes:    new Set((await db.dayNotes.toArray()).map(n => n.date)),
    adHocTodos:  new Set((await db.adHocTodos.toArray()).map(t => t.id))
  };
  return {
    habitsAdded:      (bundle.habits as { id: string }[]).filter(h => !existing.habits.has(h.id)).length,
    tagsAdded:        (bundle.tags as { id: string }[]).filter(t => !existing.tags.has(t.id)).length,
    completionsAdded: (bundle.completions as { habitId: string; date: string }[]).filter(c => !existing.completions.has(`${c.habitId}|${c.date}`)).length,
    dayNotesAdded:    (bundle.dayNotes as { date: string }[]).filter(n => !existing.dayNotes.has(n.date)).length,
    adHocTodosAdded:  (bundle.adHocTodos as { id: string }[]).filter(t => !existing.adHocTodos.has(t.id)).length
  };
}

/** Idempotent: existing rows by primary key are preserved unchanged. */
export async function applyImport(bundle: BackupBundle): Promise<void> {
  if (bundle.backupVersion !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${bundle.backupVersion}`);
  }

  await db.transaction('rw',
    [db.habits, db.tags, db.completions, db.dayNotes, db.adHocTodos],
    async () => {
      const existingHabits      = new Set((await db.habits.toArray()).map(h => h.id));
      const existingTags        = new Set((await db.tags.toArray()).map(t => t.id));
      const existingCompletions = new Set((await db.completions.toArray()).map(c => `${c.habitId}|${c.date}`));
      const existingNotes       = new Set((await db.dayNotes.toArray()).map(n => n.date));
      const existingTodos       = new Set((await db.adHocTodos.toArray()).map(t => t.id));

      await db.habits.bulkAdd((bundle.habits as any[]).filter(h => !existingHabits.has(h.id)));
      await db.tags.bulkAdd((bundle.tags as any[]).filter(t => !existingTags.has(t.id)));
      await db.completions.bulkAdd((bundle.completions as any[]).filter(c => !existingCompletions.has(`${c.habitId}|${c.date}`)));
      await db.dayNotes.bulkAdd((bundle.dayNotes as any[]).filter(n => !existingNotes.has(n.date)));
      await db.adHocTodos.bulkAdd((bundle.adHocTodos as any[]).filter(t => !existingTodos.has(t.id)));
    });
}

export function recordExportTimestamp() {
  localStorage.setItem('myjournal.lastExport', String(Date.now()));
}

export function getLastExportTimestamp(): number | null {
  const v = localStorage.getItem('myjournal.lastExport');
  return v ? Number(v) : null;
}
