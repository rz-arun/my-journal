<script lang="ts">
  import '../app.css';
  import TabBar from '../components/TabBar.svelte';
  import InstallBanner from '../components/InstallBanner.svelte';
  import { onMount } from 'svelte';
  import { seedIfEmpty } from '$lib/seed';
  import { scheduleMidnightTick } from '$lib/store';

  let { children } = $props();
  let ready = $state(false);

  onMount(() => {
    let cancel: (() => void) | undefined;
    (async () => {
      await seedIfEmpty();
      cancel = scheduleMidnightTick();
      ready = true;
    })();
    return () => cancel?.();
  });
</script>

<div class="min-h-screen pb-24">
  {#if ready}
    {@render children()}
    <InstallBanner />
  {:else}
    <div class="p-6 text-neutral-500 text-sm">Loading…</div>
  {/if}
</div>

<TabBar />
