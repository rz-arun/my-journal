<script lang="ts">
  import { base } from '$app/paths';
  import { getLastExportTimestamp } from '$lib/backup';

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const DISMISS_KEY = 'myjournal.backupBannerDismissedAt';

  let show = $state(false);
  let daysSince = $state(0);

  function refresh() {
    const lastExport = getLastExportTimestamp();
    if (lastExport === null) { show = false; return; }
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const now = Date.now();
    const ageMs = now - lastExport;
    const dismissedRecently = now - dismissedAt < SEVEN_DAYS_MS;
    show = ageMs > THIRTY_DAYS_MS && !dismissedRecently;
    daysSince = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  }

  $effect(() => { refresh(); });

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    show = false;
  }
</script>

{#if show}
  <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-4 text-xs flex items-center justify-between">
    <span class="text-amber-200">Last backup: {daysSince} days ago.</span>
    <div class="flex items-center gap-3">
      <a href="{base}/settings/" class="text-amber-400 font-medium">Export now</a>
      <button onclick={dismiss} class="text-amber-200/50 text-base leading-none" aria-label="Dismiss">×</button>
    </div>
  </div>
{/if}
