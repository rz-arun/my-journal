<script lang="ts">
  import { prevDay, type DateStr } from '$lib/date';

  let { today, completions, days = 30 }: {
    today: DateStr;
    completions: Set<DateStr>;
    days?: number;
  } = $props();

  let cells = $derived.by(() => {
    const out: { date: DateStr; done: boolean; isToday: boolean }[] = [];
    let d = today;
    for (let i = 0; i < days; i++) {
      out.push({ date: d, done: completions.has(d), isToday: i === 0 });
      d = prevDay(d);
    }
    return out.reverse();
  });
</script>

<div class="flex gap-[1px]">
  {#each cells as c}
    <div class="w-1 h-2 rounded-[1px] {c.done ? 'bg-emerald-400' : 'bg-neutral-800'} {c.isToday ? 'outline outline-1 outline-emerald-400 outline-offset-[1px]' : ''}"></div>
  {/each}
</div>
