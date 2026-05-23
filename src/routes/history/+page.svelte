<script lang="ts">
  import { db, type Habit, type Tag, type AdHocTodo, getAdHocTodosForDate, getDayNote } from '$lib/db';
  import { prevDay, todayLocal, type DateStr } from '$lib/date';
  import { dataVersion } from '$lib/store';

  type DayData = {
    date: DateStr;
    completedHabits: Habit[];
    note: string;
    todos: AdHocTodo[];
  };

  let habits = $state<Habit[]>([]);
  let tagsById = $state(new Map<string, Tag>());
  let days = $state<DayData[]>([]);
  let expanded = $state(new Set<DateStr>());

  const PAGE = 30;
  let limit = $state(PAGE);

  async function load() {
    const allHabits = await db.habits.toArray();
    const allTags = await db.tags.toArray();
    const today = todayLocal();
    const result: DayData[] = [];
    let d = today;
    for (let i = 0; i < limit; i++) {
      const rows = await db.completions.where('date').equals(d).toArray();
      const completedIds = new Set(rows.map(c => c.habitId));
      const completedHabits = allHabits.filter(h => completedIds.has(h.id));
      const note = await getDayNote(d);
      const todos = await getAdHocTodosForDate(d);
      result.push({ date: d, completedHabits, note, todos });
      d = prevDay(d);
    }
    habits = allHabits;
    tagsById = new Map(allTags.map(t => [t.id, t]));
    days = result;
  }

  $effect(() => {
    $dataVersion;
    limit;
    load();
  });

  function toggle(date: DateStr) {
    const next = new Set(expanded);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    expanded = next;
  }

  function fmt(date: DateStr) {
    // Parse as local — `new Date("YYYY-MM-DD")` is UTC midnight, which can shift the day in negative-UTC zones
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function activeHabitCountOn(date: DateStr): number {
    const [y, m, d] = date.split('-').map(Number);
    const dayEndMs = new Date(y, m - 1, d, 23, 59, 59).getTime();
    return habits.filter(h => h.archivedAt === null || h.archivedAt > dayEndMs).length;
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <h1 class="text-2xl font-semibold">History</h1>

  <div class="mt-4 space-y-2">
    {#each days as d (d.date)}
      {@const isExpanded = expanded.has(d.date)}
      <button
        class="block w-full text-left bg-neutral-950 border border-neutral-900 rounded-lg p-3"
        onclick={() => toggle(d.date)}>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{fmt(d.date)}</span>
          <span class="text-[10px] text-neutral-500">{d.completedHabits.length}/{activeHabitCountOn(d.date)}</span>
        </div>
        <div class="flex gap-1 mt-2">
          {#each habits as h}
            {@const done = d.completedHabits.some(c => c.id === h.id)}
            <div class="w-2 h-2 rounded-sm {done ? 'bg-emerald-400' : 'bg-neutral-800'}"
                 title={h.name}></div>
          {/each}
        </div>

        {#if isExpanded}
          <div class="mt-3 pt-3 border-t border-neutral-900 space-y-2">
            {#each d.completedHabits as h}
              <div class="text-xs text-neutral-300 flex items-center gap-2">
                <span>{h.emoji ?? '•'}</span><span>{h.name}</span>
              </div>
            {/each}
            {#if d.note}
              <div class="text-xs text-neutral-400 italic mt-2">"{d.note}"</div>
            {/if}
            {#if d.todos.length}
              <div class="text-xs text-neutral-500 mt-2">
                {d.todos.filter(t => t.done).length}/{d.todos.length} todos done
              </div>
            {/if}
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <button
    class="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 rounded-lg py-3 text-sm font-medium"
    onclick={() => limit += PAGE}>Load more</button>
</main>
