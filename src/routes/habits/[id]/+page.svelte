<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { db, getCompletionsForHabit, type Habit, type Tag } from '$lib/db';
  import { todayLocal, tsToDateStr, isScheduledFor, type DateStr } from '$lib/date';
  import { computeStreak } from '$lib/streaks';
  import { dataVersion } from '$lib/store';
  import TagPill from '../../../components/TagPill.svelte';

  type MonthGrid = {
    label: string;        // "May 2026"
    year: number;
    month: number;        // 0-indexed
    leadingBlanks: number; // empty cells before day 1 (Mon-start week)
    days: { day: number; date: DateStr; done: boolean; isFuture: boolean; isToday: boolean; isScheduled: boolean }[];
    monthCompletions: number;
    monthDaysToShow: number; // elapsed *scheduled* days (denominator for the % readout)
  };

  const SCHEDULE_LABEL: Record<string, string> = {
    daily: 'Daily',
    weekdays: 'Weekdays',
    weekends: 'Weekends'
  };

  let habit = $state<Habit | null>(null);
  let completions = $state<Set<DateStr>>(new Set());
  let tags = $state<Tag[]>([]);

  // Resolve the habit + data
  $effect(() => {
    $dataVersion;
    const id = $page.params.id;
    if (!id) return;
    (async () => {
      habit = (await db.habits.get(id)) ?? null;
      if (!habit) return;
      completions = await getCompletionsForHabit(id);
      const tagMap = new Map((await db.tags.toArray()).map(t => [t.id, t]));
      tags = habit.tagIds.map(tid => tagMap.get(tid)).filter((t): t is Tag => !!t);
    })();
  });

  const today = $derived(todayLocal());

  const streak = $derived.by(() => {
    if (!habit) return null;
    return computeStreak(completions, today, tsToDateStr(habit.createdAt), habit.schedule ?? 'daily');
  });

  function buildMonthGrid(year: number, month: number, todayStr: DateStr, completionsSet: Set<DateStr>, schedule: Habit['schedule']): MonthGrid {
    const first = new Date(year, month, 1);
    const firstDow = first.getDay(); // 0=Sun
    // Convert to Mon-start: shift so Monday=0, Sunday=6
    const leadingBlanks = (firstDow + 6) % 7;
    const daysCount = new Date(year, month + 1, 0).getDate();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const days: MonthGrid['days'] = [];
    let monthCompletions = 0;
    let elapsedScheduled = 0;
    for (let d = 1; d <= daysCount; d++) {
      const date: DateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const done = completionsSet.has(date);
      const isFuture = date > todayStr;
      const isToday = date === todayStr;
      const isScheduled = isScheduledFor(schedule, date);
      days.push({ day: d, date, done, isFuture, isToday, isScheduled });
      if (done && isScheduled) monthCompletions++;
      if (!isFuture && isScheduled) elapsedScheduled++;
    }

    return {
      label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      year, month, leadingBlanks, days,
      monthCompletions,
      monthDaysToShow: elapsedScheduled
    };
  }

  const months = $derived.by(() => {
    if (!habit) return [] as MonthGrid[];
    const now = new Date();
    const sched = habit.schedule;
    const cur = buildMonthGrid(now.getFullYear(), now.getMonth(), today, completions, sched);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = buildMonthGrid(prevDate.getFullYear(), prevDate.getMonth(), today, completions, sched);
    return [cur, prev];
  });

  function pct(c: number, total: number) {
    if (total === 0) return 0;
    return Math.round((c / total) * 100);
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <a href="{base}/" class="text-sm text-neutral-500">← Today</a>

  {#if habit}
    <div class="mt-3 flex items-center gap-3">
      <div class="text-3xl">{habit.emoji ?? '•'}</div>
      <div class="flex-1 min-w-0">
        <h1 class="text-xl font-semibold truncate">{habit.name}</h1>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-[10px] uppercase tracking-wider text-neutral-500 border border-neutral-800 rounded px-1.5 py-0.5">
            {SCHEDULE_LABEL[habit.schedule ?? 'daily']}
          </span>
          {#each tags as t}<TagPill tag={t} />{/each}
        </div>
      </div>
    </div>

    {#if streak}
      <div class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div class="bg-neutral-950 border border-neutral-900 rounded-lg py-3">
          <div class="text-[10px] uppercase tracking-wider text-neutral-500">Current</div>
          <div class="text-lg font-semibold {streak.status === 'broken' ? 'text-neutral-500' : streak.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}">
            {streak.status === 'broken' ? '—' : `${streak.current}d`}
          </div>
        </div>
        <div class="bg-neutral-950 border border-neutral-900 rounded-lg py-3">
          <div class="text-[10px] uppercase tracking-wider text-neutral-500">Longest</div>
          <div class="text-lg font-semibold">{streak.longest}d</div>
        </div>
        <div class="bg-neutral-950 border border-neutral-900 rounded-lg py-3">
          <div class="text-[10px] uppercase tracking-wider text-neutral-500">Total</div>
          <div class="text-lg font-semibold">{streak.totalDays}</div>
        </div>
      </div>
    {/if}

    {#each months as m, idx (m.year + '-' + m.month)}
      <section class="mt-6">
        <div class="flex items-baseline justify-between">
          <h2 class="text-sm font-medium">{m.label}</h2>
          <span class="text-[10px] text-neutral-500">
            {m.monthCompletions}/{m.monthDaysToShow}
            {#if m.monthDaysToShow > 0}· {pct(m.monthCompletions, m.monthDaysToShow)}%{/if}
          </span>
        </div>

        <div class="mt-2 grid grid-cols-7 gap-1 text-[10px] text-neutral-500 text-center">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>

        <div class="mt-1 grid grid-cols-7 gap-1">
          {#each Array(m.leadingBlanks) as _}
            <div></div>
          {/each}
          {#each m.days as d (d.date)}
            <div
              class="aspect-square rounded flex items-center justify-center text-[10px]
                {d.done && d.isScheduled ? 'bg-emerald-400 text-black font-semibold' :
                 !d.isScheduled ? 'bg-neutral-950 text-neutral-700 border border-dashed border-neutral-800' :
                 d.isFuture ? 'bg-neutral-950 text-neutral-700' :
                 'bg-neutral-900 text-neutral-500'}
                {d.isToday ? 'outline outline-1 outline-emerald-400 outline-offset-1' : ''}"
              title={d.isScheduled ? d.date : `${d.date} (off-day)`}>
              {d.day}
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    <p class="mt-6 text-sm text-neutral-500">Habit not found.</p>
  {/if}
</main>
