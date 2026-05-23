<script lang="ts">
  import { onMount } from 'svelte';

  const DISMISS_KEY = 'myjournal.installBannerDismissed';

  type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  let deferred = $state<InstallPromptEvent | null>(null);
  let show = $state(false);

  onMount(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallPromptEvent;
      show = true;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  });

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    show = false;
    localStorage.setItem(DISMISS_KEY, '1');
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    show = false;
  }
</script>

{#if show}
  <div class="fixed bottom-20 left-4 right-4 bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex items-center gap-3 z-50">
    <div class="flex-1 text-sm">
      <div class="font-medium">Install My Journal</div>
      <div class="text-xs text-neutral-400">Adds to your home screen, works offline.</div>
    </div>
    <button class="text-sm bg-emerald-500 text-black px-3 py-1.5 rounded font-medium" onclick={install}>Install</button>
    <button class="text-neutral-500 text-lg" onclick={dismiss} aria-label="Dismiss">×</button>
  </div>
{/if}
