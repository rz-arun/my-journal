<script lang="ts">
  import type { AdHocTodo } from '$lib/db';
  import { addAdHocTodo, toggleAdHocTodo, deleteAdHocTodo, getAdHocTodosForDate } from '$lib/db';
  import { bumpData, dataVersion } from '$lib/store';

  let { date }: { date: string } = $props();

  let items = $state<AdHocTodo[]>([]);
  let newText = $state('');

  $effect(() => {
    $dataVersion;
    date;
    (async () => {
      items = await getAdHocTodosForDate(date);
    })();
  });

  async function add(e: Event) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    await addAdHocTodo(date, text);
    newText = '';
    bumpData();
  }

  async function toggle(id: string) { await toggleAdHocTodo(id); bumpData(); }
  async function remove(id: string) { await deleteAdHocTodo(id); bumpData(); }
</script>

<section class="mt-4 pt-3 border-t border-neutral-900">
  <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Today's todos</div>

  {#each items as t (t.id)}
    <div class="flex items-center py-1.5">
      <button
        class="w-5 h-5 rounded mr-2.5 flex items-center justify-center shrink-0 {t.done ? 'bg-emerald-400' : 'border-2 border-neutral-500'}"
        onclick={() => toggle(t.id)}
        aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}>
        {#if t.done}<span class="text-black text-xs font-bold">✓</span>{/if}
      </button>
      <span class="flex-1 text-sm {t.done ? 'text-neutral-500 line-through' : ''}">{t.text}</span>
      <button
        class="text-neutral-500 hover:text-neutral-300 text-sm px-2 py-1"
        onclick={() => remove(t.id)}
        aria-label="Delete todo">✕</button>
    </div>
  {/each}

  <form onsubmit={add} class="flex items-center py-1.5">
    <button
      type="submit"
      class="w-5 h-5 mr-2.5 shrink-0 rounded border-2 border-dashed border-neutral-700 text-neutral-500 text-center text-sm leading-none flex items-center justify-center hover:border-neutral-500 hover:text-neutral-300"
      aria-label="Add todo">+</button>
    <input
      class="flex-1 bg-transparent text-sm placeholder-neutral-600 outline-none"
      placeholder="Add today's todo"
      bind:value={newText}
      type="text"
      enterkeyhint="done" />
  </form>
</section>
