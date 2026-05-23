<script lang="ts">
  import { db, getActiveHabits, getCompletionsForHabit, toggleCompletion, type Habit, type Tag } from '$lib/db';
  import { today as todayStore, dataVersion, bumpData } from '$lib/store';
  import { prevDay, isScheduledFor } from '$lib/date';
  import HabitRow from '../components/HabitRow.svelte';
  import AdHocTodos from '../components/AdHocTodos.svelte';
  import DailyNote from '../components/DailyNote.svelte';
  import BackupBanner from '../components/BackupBanner.svelte';

  const EMPTY_COMPLETIONS: ReadonlySet<string> = new Set();

  let habits = $state<Habit[]>([]);
  let completionsByHabit = $state(new Map<string, Set<string>>());
  let tagsById = $state(new Map<string, Tag>());

  // Only the habits actually scheduled for today are shown in the main list.
  let todaysHabits = $derived(habits.filter(h => isScheduledFor(h.schedule, $todayStore)));

  let last7 = $derived.by(() => {
    const out: { date: string; ratio: number; isToday: boolean }[] = [];
    let d = $todayStore;
    for (let i = 0; i < 7; i++) {
      // Per-day denominator: habits scheduled for *that* day.
      const scheduled = habits.filter(h => isScheduledFor(h.schedule, d));
      let done = 0;
      for (const h of scheduled) {
        const set = completionsByHabit.get(h.id);
        if (set && set.has(d)) done++;
      }
      out.unshift({
        date: d,
        ratio: scheduled.length === 0 ? 0 : done / scheduled.length,
        isToday: i === 0
      });
      d = prevDay(d);
    }
    return out;
  });

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
  <BackupBanner />
  <h1 class="text-2xl font-semibold">
    {new Date($todayStore + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
  </h1>

  <div class="flex items-center gap-2 mt-2">
    <span class="text-[10px] uppercase tracking-wider text-neutral-500">Last 7</span>
    <div class="flex gap-1">
      {#each last7 as d}
        <div
          class="w-3 h-3 rounded-sm {d.isToday ? 'outline outline-1 outline-emerald-400 outline-offset-1' : ''}"
          style="background: {d.ratio === 0 ? '#1a1a1a' : d.ratio < 0.5 ? '#0e3b1f' : d.ratio < 1 ? '#1d6b35' : '#48d36a'}"
          title={d.date}
        ></div>
      {/each}
    </div>
  </div>

  <div class="mt-4">
    {#each todaysHabits as habit (habit.id)}
      <HabitRow
        {habit}
        today={$todayStore}
        completions={completionsByHabit.get(habit.id) ?? (EMPTY_COMPLETIONS as Set<string>)}
        {tagsById}
        onToggle={() => onToggle(habit)} />
    {/each}
    {#if habits.length > 0 && todaysHabits.length === 0}
      <p class="text-sm text-neutral-500 py-6 text-center">
        Nothing scheduled today. Enjoy the off-day. 🌿
      </p>
    {/if}
  </div>

  <AdHocTodos date={$todayStore} />
  <DailyNote date={$todayStore} />
</main>
