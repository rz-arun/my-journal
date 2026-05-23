<script lang="ts">
  import { base } from '$app/paths';
  import type { Habit, Tag } from '$lib/db';
  import { type DateStr, tsToDateStr } from '$lib/date';
  import { computeStreak, type StreakResult } from '$lib/streaks';
  import Chain from './Chain.svelte';
  import Checkbox from './Checkbox.svelte';
  import TagPill from './TagPill.svelte';

  let { habit, today, completions, tagsById, onToggle }: {
    habit: Habit;
    today: DateStr;
    completions: Set<DateStr>;
    tagsById: Map<string, Tag>;
    onToggle: () => void;
  } = $props();

  let createdDate = $derived(tsToDateStr(habit.createdAt));
  let streak = $derived(computeStreak(completions, today, createdDate));
  let checked = $derived(completions.has(today));
  let rowTags = $derived(habit.tagIds.map(id => tagsById.get(id)).filter((t): t is Tag => !!t));
  let primaryColor = $derived(rowTags[0]?.color ?? '#48d36a');

  function streakLabel(r: StreakResult): string {
    if (r.status === 'broken') return 'streak broken';
    return `${r.current}d`;
  }

  function streakColor(r: StreakResult): string {
    if (r.status === 'broken') return 'text-neutral-600';
    if (r.status === 'warning') return 'text-amber-400';
    return 'text-emerald-400';
  }
</script>

<div class="flex items-center py-3 border-b border-neutral-900">
  <a href="{base}/habits/{habit.id}/" class="flex items-center flex-1 min-w-0 hover:opacity-80 transition-opacity">
    <div class="text-xl w-7 flex-shrink-0">{habit.emoji ?? '•'}</div>
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium truncate">{habit.name}</div>
      {#if rowTags.length}
        <div class="flex gap-1 mt-1">
          {#each rowTags as t}<TagPill tag={t} />{/each}
        </div>
      {/if}
    </div>
  </a>
  <div class="flex flex-col items-end gap-1.5">
    <Chain {today} {completions} />
    <div class="flex items-center gap-2">
      <span class="text-[10px] {streakColor(streak)}">
        {streakLabel(streak)}{streak.status === 'warning' ? ' •' : ''}
      </span>
      <Checkbox {checked} color={primaryColor} {onToggle} />
    </div>
  </div>
</div>
