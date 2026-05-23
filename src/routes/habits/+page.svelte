<script lang="ts">
  import { db, getActiveHabits, getArchivedHabits, type Habit, type Tag } from '$lib/db';
  import { dataVersion, bumpData } from '$lib/store';
  import TagPill from '../../components/TagPill.svelte';

  let active = $state<Habit[]>([]);
  let archived = $state<Habit[]>([]);
  let tagsById = $state(new Map<string, Tag>());

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
  <h1 class="text-2xl font-semibold">Habits</h1>

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
</main>
