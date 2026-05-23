<script lang="ts">
  import type { Tag } from '$lib/db';
  let { tag }: { tag: Tag } = $props();
</script>

<span class="text-[10px] px-1.5 py-0.5 rounded"
      style="background: {tag.color}22; color: {tag.color};">
  {tag.name}
</span>
