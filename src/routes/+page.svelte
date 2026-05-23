<script lang="ts">
  import { db, getActiveHabits, getCompletionsForHabit, toggleCompletion, type Habit, type Tag } from '$lib/db';
  import { today as todayStore, dataVersion, bumpData } from '$lib/store';
  import HabitRow from '../components/HabitRow.svelte';

  const EMPTY_COMPLETIONS: ReadonlySet<string> = new Set();

  let habits = $state<Habit[]>([]);
  let completionsByHabit = $state(new Map<string, Set<string>>());
  let tagsById = $state(new Map<string, Tag>());

  async function load() {
    const list = await getActiveHabits();
    const allTags = await db.tags.toArray();
    const next = new Map<string, Set<string>>();
    for (const h of list) {
      next.set(h.id, await getCompletionsForHabit(h.id));
    }
    habits = list;
    tagsById = new Map(allTags.map(t => [t.id, t]));
    completionsByHabit = next;
  }

  // Re-load whenever the dataVersion ticks or today changes
  $effect(() => {
    $dataVersion;
    $todayStore;
    load();
  });

  async function onToggle(habit: Habit) {
    await toggleCompletion(habit.id, $todayStore);
    bumpData();
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <h1 class="text-2xl font-semibold">
    {new Date($todayStore + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
  </h1>

  <div class="mt-4">
    {#each habits as habit (habit.id)}
      <HabitRow
        {habit}
        today={$todayStore}
        completions={completionsByHabit.get(habit.id) ?? (EMPTY_COMPLETIONS as Set<string>)}
        {tagsById}
        onToggle={() => onToggle(habit)} />
    {/each}
  </div>
</main>
