<script lang="ts">
  import { setDayNoteText, setDayNoteMood, getDayNoteRecord, MOOD_EMOJI, type Mood } from '$lib/db';
  import { dataVersion } from '$lib/store';

  let { date }: { date: string } = $props();

  let text = $state('');
  let mood = $state<Mood | undefined>(undefined);
  let expanded = $state(false);

  const MOODS: Mood[] = [1, 2, 3, 4, 5];

  $effect(() => {
    $dataVersion;
    date;
    (async () => {
      const rec = await getDayNoteRecord(date);
      text = rec.text;
      mood = rec.mood;
    })();
  });

  async function onBlur() {
    await setDayNoteText(date, text.trim());
    if (text.trim() === '') expanded = false;
    dataVersion.update(v => v + 1);
  }

  async function pickMood(m: Mood) {
    const next = mood === m ? undefined : m;
    mood = next;
    await setDayNoteMood(date, next);
    dataVersion.update(v => v + 1);
  }
</script>

<section class="mt-3 pt-3 border-t border-neutral-900">
  <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Mood</div>
  <div class="flex justify-between gap-1 mb-4">
    {#each MOODS as m}
      {@const selected = mood === m}
      <button
        type="button"
        onclick={() => pickMood(m)}
        class="flex-1 aspect-square rounded-lg text-2xl transition-colors
               {selected ? 'bg-neutral-800 ring-1 ring-neutral-600' : 'bg-neutral-950 hover:bg-neutral-900'}
               {mood !== undefined && !selected ? 'opacity-40' : ''}"
        aria-label="Mood {m}"
        aria-pressed={selected}>
        {MOOD_EMOJI[m]}
      </button>
    {/each}
  </div>

  <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Note</div>
  {#if expanded || text}
    <textarea
      class="w-full bg-transparent text-sm text-neutral-200 outline-none resize-none"
      rows="4"
      placeholder="How was today?"
      bind:value={text}
      onblur={onBlur}></textarea>
  {:else}
    <button
      class="text-sm text-neutral-600 italic"
      onclick={() => expanded = true}>Add a note about today…</button>
  {/if}
</section>
