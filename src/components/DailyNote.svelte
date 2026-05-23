<script lang="ts">
  import { upsertDayNote, getDayNote } from '$lib/db';
  import { dataVersion } from '$lib/store';

  let { date }: { date: string } = $props();

  let text = $state('');
  let expanded = $state(false);

  $effect(() => {
    $dataVersion;
    date;
    (async () => {
      text = await getDayNote(date);
    })();
  });

  async function onBlur() {
    await upsertDayNote(date, text.trim());
    if (text.trim() === '') expanded = false;
  }
</script>

<section class="mt-3 pt-3 border-t border-neutral-900">
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
