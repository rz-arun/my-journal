<script lang="ts">
  import { db, type Tag } from '$lib/db';

  let { allTags, onAdded, onCancel }: {
    allTags: Tag[];
    onAdded: () => void;
    onCancel: () => void;
  } = $props();

  const PALETTE = ['#7ab4ff', '#7ad198', '#d489d3', '#e3a44b', '#ff8181', '#a9d6e5'];

  let name = $state('');
  let emoji = $state('');
  let pickedTagIds = $state<string[]>([]);
  let newTagName = $state('');

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function ensureTagFromInput(): Promise<void> {
    const n = newTagName.trim();
    if (!n) return;
    const id = slugify(n);
    if (!id) return;
    if (!allTags.find(t => t.id === id)) {
      const color = PALETTE[allTags.length % PALETTE.length];
      await db.tags.put({ id, name: n, color });
    }
    if (!pickedTagIds.includes(id)) pickedTagIds = [...pickedTagIds, id];
    newTagName = '';
  }

  function toggleTag(id: string) {
    pickedTagIds = pickedTagIds.includes(id)
      ? pickedTagIds.filter(x => x !== id)
      : [...pickedTagIds, id];
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await ensureTagFromInput();
    const count = await db.habits.count();
    await db.habits.put({
      id: crypto.randomUUID(),
      name: trimmed,
      emoji: emoji.trim() || undefined,
      tagIds: [...pickedTagIds],
      createdAt: Date.now(),
      archivedAt: null,
      sortOrder: count
    });
    name = ''; emoji = ''; pickedTagIds = [];
    onAdded();
  }
</script>

<div class="bg-neutral-950 border border-neutral-800 rounded-lg p-4 mt-4">
  <input
    class="w-full bg-neutral-900 rounded px-3 py-2 text-sm outline-none"
    placeholder="Habit name (e.g. Study Rust 30 min)"
    bind:value={name} />
  <input
    class="w-24 mt-2 bg-neutral-900 rounded px-3 py-2 text-sm outline-none"
    placeholder="Emoji"
    bind:value={emoji}
    maxlength={2} />

  <div class="mt-3">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Tags</div>
    <div class="flex flex-wrap gap-2">
      {#each allTags as t (t.id)}
        {@const picked = pickedTagIds.includes(t.id)}
        <button type="button"
          class="text-xs px-2 py-1 rounded border {picked ? 'border-emerald-400 text-emerald-400' : 'border-neutral-700 text-neutral-400'}"
          onclick={() => toggleTag(t.id)}>{t.name}</button>
      {/each}
    </div>
    <input
      class="w-full mt-2 bg-neutral-900 rounded px-3 py-2 text-sm outline-none"
      placeholder="+ new tag (press Enter)"
      bind:value={newTagName}
      onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); ensureTagFromInput(); } }} />
  </div>

  <div class="mt-4 flex gap-2 justify-end">
    <button class="text-sm text-neutral-500 px-3 py-1.5" onclick={onCancel}>Cancel</button>
    <button class="text-sm bg-emerald-500 text-black px-3 py-1.5 rounded font-medium disabled:opacity-30"
            onclick={submit} disabled={!name.trim()}>Add habit</button>
  </div>
</div>
