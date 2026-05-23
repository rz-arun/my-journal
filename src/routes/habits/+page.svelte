<script lang="ts">
  import { base } from '$app/paths';
  import { db, getActiveHabits, getArchivedHabits, moveHabit, archiveHabit, unarchiveHabit, type Habit, type Tag } from '$lib/db';
  import { dataVersion, bumpData } from '$lib/store';
  import TagPill from '../../components/TagPill.svelte';
  import AddHabitForm from '../../components/AddHabitForm.svelte';

  let active = $state<Habit[]>([]);
  let archived = $state<Habit[]>([]);
  let tagsById = $state(new Map<string, Tag>());
  let showAddForm = $state(false);
  let editingId = $state<string | null>(null);
  let allTags = $derived(Array.from(tagsById.values()));
  let editingHabit = $derived(
    editingId
      ? (active.find(h => h.id === editingId) ?? archived.find(h => h.id === editingId) ?? null)
      : null
  );

  $effect(() => {
    $dataVersion;
    (async () => {
      active = await getActiveHabits();
      archived = await getArchivedHabits();
      const tags = await db.tags.toArray();
      tagsById = new Map(tags.map(t => [t.id, t]));
    })();
  });

  async function onArchive(id: string) {
    await archiveHabit(id);
    bumpData();
  }

  async function onUnarchive(id: string) {
    await unarchiveHabit(id);
    bumpData();
  }

  function startEdit(id: string) {
    showAddForm = false;
    editingId = id;
  }

  function startAdd() {
    editingId = null;
    showAddForm = true;
  }

  function cancelForm() {
    showAddForm = false;
    editingId = null;
  }

  function onSaved() {
    showAddForm = false;
    editingId = null;
    bumpData();
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold">Habits</h1>
    <a href="{base}/settings/" class="text-neutral-500 text-lg" aria-label="Settings">⚙</a>
  </div>

  {#if editingHabit}
    <div class="mt-4">
      <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Editing</div>
      <AddHabitForm
        {allTags}
        editing={editingHabit}
        onSaved={onSaved}
        onCancel={cancelForm} />
    </div>
  {/if}

  <section class="mt-6">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Active ({active.length})</div>
    {#each active as h (h.id)}
      {#if editingId !== h.id}
        <div class="flex items-center py-3 border-b border-neutral-900 gap-1">
          <div class="text-xl w-7">{h.emoji ?? '•'}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm">{h.name}</div>
            {#if h.tagIds.length}
              <div class="flex gap-1 mt-1">
                {#each h.tagIds as id}
                  {@const tag = tagsById.get(id)}
                  {#if tag}<TagPill {tag} />{/if}
                {/each}
              </div>
            {/if}
          </div>
          <button class="text-neutral-500 px-1 text-xs disabled:opacity-30" disabled={active[0].id === h.id}
                  onclick={() => moveHabit(h.id, 'up').then(bumpData)} aria-label="Move up">↑</button>
          <button class="text-neutral-500 px-1 text-xs disabled:opacity-30" disabled={active[active.length - 1].id === h.id}
                  onclick={() => moveHabit(h.id, 'down').then(bumpData)} aria-label="Move down">↓</button>
          <button class="text-neutral-500 px-1.5 text-xs" onclick={() => startEdit(h.id)} aria-label="Edit">✎</button>
          <button class="text-xs text-neutral-500 px-1.5" onclick={() => onArchive(h.id)}>Archive</button>
        </div>
      {/if}
    {:else}
      <p class="text-sm text-neutral-500">No active habits.</p>
    {/each}
  </section>

  {#if archived.length}
    <section class="mt-8">
      <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Archived ({archived.length})</div>
      {#each archived as h (h.id)}
        {#if editingId !== h.id}
          <div class="flex items-center py-3 border-b border-neutral-900 opacity-60 gap-1">
            <div class="text-xl w-7">{h.emoji ?? '•'}</div>
            <div class="flex-1 text-sm">{h.name}</div>
            <button class="text-neutral-500 px-1.5 text-xs" onclick={() => startEdit(h.id)} aria-label="Edit">✎</button>
            <button class="text-xs text-neutral-500 px-1.5" onclick={() => onUnarchive(h.id)}>Restore</button>
          </div>
        {/if}
      {/each}
    </section>
  {/if}

  {#if !editingHabit}
    {#if showAddForm}
      <AddHabitForm
        {allTags}
        onSaved={onSaved}
        onCancel={cancelForm} />
    {:else}
      <button
        class="mt-6 w-full bg-neutral-900 hover:bg-neutral-800 rounded-lg py-3 text-sm font-medium"
        onclick={startAdd}>+ Add habit</button>
    {/if}
  {/if}
</main>
