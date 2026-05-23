<script lang="ts">
  import { base } from '$app/paths';
  import { db, getActiveHabits, getArchivedHabits, moveHabit, type Habit, type Tag } from '$lib/db';
  import { dataVersion, bumpData } from '$lib/store';
  import TagPill from '../../components/TagPill.svelte';
  import AddHabitForm from '../../components/AddHabitForm.svelte';

  let active = $state<Habit[]>([]);
  let archived = $state<Habit[]>([]);
  let tagsById = $state(new Map<string, Tag>());
  let showForm = $state(false);
  let allTags = $derived(Array.from(tagsById.values()));

  $effect(() => {
    $dataVersion;
    (async () => {
      active = await getActiveHabits();
      archived = await getArchivedHabits();
      const tags = await db.tags.toArray();
      tagsById = new Map(tags.map(t => [t.id, t]));
    })();
  });

  async function archive(h: Habit) {
    await db.habits.put({ ...h, archivedAt: Date.now() });
    bumpData();
  }

  async function unarchive(h: Habit) {
    await db.habits.put({ ...h, archivedAt: null, sortOrder: active.length });
    bumpData();
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold">Habits</h1>
    <a href="{base}/settings/" class="text-neutral-500 text-lg" aria-label="Settings">⚙</a>
  </div>

  <section class="mt-6">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Active ({active.length})</div>
    {#each active as h (h.id)}
      <div class="flex items-center py-3 border-b border-neutral-900">
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
                onclick={() => moveHabit(h.id, 'up').then(bumpData)}>↑</button>
        <button class="text-neutral-500 px-1 text-xs disabled:opacity-30" disabled={active[active.length - 1].id === h.id}
                onclick={() => moveHabit(h.id, 'down').then(bumpData)}>↓</button>
        <button class="text-xs text-neutral-500 px-2" onclick={() => archive(h)}>Archive</button>
      </div>
    {:else}
      <p class="text-sm text-neutral-500">No active habits.</p>
    {/each}
  </section>

  {#if archived.length}
    <section class="mt-8">
      <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Archived ({archived.length})</div>
      {#each archived as h (h.id)}
        <div class="flex items-center py-3 border-b border-neutral-900 opacity-60">
          <div class="text-xl w-7">{h.emoji ?? '•'}</div>
          <div class="flex-1 text-sm">{h.name}</div>
          <button class="text-xs text-neutral-500 px-2" onclick={() => unarchive(h)}>Restore</button>
        </div>
      {/each}
    </section>
  {/if}

  {#if showForm}
    <AddHabitForm
      {allTags}
      onAdded={() => { showForm = false; bumpData(); }}
      onCancel={() => showForm = false} />
  {:else}
    <button
      class="mt-6 w-full bg-neutral-900 hover:bg-neutral-800 rounded-lg py-3 text-sm font-medium"
      onclick={() => showForm = true}>+ Add habit</button>
  {/if}
</main>
