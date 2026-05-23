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
    <div class="flex items-center py-1.5 group">
      <button
        class="w-5 h-5 rounded mr-2.5 flex items-center justify-center {t.done ? 'bg-emerald-400' : 'border border-neutral-700'}"
        onclick={() => toggle(t.id)}
        aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}>
        {#if t.done}<span class="text-black text-xs font-bold">✓</span>{/if}
      </button>
      <span class="flex-1 text-sm {t.done ? 'text-neutral-500 line-through' : ''}">{t.text}</span>
      <button
        class="text-neutral-700 opacity-0 group-hover:opacity-100 text-xs px-1"
        onclick={() => remove(t.id)}
        aria-label="Delete todo">✕</button>
    </div>
  {/each}

  <form onsubmit={add} class="flex items-center py-1.5">
    <span class="w-5 h-5 mr-2.5 text-neutral-700 text-center text-sm">+</span>
    <input
      class="flex-1 bg-transparent text-sm placeholder-neutral-700 outline-none"
      placeholder="Add today's todo"
      bind:value={newText}
      type="text" />
  </form>
</section>
