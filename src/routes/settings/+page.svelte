<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { db } from '$lib/db';
  import { exportAll, downloadBundle, previewImport, applyImport, recordExportTimestamp, type BackupBundle, type ImportDiff } from '$lib/backup';
  import { bumpData } from '$lib/store';

  const APP_VERSION = '0.1.0';

  type ImportState =
    | { stage: 'idle' }
    | { stage: 'preview'; bundle: BackupBundle; diff: ImportDiff }
    | { stage: 'error'; message: string };

  let importState = $state<ImportState>({ stage: 'idle' });
  let resetConfirm = $state('');

  async function onExport() {
    const b = await exportAll();
    downloadBundle(b);
    recordExportTimestamp();
  }

  async function onImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as BackupBundle;
      if (bundle.backupVersion !== 1) throw new Error(`Unsupported version: ${bundle.backupVersion}`);
      const diff = await previewImport(bundle);
      importState = { stage: 'preview', bundle, diff };
    } catch (err) {
      importState = { stage: 'error', message: String(err) };
    }
  }

  async function confirmImport() {
    if (importState.stage !== 'preview') return;
    await applyImport(importState.bundle);
    importState = { stage: 'idle' };
    bumpData();
  }

  async function onReset() {
    if (resetConfirm !== 'DELETE') return;
    await db.delete();
    await db.open();
    bumpData();
    resetConfirm = '';
    goto(`${base}/`);
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <a href="{base}/habits/" class="text-sm text-neutral-500">← Habits</a>
  <h1 class="text-2xl font-semibold mt-2">Settings</h1>

  <section class="mt-6">
    <button class="w-full bg-emerald-500 text-black rounded-lg py-3 font-medium" onclick={onExport}>
      Export data
    </button>
    <p class="text-xs text-neutral-500 mt-2">Downloads a JSON file containing every habit, completion, note, and todo.</p>
  </section>

  <section class="mt-8">
    <label class="block w-full bg-neutral-900 rounded-lg py-3 text-center text-sm font-medium cursor-pointer">
      Import data
      <input type="file" accept="application/json" class="hidden" onchange={onImportFile} />
    </label>
    {#if importState.stage === 'preview'}
      <div class="mt-3 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm">
        <div class="text-neutral-400 mb-2">This will add:</div>
        <ul class="text-xs space-y-1 text-neutral-300">
          <li>{importState.diff.habitsAdded} habits</li>
          <li>{importState.diff.tagsAdded} tags</li>
          <li>{importState.diff.completionsAdded} completions</li>
          <li>{importState.diff.dayNotesAdded} day notes</li>
          <li>{importState.diff.adHocTodosAdded} ad-hoc todos</li>
        </ul>
        <p class="text-xs text-neutral-500 mt-2">Existing data is preserved; nothing is overwritten.</p>
        <div class="mt-3 flex gap-2 justify-end">
          <button class="text-sm text-neutral-500 px-3 py-1.5" onclick={() => importState = { stage: 'idle' }}>Cancel</button>
          <button class="text-sm bg-emerald-500 text-black px-3 py-1.5 rounded font-medium" onclick={confirmImport}>Confirm import</button>
        </div>
      </div>
    {:else if importState.stage === 'error'}
      <p class="text-xs text-red-400 mt-2">{importState.message}</p>
    {/if}
  </section>

  <section class="mt-10">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Danger zone</div>
    <input
      class="w-full bg-neutral-900 rounded px-3 py-2 text-sm outline-none"
      placeholder='Type "DELETE" to enable reset'
      bind:value={resetConfirm} />
    <button
      class="w-full mt-2 bg-red-500/20 text-red-400 rounded-lg py-3 text-sm font-medium disabled:opacity-30"
      disabled={resetConfirm !== 'DELETE'}
      onclick={onReset}>Reset all data</button>
  </section>

  <p class="text-xs text-neutral-700 mt-10 text-center">My Journal v{APP_VERSION}</p>
</main>
