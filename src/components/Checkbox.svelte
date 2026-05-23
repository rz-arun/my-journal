<script lang="ts">
  let { checked, color = '#48d36a', onToggle }: {
    checked: boolean;
    color?: string;
    onToggle: () => void;
  } = $props();
</script>

<button
  class="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
  style="background: {checked ? color : 'transparent'}; border: {checked ? 'none' : '1.5px solid rgb(64 64 64)'};"
  onclick={onToggle}
  aria-label={checked ? 'Mark incomplete' : 'Mark complete'}>
  {#if checked}
    <span class="text-black text-base font-bold leading-none">✓</span>
  {/if}
</button>
