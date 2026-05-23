<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  const tabs = [
    { href: '/', label: 'Today',   icon: '●' },
    { href: '/history/', label: 'History', icon: '▦' },
    { href: '/habits/',  label: 'Habits',  icon: '≡' }
  ];

  let current = $derived($page.url.pathname.replace(base, '') || '/');
</script>

<nav aria-label="Main navigation" class="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-900 flex justify-around py-3 pb-safe">
  {#each tabs as t}
    {@const active = current === t.href}
    <a href="{base}{t.href}"
       class="flex flex-col items-center gap-1 text-xs px-4 {active ? 'text-emerald-400' : 'text-neutral-500'}">
      <span class="text-lg leading-none">{t.icon}</span>
      <span class="font-medium">{t.label}</span>
    </a>
  {/each}
</nav>
