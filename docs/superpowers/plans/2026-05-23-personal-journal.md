# Personal Journal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deadly-simple, local-first, phone-installable PWA for tracking daily habits with tag-based goals, 30-day chain visualization, and "never miss twice" streak logic.

**Architecture:** Single-page SvelteKit app with static adapter, deployed as static files. Pure-function streak logic + Dexie/IndexedDB data layer + Tailwind-styled UI + Workbox-generated service worker. No backend.

**Tech Stack:** Svelte 5, SvelteKit (static adapter), TypeScript, Vite, Tailwind CSS, Dexie 4, vite-plugin-pwa, Vitest + fake-indexeddb, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-23-personal-journal-design.md`

---

## File Structure

```
my-journal/
├─ package.json
├─ vite.config.ts
├─ svelte.config.js
├─ tsconfig.json
├─ tailwind.config.cjs
├─ postcss.config.cjs
├─ playwright.config.ts
├─ vitest.config.ts
├─ static/
│  ├─ manifest.webmanifest
│  └─ icons/                     # 192/512/maskable PNGs
├─ src/
│  ├─ app.html
│  ├─ app.css
│  ├─ lib/
│  │  ├─ date.ts                 # local-day helpers (pure)
│  │  ├─ streaks.ts              # "never miss twice" rule (pure)
│  │  ├─ db.ts                   # Dexie schema + typed queries
│  │  ├─ backup.ts               # JSON export/import
│  │  └─ seed.ts                 # dev-only seed data
│  ├─ routes/
│  │  ├─ +layout.svelte          # shell with TabBar
│  │  ├─ +layout.ts              # `ssr = false`, `prerender = true`
│  │  ├─ +page.svelte            # Today (home)
│  │  ├─ history/+page.svelte
│  │  ├─ habits/+page.svelte
│  │  └─ settings/+page.svelte
│  └─ components/
│     ├─ TabBar.svelte
│     ├─ HabitRow.svelte
│     ├─ Chain.svelte
│     ├─ Checkbox.svelte
│     ├─ TagPill.svelte
│     ├─ AddHabitForm.svelte
│     ├─ AdHocTodos.svelte
│     ├─ DailyNote.svelte
│     └─ BackupBanner.svelte
├─ tests/
│  ├─ date.test.ts
│  ├─ streaks.test.ts
│  └─ db.test.ts
└─ e2e/
   └─ happy-path.spec.ts
```

**File responsibilities:**

- `lib/date.ts` — local-calendar string helpers (`todayLocal`, `prevDay`, `nextDay`, `daysBetween`). Pure, no IO. The single source of truth for "what is a day."
- `lib/streaks.ts` — `computeStreak(completions, today, createdAt)`. Pure, no IO. The behavioral spine.
- `lib/db.ts` — Dexie instance + typed query helpers. The only file that talks to IndexedDB.
- `lib/backup.ts` — serialize/deserialize all tables to/from JSON.
- `lib/seed.ts` — dev-mode-only sample data so the app isn't empty on first open.
- `routes/+page.svelte` (Today) — composes HabitRow + AdHocTodos + DailyNote + BackupBanner.
- `routes/habits/+page.svelte` — CRUD list + AddHabitForm.
- `routes/history/+page.svelte` — reverse-chrono day list, expandable cards.
- `routes/settings/+page.svelte` — Export, Import, Reset, version.
- Components are kept narrow: each owns one piece of UI and emits events outward.

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`, `src/routes/+layout.svelte`, `src/routes/+layout.ts`, `src/routes/+page.svelte`

- [ ] **Step 1: Scaffold SvelteKit project with TypeScript**

Run from `/Users/arun/Roanuz/8h-management/my-journal/`:

```bash
npm create svelte@latest . -- --template skeleton --types typescript --no-prettier --no-eslint --no-playwright --no-vitest
```

When prompted "Directory not empty, continue?" answer **yes**. The existing `docs/` and `.git/` survive.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install dexie@^4
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D \
  @sveltejs/adapter-static \
  @vite-pwa/sveltekit \
  workbox-window \
  tailwindcss@^3 postcss autoprefixer \
  vitest @vitest/ui fake-indexeddb \
  @playwright/test
```

- [ ] **Step 4: Configure static adapter**

Replace `svelte.config.js` with:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    paths: {
      base: process.env.BASE_PATH ?? ''
    }
  }
};
```

- [ ] **Step 5: Configure Tailwind**

```bash
npx tailwindcss init -p
```

Replace `tailwind.config.cjs` with:

```js
module.exports = {
  content: ['./src/**/*.{html,svelte,ts,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // chain dot intensities, matching the mockup
        chain: {
          0: '#1a1a1a',
          1: '#0e3b1f',
          2: '#1d6b35',
          3: '#2da14a',
          4: '#48d36a'
        }
      }
    }
  },
  plugins: []
};
```

Replace `src/app.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { background: #0a0a0a; color: #e8e8e8; }
html { color-scheme: dark; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
```

- [ ] **Step 6: Wire app.css into the layout**

Replace `src/routes/+layout.svelte` with:

```svelte
<script lang="ts">
  import '../app.css';
</script>

<slot />
```

Create `src/routes/+layout.ts`:

```ts
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';
```

(`ssr = false` is required because Dexie/IndexedDB only exists in the browser; `prerender = true` lets us deploy as a pure static site.)

- [ ] **Step 7: Placeholder Today page**

Replace `src/routes/+page.svelte` with:

```svelte
<main class="p-6">
  <h1 class="text-2xl font-semibold">My Journal</h1>
  <p class="text-sm text-neutral-400">Scaffolding in place. Real screens coming.</p>
</main>
```

- [ ] **Step 8: Run dev server smoke test**

```bash
npm run dev -- --port 5173
```

Open `http://localhost:5173/`. Expected: black background, "My Journal" header, subtitle text. Ctrl-C to stop.

- [ ] **Step 9: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true
  }
});
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 10: Configure Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  use: { baseURL: 'http://localhost:4173' }
});
```

Add to `package.json` scripts:

```json
"e2e": "playwright test"
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit + Tailwind + Dexie + test toolchain"
```

---

## Task 2: `lib/date.ts` — local-day helpers (TDD)

**Files:**
- Create: `src/lib/date.ts`
- Create: `tests/date.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/date.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayLocal, prevDay, nextDay, daysBetween, type DateStr } from '../src/lib/date';

describe('date helpers', () => {
  afterEach(() => vi.useRealTimers());

  describe('todayLocal', () => {
    it('returns YYYY-MM-DD for the local calendar day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-23T15:30:00'));
      expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('does not roll over at UTC midnight if local time is still the previous day', () => {
      // 2026-05-23 23:59 local — todayLocal must say 2026-05-23 regardless of zone
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 23, 59, 0));  // month is 0-indexed
      expect(todayLocal()).toBe('2026-05-23');
    });

    it('rolls over at local midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 24, 0, 1, 0));
      expect(todayLocal()).toBe('2026-05-24');
    });
  });

  describe('prevDay', () => {
    it('subtracts one day in the simple case', () => {
      expect(prevDay('2026-05-23')).toBe('2026-05-22');
    });
    it('crosses month boundary', () => {
      expect(prevDay('2026-03-01')).toBe('2026-02-28');
    });
    it('respects leap year', () => {
      expect(prevDay('2024-03-01')).toBe('2024-02-29');
    });
    it('crosses year boundary', () => {
      expect(prevDay('2026-01-01')).toBe('2025-12-31');
    });
  });

  describe('nextDay', () => {
    it('adds one day', () => {
      expect(nextDay('2026-05-23')).toBe('2026-05-24');
    });
    it('crosses month boundary', () => {
      expect(nextDay('2026-02-28')).toBe('2026-03-01');
    });
    it('respects leap year', () => {
      expect(nextDay('2024-02-28')).toBe('2024-02-29');
    });
  });

  describe('daysBetween', () => {
    it('returns 0 for same day', () => {
      expect(daysBetween('2026-05-23', '2026-05-23')).toBe(0);
    });
    it('returns positive for later end', () => {
      expect(daysBetween('2026-05-20', '2026-05-23')).toBe(3);
    });
    it('returns negative for earlier end', () => {
      expect(daysBetween('2026-05-23', '2026-05-20')).toBe(-3);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/date.test.ts
```

Expected: all tests fail with "Cannot find module '../src/lib/date'".

- [ ] **Step 3: Implement `src/lib/date.ts`**

```ts
export type DateStr = string;  // YYYY-MM-DD in the local calendar

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function todayLocal(now: Date = new Date()): DateStr {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parse(d: DateStr): Date {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function prevDay(d: DateStr): DateStr {
  const dt = parse(d);
  dt.setDate(dt.getDate() - 1);
  return todayLocal(dt);
}

export function nextDay(d: DateStr): DateStr {
  const dt = parse(d);
  dt.setDate(dt.getDate() + 1);
  return todayLocal(dt);
}

export function daysBetween(start: DateStr, end: DateStr): number {
  const ms = parse(end).getTime() - parse(start).getTime();
  return Math.round(ms / 86_400_000);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/date.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts tests/date.test.ts
git commit -m "feat(lib): add date helpers with local-day TDD coverage"
```

---

## Task 3: `lib/streaks.ts` — "never miss twice" logic (TDD)

**Files:**
- Create: `src/lib/streaks.ts`
- Create: `tests/streaks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/streaks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStreak } from '../src/lib/streaks';

function setOf(...dates: string[]) {
  return new Set(dates);
}

describe('computeStreak', () => {
  const created = '2025-01-01';

  it('returns 0/on for an empty habit', () => {
    expect(computeStreak(setOf(), '2026-05-23', created)).toMatchObject({
      current: 0, status: 'on', longest: 0
    });
  });

  it('counts today when only today is done', () => {
    expect(computeStreak(setOf('2026-05-23'), '2026-05-23', created)).toMatchObject({
      current: 1, status: 'on'
    });
  });

  it('counts a 10-day perfect run', () => {
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(2026, 4, 14 + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    expect(computeStreak(new Set(days), '2026-05-23', created)).toMatchObject({
      current: 10, status: 'on'
    });
  });

  it('does not penalize today being open (yesterday and before are done)', () => {
    // today=2026-05-23 not in set; yesterday and earlier in set
    expect(computeStreak(setOf('2026-05-22', '2026-05-21'), '2026-05-23', created)).toMatchObject({
      current: 2, status: 'on'
    });
  });

  it('shows warning when yesterday was missed but day-before-yesterday was done', () => {
    // today open, yesterday missed, day-before done
    expect(computeStreak(setOf('2026-05-21', '2026-05-20'), '2026-05-23', created)).toMatchObject({
      current: 2, status: 'warning'
    });
  });

  it('shows broken when two consecutive misses precede today', () => {
    // today open, yesterday + day-before both missed
    expect(computeStreak(setOf('2026-05-20', '2026-05-19'), '2026-05-23', created)).toMatchObject({
      current: 0, status: 'broken'
    });
  });

  it('counts a 9-day run with a single internal gap as 9 (skip-once allowed)', () => {
    // pattern (newest first): T=5/23 ✓, 22 ✓, 21 ✓, 20 ·, 19 ✓ ✓ ✓ ✓ ✓ ✓
    const dates = setOf(
      '2026-05-23', '2026-05-22', '2026-05-21',
                                                 // 5-20 missed
      '2026-05-19', '2026-05-18', '2026-05-17',
      '2026-05-16', '2026-05-15', '2026-05-14'
    );
    expect(computeStreak(dates, '2026-05-23', created)).toMatchObject({
      current: 9, status: 'on'
    });
  });

  it('resets to a fresh count of 1 after a two-day break, when today is done', () => {
    // pattern: T=5/23 ✓, 22 ·, 21 ·, 20 ✓ ✓ ✓
    const dates = setOf('2026-05-23', '2026-05-20', '2026-05-19', '2026-05-18');
    expect(computeStreak(dates, '2026-05-23', created)).toMatchObject({
      current: 1, status: 'on'
    });
  });

  it('does not walk past habitCreatedAt', () => {
    expect(computeStreak(setOf('2026-05-23'), '2026-05-23', '2026-05-23')).toMatchObject({
      current: 1
    });
  });

  it('ignores completions for future dates (clock skew defense)', () => {
    expect(computeStreak(setOf('2027-01-01', '2026-05-23'), '2026-05-23', created)).toMatchObject({
      current: 1, status: 'on'
    });
  });

  it('computes longest across history', () => {
    // 5-day run, break, 3-day run, break, 2 day run ending today
    const dates = setOf(
      '2026-05-23', '2026-05-22',
      // gap (5-21, 5-20)
      '2026-05-19', '2026-05-18', '2026-05-17',
      // gap (5-16, 5-15)
      '2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11', '2026-05-10'
    );
    const r = computeStreak(dates, '2026-05-23', '2026-05-01');
    expect(r.longest).toBe(5);
  });

  it('totalDays counts unique completions', () => {
    const dates = setOf('2026-05-23', '2026-05-22', '2026-05-15');
    expect(computeStreak(dates, '2026-05-23', created).totalDays).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/streaks.test.ts
```

Expected: all fail with "Cannot find module '../src/lib/streaks'".

- [ ] **Step 3: Implement `src/lib/streaks.ts`**

```ts
import { prevDay, type DateStr } from './date';

export type StreakStatus = 'on' | 'warning' | 'broken';

export interface StreakResult {
  current: number;
  status: StreakStatus;
  longest: number;
  totalDays: number;
}

export function computeStreak(
  completions: Set<DateStr>,
  today: DateStr,
  habitCreatedAt: DateStr
): StreakResult {
  // Filter future completions (clock skew defense)
  const validCompletions = new Set<DateStr>();
  for (const d of completions) {
    if (d <= today) validCompletions.add(d);
  }

  // --- Current streak ---
  let current = 0;
  let cursor = today;

  // Today is open — counts only if completed, never as a miss
  if (validCompletions.has(cursor)) current++;
  cursor = prevDay(cursor);

  // Past days obey "never miss twice"
  let misses = 0;
  while (cursor >= habitCreatedAt) {
    if (validCompletions.has(cursor)) {
      current++;
      misses = 0;
    } else {
      misses++;
      if (misses >= 2) break;
    }
    cursor = prevDay(cursor);
  }

  // --- Status ---
  // Look at the days strictly before today
  const yesterday = prevDay(today);
  const dayBefore = prevDay(yesterday);
  let status: StreakStatus;
  const yMissed = !validCompletions.has(yesterday) && yesterday >= habitCreatedAt;
  const dMissed = !validCompletions.has(dayBefore) && dayBefore >= habitCreatedAt;
  if (yMissed && dMissed) {
    status = 'broken';
  } else if (yMissed) {
    status = 'warning';
  } else {
    status = 'on';
  }
  // If habit was created today/yesterday with no history yet, we still call it 'on'
  if (yesterday < habitCreatedAt) status = 'on';

  // --- Longest streak (walk all completions, same rule) ---
  const sorted = Array.from(validCompletions).sort();
  let longest = 0;
  if (sorted.length > 0) {
    let runStart = sorted[0];
    let run = 1;
    let internalMisses = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86_400_000;
      if (gap === 1) {
        run++;
        internalMisses = 0;
      } else if (gap === 2) {
        // one missed day allowed
        run++;
        internalMisses = 1;
      } else {
        // gap >= 3 means two-or-more consecutive misses — new run
        longest = Math.max(longest, run);
        run = 1;
        internalMisses = 0;
      }
    }
    longest = Math.max(longest, run);
  }

  // current may exceed historical longest (e.g., on the day it grows)
  longest = Math.max(longest, current);

  return {
    current,
    status,
    longest,
    totalDays: validCompletions.size
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/streaks.test.ts
```

Expected: all 12 tests PASS. If any fail, fix `streaks.ts` (not the tests) until they pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/streaks.ts tests/streaks.test.ts
git commit -m "feat(lib): add 'never miss twice' streak computation with TDD coverage"
```

---

## Task 4: `lib/db.ts` — Dexie schema

**Files:**
- Create: `src/lib/db.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: Write the failing schema test**

Create `tests/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, type Habit, type Tag } from '../src/lib/db';

describe('db schema', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('has all five tables', () => {
    expect(db.habits).toBeDefined();
    expect(db.tags).toBeDefined();
    expect(db.completions).toBeDefined();
    expect(db.dayNotes).toBeDefined();
    expect(db.adHocTodos).toBeDefined();
  });

  it('round-trips a habit', async () => {
    const h: Habit = {
      id: 'h1',
      name: 'Study Rust',
      emoji: '📚',
      tagIds: ['career'],
      createdAt: Date.now(),
      archivedAt: null,
      sortOrder: 0
    };
    await db.habits.put(h);
    expect(await db.habits.get('h1')).toEqual(h);
  });

  it('round-trips a tag', async () => {
    const t: Tag = { id: 'career', name: 'Career', color: '#7ab4ff' };
    await db.tags.put(t);
    expect(await db.tags.get('career')).toEqual(t);
  });

  it('completions use composite key [habitId+date]', async () => {
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: Date.now() });
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: Date.now() });  // upsert
    const all = await db.completions.where({ habitId: 'h1' }).toArray();
    expect(all).toHaveLength(1);
  });

  it('queries completions by date', async () => {
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: 1 });
    await db.completions.put({ habitId: 'h2', date: '2026-05-23', completedAt: 1 });
    await db.completions.put({ habitId: 'h1', date: '2026-05-22', completedAt: 1 });
    const today = await db.completions.where('date').equals('2026-05-23').toArray();
    expect(today).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/db.test.ts
```

Expected: all fail with "Cannot find module '../src/lib/db'".

- [ ] **Step 3: Implement `src/lib/db.ts`**

```ts
import Dexie, { type Table } from 'dexie';
import type { DateStr } from './date';

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  tagIds: string[];
  createdAt: number;
  archivedAt: number | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Completion {
  habitId: string;
  date: DateStr;
  completedAt: number;
}

export interface DayNote {
  date: DateStr;
  text: string;
  updatedAt: number;
}

export interface AdHocTodo {
  id: string;
  date: DateStr;
  text: string;
  done: boolean;
  doneAt: number | null;
}

class JournalDB extends Dexie {
  habits!: Table<Habit, string>;
  tags!: Table<Tag, string>;
  completions!: Table<Completion, [string, DateStr]>;
  dayNotes!: Table<DayNote, DateStr>;
  adHocTodos!: Table<AdHocTodo, string>;

  constructor() {
    super('myjournal');
    this.version(1).stores({
      habits: 'id, archivedAt, sortOrder',
      tags: 'id',
      completions: '[habitId+date], date, habitId',
      dayNotes: 'date',
      adHocTodos: 'id, date'
    });
  }
}

export const db = new JournalDB();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/db.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/db.test.ts
git commit -m "feat(lib): add Dexie schema for habits, tags, completions, notes, todos"
```

---

## Task 5: `lib/db.ts` — typed query helpers

**Files:**
- Modify: `src/lib/db.ts` (append helpers)
- Modify: `tests/db.test.ts` (append tests)

- [ ] **Step 1: Append tests for the helpers**

Append to `tests/db.test.ts`:

```ts
import {
  getActiveHabits, toggleCompletion, getCompletionsForHabit, upsertDayNote
} from '../src/lib/db';

describe('db helpers', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('getActiveHabits returns non-archived in sortOrder', async () => {
    await db.habits.bulkPut([
      { id: 'a', name: 'A', tagIds: [], createdAt: 1, archivedAt: null, sortOrder: 2 },
      { id: 'b', name: 'B', tagIds: [], createdAt: 1, archivedAt: 999, sortOrder: 1 },
      { id: 'c', name: 'C', tagIds: [], createdAt: 1, archivedAt: null, sortOrder: 1 }
    ]);
    const active = await getActiveHabits();
    expect(active.map(h => h.id)).toEqual(['c', 'a']);
  });

  it('toggleCompletion adds when absent, removes when present', async () => {
    const result1 = await toggleCompletion('h1', '2026-05-23');
    expect(result1).toBe(true);
    expect((await db.completions.toArray())).toHaveLength(1);

    const result2 = await toggleCompletion('h1', '2026-05-23');
    expect(result2).toBe(false);
    expect((await db.completions.toArray())).toHaveLength(0);
  });

  it('getCompletionsForHabit returns set of date strings', async () => {
    await db.completions.bulkPut([
      { habitId: 'h1', date: '2026-05-23', completedAt: 1 },
      { habitId: 'h1', date: '2026-05-22', completedAt: 1 },
      { habitId: 'h2', date: '2026-05-23', completedAt: 1 }
    ]);
    const s = await getCompletionsForHabit('h1');
    expect(s.has('2026-05-23')).toBe(true);
    expect(s.has('2026-05-22')).toBe(true);
    expect(s.size).toBe(2);
  });

  it('upsertDayNote creates and updates', async () => {
    await upsertDayNote('2026-05-23', 'first');
    await upsertDayNote('2026-05-23', 'second');
    expect((await db.dayNotes.get('2026-05-23'))?.text).toBe('second');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/db.test.ts
```

Expected: 4 new tests fail with "is not a function".

- [ ] **Step 3: Append helpers to `src/lib/db.ts`**

```ts
// --- Helpers ---

export async function getActiveHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray();
  return all
    .filter(h => h.archivedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getArchivedHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray();
  return all
    .filter(h => h.archivedAt !== null)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
}

/** Returns `true` if completion was added, `false` if removed. */
export async function toggleCompletion(habitId: string, date: DateStr): Promise<boolean> {
  const existing = await db.completions.get([habitId, date]);
  if (existing) {
    await db.completions.delete([habitId, date]);
    return false;
  }
  await db.completions.put({ habitId, date, completedAt: Date.now() });
  return true;
}

export async function getCompletionsForHabit(habitId: string): Promise<Set<DateStr>> {
  const rows = await db.completions.where('habitId').equals(habitId).toArray();
  return new Set(rows.map(r => r.date));
}

export async function getCompletionsForDate(date: DateStr): Promise<Set<string>> {
  const rows = await db.completions.where('date').equals(date).toArray();
  return new Set(rows.map(r => r.habitId));
}

export async function upsertDayNote(date: DateStr, text: string): Promise<void> {
  await db.dayNotes.put({ date, text, updatedAt: Date.now() });
}

export async function getDayNote(date: DateStr): Promise<string> {
  return (await db.dayNotes.get(date))?.text ?? '';
}

export async function addAdHocTodo(date: DateStr, text: string): Promise<void> {
  await db.adHocTodos.put({
    id: crypto.randomUUID(),
    date, text, done: false, doneAt: null
  });
}

export async function toggleAdHocTodo(id: string): Promise<void> {
  const t = await db.adHocTodos.get(id);
  if (!t) return;
  await db.adHocTodos.put({
    ...t,
    done: !t.done,
    doneAt: !t.done ? Date.now() : null
  });
}

export async function deleteAdHocTodo(id: string): Promise<void> {
  await db.adHocTodos.delete(id);
}

export async function getAdHocTodosForDate(date: DateStr): Promise<AdHocTodo[]> {
  return db.adHocTodos.where('date').equals(date).toArray();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/db.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/db.test.ts
git commit -m "feat(lib): add typed query helpers for habits, completions, notes, todos"
```

---

## Task 6: Seed data + reactive store

**Files:**
- Create: `src/lib/seed.ts`
- Create: `src/lib/store.ts`

- [ ] **Step 1: Implement `src/lib/seed.ts`**

```ts
import { db, type Habit, type Tag } from './db';

const SEED_TAGS: Tag[] = [
  { id: 'career', name: 'Career', color: '#7ab4ff' },
  { id: 'health', name: 'Health', color: '#7ad198' },
  { id: 'personal', name: 'Personal', color: '#d489d3' },
  { id: 'long-term', name: 'Long term', color: '#e3a44b' }
];

const SEED_HABITS: Habit[] = [
  { id: 's1', name: 'Study something new', emoji: '📚', tagIds: ['career', 'long-term'],
    createdAt: Date.now(), archivedAt: null, sortOrder: 0 },
  { id: 's2', name: 'Exercise 20 min', emoji: '🏃', tagIds: ['health'],
    createdAt: Date.now(), archivedAt: null, sortOrder: 1 },
  { id: 's3', name: 'Write something', emoji: '✍️', tagIds: ['personal'],
    createdAt: Date.now(), archivedAt: null, sortOrder: 2 }
];

/** Seeds tags and habits if the DB is empty. Safe to call on every load. */
export async function seedIfEmpty(): Promise<void> {
  const habitCount = await db.habits.count();
  if (habitCount > 0) return;
  await db.tags.bulkPut(SEED_TAGS);
  await db.habits.bulkPut(SEED_HABITS);
}
```

- [ ] **Step 2: Implement `src/lib/store.ts` (reactive Svelte stores)**

```ts
import { writable } from 'svelte/store';
import { todayLocal, type DateStr } from './date';

/** The "current day" the UI is showing. Updated at midnight. */
export const today = writable<DateStr>(todayLocal());

/** Trigger a refresh whenever data mutates. Components subscribe to re-fetch. */
export const dataVersion = writable<number>(0);

export function bumpData() {
  dataVersion.update(v => v + 1);
}

/** Schedule a refresh of `today` at the next local midnight. */
export function scheduleMidnightTick(): () => void {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ms = midnight.getTime() - now.getTime();
  const handle = setTimeout(() => {
    today.set(todayLocal());
    scheduleMidnightTick();
  }, ms);
  return () => clearTimeout(handle);
}
```

- [ ] **Step 3: Smoke test (no unit test needed for these)**

The seed + store will be exercised by Today screen in Task 8. Nothing to run yet.

- [ ] **Step 4: Commit**

```bash
git add src/lib/seed.ts src/lib/store.ts
git commit -m "feat(lib): add seed data and reactive stores"
```

---

## Task 7: TabBar component + layout shell

**Files:**
- Create: `src/components/TabBar.svelte`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Implement `src/components/TabBar.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  const tabs = [
    { href: '/', label: 'Today',   icon: '●' },
    { href: '/history/', label: 'History', icon: '▦' },
    { href: '/habits/',  label: 'Habits',  icon: '≡' }
  ];

  $: current = $page.url.pathname.replace(base, '') || '/';
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-900 flex justify-around py-3 pb-safe">
  {#each tabs as t}
    {@const active = current === t.href}
    <a href="{base}{t.href}"
       class="flex flex-col items-center gap-1 text-xs px-4
              {active ? 'text-emerald-400' : 'text-neutral-500'}">
      <span class="text-lg leading-none">{t.icon}</span>
      <span class="font-medium">{t.label}</span>
    </a>
  {/each}
</nav>
```

- [ ] **Step 2: Wire TabBar into the layout**

Replace `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  import TabBar from '../components/TabBar.svelte';
  import { onMount } from 'svelte';
  import { seedIfEmpty } from '$lib/seed';
  import { scheduleMidnightTick } from '$lib/store';

  let ready = false;
  onMount(async () => {
    await seedIfEmpty();
    const cancel = scheduleMidnightTick();
    ready = true;
    return cancel;
  });
</script>

<div class="min-h-screen pb-24">
  {#if ready}
    <slot />
  {:else}
    <div class="p-6 text-neutral-500 text-sm">Loading…</div>
  {/if}
</div>

<TabBar />
```

- [ ] **Step 3: Add safe-area padding utility**

Append to `src/app.css`:

```css
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
```

- [ ] **Step 4: Smoke test**

```bash
npm run dev -- --port 5173
```

Open `http://localhost:5173/`. Expected: see "My Journal" placeholder text, tab bar at bottom with Today (green) / History / Habits. Click History — page is 404 (we haven't built it yet), and that's fine.

- [ ] **Step 5: Commit**

```bash
git add src/components/TabBar.svelte src/routes/+layout.svelte src/app.css
git commit -m "feat(ui): add TabBar shell with seed-on-load and midnight tick"
```

---

## Task 8: Chain + HabitRow components

**Files:**
- Create: `src/components/Chain.svelte`
- Create: `src/components/Checkbox.svelte`
- Create: `src/components/TagPill.svelte`
- Create: `src/components/HabitRow.svelte`

- [ ] **Step 1: Implement `Chain.svelte`**

```svelte
<script lang="ts">
  import { prevDay, type DateStr } from '$lib/date';

  export let today: DateStr;
  export let completions: Set<DateStr>;
  export let days: number = 30;

  $: cells = (() => {
    const out: { date: DateStr; done: boolean; isToday: boolean }[] = [];
    let d = today;
    for (let i = 0; i < days; i++) {
      out.push({ date: d, done: completions.has(d), isToday: i === 0 });
      d = prevDay(d);
    }
    return out.reverse();
  })();
</script>

<div class="flex gap-[1px]">
  {#each cells as c}
    <div class="w-1 h-2 rounded-[1px] {c.done ? 'bg-emerald-400' : 'bg-neutral-800'}
                {c.isToday ? 'outline outline-1 outline-emerald-400 outline-offset-[1px]' : ''}"></div>
  {/each}
</div>
```

- [ ] **Step 2: Implement `Checkbox.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let checked: boolean;
  export let color: string = '#48d36a';
  const dispatch = createEventDispatcher<{ toggle: void }>();
</script>

<button
  class="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
  class:border={!checked}
  class:border-neutral-700={!checked}
  style="background: {checked ? color : 'transparent'}; border-width: {checked ? 0 : '1.5px'};"
  on:click={() => dispatch('toggle')}
  aria-label={checked ? 'Mark incomplete' : 'Mark complete'}>
  {#if checked}
    <span class="text-black text-base font-bold leading-none">✓</span>
  {/if}
</button>
```

- [ ] **Step 3: Implement `TagPill.svelte`**

```svelte
<script lang="ts">
  import type { Tag } from '$lib/db';
  export let tag: Tag;
</script>

<span class="text-[10px] px-1.5 py-0.5 rounded"
      style="background: {tag.color}22; color: {tag.color};">
  {tag.name}
</span>
```

(The `22` hex suffix is alpha ≈ 13%, giving the muted-tinted pill background.)

- [ ] **Step 4: Implement `HabitRow.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Habit, Tag } from '$lib/db';
  import type { DateStr } from '$lib/date';
  import { computeStreak, type StreakResult } from '$lib/streaks';
  import Chain from './Chain.svelte';
  import Checkbox from './Checkbox.svelte';
  import TagPill from './TagPill.svelte';

  export let habit: Habit;
  export let today: DateStr;
  export let completions: Set<DateStr>;
  export let tagsById: Map<string, Tag>;
  const dispatch = createEventDispatcher<{ toggle: void }>();

  $: createdDate = isoFromTs(habit.createdAt);
  $: streak = computeStreak(completions, today, createdDate);
  $: checked = completions.has(today);
  $: rowTags = habit.tagIds.map(id => tagsById.get(id)).filter(Boolean) as Tag[];
  $: primaryColor = rowTags[0]?.color ?? '#48d36a';

  function isoFromTs(ts: number): DateStr {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function streakLabel(r: StreakResult): string {
    if (r.status === 'broken') return 'streak broken';
    return `${r.current}d`;
  }

  function streakColor(r: StreakResult): string {
    if (r.status === 'broken') return 'text-neutral-600';
    if (r.status === 'warning') return 'text-amber-400';
    return 'text-emerald-400';
  }
</script>

<div class="flex items-center py-3 border-b border-neutral-900">
  <div class="text-xl w-7 flex-shrink-0">{habit.emoji ?? '•'}</div>
  <div class="flex-1 min-w-0">
    <div class="text-sm font-medium truncate">{habit.name}</div>
    {#if rowTags.length}
      <div class="flex gap-1 mt-1">
        {#each rowTags as t}<TagPill tag={t} />{/each}
      </div>
    {/if}
  </div>
  <div class="flex flex-col items-end gap-1.5">
    <Chain {today} {completions} />
    <div class="flex items-center gap-2">
      <span class="text-[10px] {streakColor(streak)}">
        {streakLabel(streak)}{streak.status === 'warning' ? ' •' : ''}
      </span>
      <Checkbox {checked} color={primaryColor} on:toggle={() => dispatch('toggle')} />
    </div>
  </div>
</div>
```

- [ ] **Step 5: Smoke test by editing the Today route to use these**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { db, getActiveHabits, getCompletionsForHabit, toggleCompletion, type Habit, type Tag } from '$lib/db';
  import { today as todayStore, dataVersion, bumpData } from '$lib/store';
  import HabitRow from '../components/HabitRow.svelte';

  let habits: Habit[] = [];
  let completionsByHabit = new Map<string, Set<string>>();
  let tagsById = new Map<string, Tag>();

  async function load() {
    habits = await getActiveHabits();
    const allTags = await db.tags.toArray();
    tagsById = new Map(allTags.map(t => [t.id, t]));
    const next = new Map<string, Set<string>>();
    for (const h of habits) {
      next.set(h.id, await getCompletionsForHabit(h.id));
    }
    completionsByHabit = next;
  }

  $: $dataVersion, load();
  $: today = $todayStore;

  async function onToggle(habit: Habit) {
    await toggleCompletion(habit.id, today);
    bumpData();
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <h1 class="text-2xl font-semibold">
    {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
  </h1>

  <div class="mt-4">
    {#each habits as habit (habit.id)}
      <HabitRow
        {habit}
        {today}
        completions={completionsByHabit.get(habit.id) ?? new Set()}
        {tagsById}
        on:toggle={() => onToggle(habit)} />
    {/each}
  </div>
</main>
```

- [ ] **Step 6: Smoke test**

```bash
npm run dev -- --port 5173
```

Expected: header with today's date, three seeded habit rows with chains, tag pills, checkboxes. Click a checkbox — it fills green, streak says "1d", chain's rightmost dot turns green. Click again — undoes. Refresh — state persists.

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/routes/+page.svelte
git commit -m "feat(today): habit rows with 30-day chain, streak, and check-off"
```

---

## Task 9: Header strip with last-7-days dots

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add the header strip**

Insert after `<h1>` in `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  // ...existing imports...
  import { prevDay } from '$lib/date';

  // ...existing state...
  let last7: { date: string; ratio: number }[] = [];

  async function loadLast7() {
    const out: { date: string; ratio: number }[] = [];
    let d = today;
    const totalHabits = habits.length;
    for (let i = 0; i < 7; i++) {
      let done = 0;
      for (const h of habits) {
        if ((completionsByHabit.get(h.id) ?? new Set()).has(d)) done++;
      }
      out.unshift({ date: d, ratio: totalHabits === 0 ? 0 : done / totalHabits });
      d = prevDay(d);
    }
    last7 = out;
  }

  $: completionsByHabit, habits, today, loadLast7();
</script>
```

Add immediately below `<h1>`:

```svelte
<div class="flex items-center gap-2 mt-2">
  <span class="text-[10px] uppercase tracking-wider text-neutral-500">Last 7</span>
  <div class="flex gap-1">
    {#each last7 as d}
      <div
        class="w-3 h-3 rounded-sm"
        class:outline={d.date === today}
        class:outline-1={d.date === today}
        class:outline-emerald-400={d.date === today}
        class:outline-offset-1={d.date === today}
        style="background: {d.ratio === 0 ? '#1a1a1a' : d.ratio < 0.5 ? '#0e3b1f' : d.ratio < 1 ? '#1d6b35' : '#48d36a'}"
        title={d.date}
      ></div>
    {/each}
  </div>
</div>
```

- [ ] **Step 2: Smoke test**

`npm run dev`. Check off some habits — the last-7 dots react to today's completion ratio. Refresh — persists.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(today): add last-7-days completion strip in header"
```

---

## Task 10: AdHocTodos component

**Files:**
- Create: `src/components/AdHocTodos.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Implement `src/components/AdHocTodos.svelte`**

```svelte
<script lang="ts">
  import type { AdHocTodo } from '$lib/db';
  import { addAdHocTodo, toggleAdHocTodo, deleteAdHocTodo, getAdHocTodosForDate } from '$lib/db';
  import { bumpData, dataVersion } from '$lib/store';

  export let date: string;

  let items: AdHocTodo[] = [];
  let newText = '';

  async function load() { items = await getAdHocTodosForDate(date); }
  $: $dataVersion, date, load();

  async function add() {
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
        class="w-5 h-5 rounded mr-2.5 flex items-center justify-center
               {t.done ? 'bg-emerald-400' : 'border border-neutral-700'}"
        on:click={() => toggle(t.id)}
        aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}>
        {#if t.done}<span class="text-black text-xs font-bold">✓</span>{/if}
      </button>
      <span class="flex-1 text-sm {t.done ? 'text-neutral-500 line-through' : ''}">{t.text}</span>
      <button
        class="text-neutral-700 opacity-0 group-hover:opacity-100 text-xs px-1"
        on:click={() => remove(t.id)}
        aria-label="Delete todo">✕</button>
    </div>
  {/each}

  <form on:submit|preventDefault={add} class="flex items-center py-1.5">
    <span class="w-5 h-5 mr-2.5 text-neutral-700 text-center text-sm">+</span>
    <input
      class="flex-1 bg-transparent text-sm placeholder-neutral-700 outline-none"
      placeholder="Add today's todo"
      bind:value={newText}
      type="text" />
  </form>
</section>
```

- [ ] **Step 2: Mount it in the Today route**

In `src/routes/+page.svelte`, add to the imports:

```svelte
import AdHocTodos from '../components/AdHocTodos.svelte';
```

After the `{#each habits}` block (still inside `<main>`):

```svelte
<AdHocTodos {date} />
```

…where `date` resolves from `today`. Add:

```svelte
$: date = today;
```

to the script section.

- [ ] **Step 3: Smoke test**

`npm run dev`. Type a todo, hit Enter, see it appear. Click to mark done (strikethrough). Refresh — persists. Hover row, see delete X, click to remove.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdHocTodos.svelte src/routes/+page.svelte
git commit -m "feat(today): ad-hoc todos for the current day"
```

---

## Task 11: DailyNote component

**Files:**
- Create: `src/components/DailyNote.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Implement `src/components/DailyNote.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { upsertDayNote, getDayNote } from '$lib/db';
  import { dataVersion } from '$lib/store';

  export let date: string;
  let text = '';
  let expanded = false;
  let loaded = false;

  async function load() {
    text = await getDayNote(date);
    loaded = true;
  }
  $: $dataVersion, date, load();

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
      on:blur={onBlur}></textarea>
  {:else}
    <button
      class="text-sm text-neutral-600 italic"
      on:click={() => expanded = true}>Add a note about today…</button>
  {/if}
</section>
```

- [ ] **Step 2: Mount in Today route**

In `src/routes/+page.svelte`, add to imports:

```svelte
import DailyNote from '../components/DailyNote.svelte';
```

Insert after `<AdHocTodos ... />`:

```svelte
<DailyNote {date} />
```

- [ ] **Step 3: Smoke test**

`npm run dev`. Click "Add a note about today…" — textarea appears. Type. Blur. Refresh — text persists.

- [ ] **Step 4: Commit**

```bash
git add src/components/DailyNote.svelte src/routes/+page.svelte
git commit -m "feat(today): optional daily note with blur-to-save"
```

---

## Task 12: Habits screen — list active + archived

**Files:**
- Create: `src/routes/habits/+page.svelte`

- [ ] **Step 1: Implement the manage screen (list-only)**

```svelte
<script lang="ts">
  import { db, getActiveHabits, getArchivedHabits, type Habit, type Tag } from '$lib/db';
  import { dataVersion, bumpData } from '$lib/store';
  import TagPill from '../../components/TagPill.svelte';

  let active: Habit[] = [];
  let archived: Habit[] = [];
  let tagsById = new Map<string, Tag>();

  async function load() {
    active = await getActiveHabits();
    archived = await getArchivedHabits();
    tagsById = new Map((await db.tags.toArray()).map(t => [t.id, t]));
  }
  $: $dataVersion, load();

  async function archive(h: Habit) {
    await db.habits.put({ ...h, archivedAt: Date.now() });
    bumpData();
  }
  async function unarchive(h: Habit) {
    await db.habits.put({ ...h, archivedAt: null, sortOrder: active.length });
    bumpData();
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <h1 class="text-2xl font-semibold">Habits</h1>

  <section class="mt-6">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Active ({active.length})</div>
    {#each active as h (h.id)}
      <div class="flex items-center py-3 border-b border-neutral-900">
        <div class="text-xl w-7">{h.emoji ?? '•'}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm">{h.name}</div>
          <div class="flex gap-1 mt-1">
            {#each h.tagIds as id}
              {#if tagsById.has(id)}<TagPill tag={tagsById.get(id)} />{/if}
            {/each}
          </div>
        </div>
        <button class="text-xs text-neutral-500" on:click={() => archive(h)}>Archive</button>
      </div>
    {:else}
      <p class="text-sm text-neutral-500">No active habits.</p>
    {/each}
  </section>

  {#if archived.length}
    <section class="mt-8">
      <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Archived ({archived.length})</div>
      {#each archived as h (h.id)}
        <div class="flex items-center py-3 border-b border-neutral-900 opacity-60">
          <div class="text-xl w-7">{h.emoji ?? '•'}</div>
          <div class="flex-1 text-sm">{h.name}</div>
          <button class="text-xs text-neutral-500" on:click={() => unarchive(h)}>Restore</button>
        </div>
      {/each}
    </section>
  {/if}
</main>
```

- [ ] **Step 2: Smoke test**

`npm run dev`. Open `http://localhost:5173/habits/`. See three seeded habits, each with tags. Click Archive on one — it moves to Archived section. Click Restore — it returns.

- [ ] **Step 3: Commit**

```bash
git add src/routes/habits/+page.svelte
git commit -m "feat(habits): list active + archived habits with archive toggle"
```

---

## Task 13: Habits screen — AddHabitForm

**Files:**
- Create: `src/components/AddHabitForm.svelte`
- Modify: `src/routes/habits/+page.svelte`

- [ ] **Step 1: Implement `src/components/AddHabitForm.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { db, type Tag } from '$lib/db';

  export let allTags: Tag[];
  const dispatch = createEventDispatcher<{ added: void; cancel: void }>();

  const PALETTE = ['#7ab4ff', '#7ad198', '#d489d3', '#e3a44b', '#ff8181', '#a9d6e5'];

  let name = '';
  let emoji = '';
  let pickedTagIds: string[] = [];
  let newTagName = '';

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
      tagIds: pickedTagIds,
      createdAt: Date.now(),
      archivedAt: null,
      sortOrder: count
    });
    name = ''; emoji = ''; pickedTagIds = [];
    dispatch('added');
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
    maxlength="2" />

  <div class="mt-3">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Tags</div>
    <div class="flex flex-wrap gap-2">
      {#each allTags as t}
        <button type="button"
          class="text-xs px-2 py-1 rounded border
                 {pickedTagIds.includes(t.id) ? 'border-emerald-400 text-emerald-400' : 'border-neutral-700 text-neutral-400'}"
          on:click={() => toggleTag(t.id)}>{t.name}</button>
      {/each}
    </div>
    <input
      class="w-full mt-2 bg-neutral-900 rounded px-3 py-2 text-sm outline-none"
      placeholder="+ new tag (press Enter)"
      bind:value={newTagName}
      on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ensureTagFromInput(); } }} />
  </div>

  <div class="mt-4 flex gap-2 justify-end">
    <button class="text-sm text-neutral-500 px-3 py-1.5" on:click={() => dispatch('cancel')}>Cancel</button>
    <button class="text-sm bg-emerald-500 text-black px-3 py-1.5 rounded font-medium"
            on:click={submit} disabled={!name.trim()}>Add habit</button>
  </div>
</div>
```

- [ ] **Step 2: Wire into habits page**

In `src/routes/habits/+page.svelte`, add to imports:

```svelte
import AddHabitForm from '../../components/AddHabitForm.svelte';
```

Add state + load tags list:

```svelte
let showForm = false;
let allTags: Tag[] = [];
$: allTags = Array.from(tagsById.values());
```

Add the FAB and form at the bottom of `<main>`:

```svelte
{#if showForm}
  <AddHabitForm
    {allTags}
    on:added={() => { showForm = false; bumpData(); }}
    on:cancel={() => showForm = false} />
{:else}
  <button
    class="mt-6 w-full bg-neutral-900 hover:bg-neutral-800 rounded-lg py-3 text-sm font-medium"
    on:click={() => showForm = true}>+ Add habit</button>
{/if}
```

- [ ] **Step 3: Smoke test**

`npm run dev`. Open `/habits/`, click "+ Add habit", fill in name + emoji + pick tags + add a new tag, click "Add habit". The new habit appears in Active. Go back to Today (tab bar), see the new habit row. Check it off — chain updates.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddHabitForm.svelte src/routes/habits/+page.svelte
git commit -m "feat(habits): add habit form with tag picker and inline new-tag"
```

---

## Task 14: Habits screen — reorder via up/down buttons

**Files:**
- Modify: `src/routes/habits/+page.svelte`

(Why up/down instead of drag-and-drop: drag is hard on touch + adds a dep. Up/down is one-tap, accessible, and trivial.)

- [ ] **Step 1: Add reorder helpers to `lib/db.ts`**

Append:

```ts
export async function moveHabit(habitId: string, direction: 'up' | 'down'): Promise<void> {
  const active = await getActiveHabits();
  const idx = active.findIndex(h => h.id === habitId);
  if (idx < 0) return;
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= active.length) return;
  const a = active[idx], b = active[swap];
  await db.habits.bulkPut([
    { ...a, sortOrder: b.sortOrder },
    { ...b, sortOrder: a.sortOrder }
  ]);
}
```

- [ ] **Step 2: Add reorder buttons in habits page**

In the active-section row, before the Archive button, insert:

```svelte
<button class="text-neutral-500 px-1 text-xs" disabled={active[0].id === h.id}
        on:click={() => moveHabit(h.id, 'up').then(bumpData)}>↑</button>
<button class="text-neutral-500 px-1 text-xs" disabled={active[active.length - 1].id === h.id}
        on:click={() => moveHabit(h.id, 'down').then(bumpData)}>↓</button>
```

Add to imports:

```svelte
import { moveHabit } from '$lib/db';
```

- [ ] **Step 3: Smoke test**

`npm run dev`. On Habits, click ↑/↓ on rows — order changes. Switch to Today — order reflects the new sortOrder.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts src/routes/habits/+page.svelte
git commit -m "feat(habits): up/down reorder buttons for active habits"
```

---

## Task 15: History screen

**Files:**
- Create: `src/routes/history/+page.svelte`

- [ ] **Step 1: Implement the History page**

```svelte
<script lang="ts">
  import { db, type Habit, type Tag, type AdHocTodo, getAdHocTodosForDate, getDayNote } from '$lib/db';
  import { prevDay, todayLocal, type DateStr } from '$lib/date';
  import { dataVersion } from '$lib/store';
  import TagPill from '../../components/TagPill.svelte';

  let habits: Habit[] = [];
  let tagsById = new Map<string, Tag>();
  let days: {
    date: DateStr;
    completedHabits: Habit[];
    note: string;
    todos: AdHocTodo[];
  }[] = [];
  let expanded = new Set<DateStr>();

  const PAGE = 30;
  let limit = PAGE;

  async function load() {
    habits = await db.habits.toArray();
    tagsById = new Map((await db.tags.toArray()).map(t => [t.id, t]));

    const today = todayLocal();
    const result: typeof days = [];
    let d = today;
    for (let i = 0; i < limit; i++) {
      const completedIds = new Set((await db.completions.where('date').equals(d).toArray()).map(c => c.habitId));
      const completedHabits = habits.filter(h => completedIds.has(h.id));
      const note = await getDayNote(d);
      const todos = await getAdHocTodosForDate(d);
      result.push({ date: d, completedHabits, note, todos });
      d = prevDay(d);
    }
    days = result;
  }

  $: $dataVersion, limit, load();

  function toggle(date: DateStr) {
    if (expanded.has(date)) expanded.delete(date);
    else expanded.add(date);
    expanded = new Set(expanded);
  }

  function fmt(date: DateStr) {
    // Parse as local date — `new Date("2026-05-23")` is UTC-midnight, which can shift the displayed day in negative-UTC zones.
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <h1 class="text-2xl font-semibold">History</h1>

  <div class="mt-4 space-y-2">
    {#each days as d (d.date)}
      <button
        class="block w-full text-left bg-neutral-950 border border-neutral-900 rounded-lg p-3"
        on:click={() => toggle(d.date)}>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{fmt(d.date)}</span>
          <span class="text-[10px] text-neutral-500">{d.completedHabits.length}/{habits.length}</span>
        </div>
        <div class="flex gap-1 mt-2">
          {#each habits as h}
            {@const done = d.completedHabits.some(c => c.id === h.id)}
            <div class="w-2 h-2 rounded-sm {done ? 'bg-emerald-400' : 'bg-neutral-800'}"
                 title={h.name}></div>
          {/each}
        </div>

        {#if expanded.has(d.date)}
          <div class="mt-3 pt-3 border-t border-neutral-900 space-y-2">
            {#each d.completedHabits as h}
              <div class="text-xs text-neutral-300 flex items-center gap-2">
                <span>{h.emoji ?? '•'}</span><span>{h.name}</span>
              </div>
            {/each}
            {#if d.note}
              <div class="text-xs text-neutral-400 italic mt-2">"{d.note}"</div>
            {/if}
            {#if d.todos.length}
              <div class="text-xs text-neutral-500 mt-2">
                {d.todos.filter(t => t.done).length}/{d.todos.length} todos done
              </div>
            {/if}
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <button
    class="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 rounded-lg py-3 text-sm font-medium"
    on:click={() => limit += PAGE}>Load more</button>
</main>
```

- [ ] **Step 2: Smoke test**

`npm run dev`. Open `/history/`. See today + 29 days back, each as a card with completion dot strip and count. Tap a day — expands to show completed habit names, note, todo summary. Tap again — collapses. "Load more" reveals another 30 days.

- [ ] **Step 3: Commit**

```bash
git add src/routes/history/+page.svelte
git commit -m "feat(history): reverse-chronological day cards with expand"
```

---

## Task 16: backup.ts — Export & Import

**Files:**
- Create: `src/lib/backup.ts`

- [ ] **Step 1: Implement `src/lib/backup.ts`**

```ts
import { db } from './db';

const BACKUP_VERSION = 1;

export interface BackupBundle {
  backupVersion: number;
  exportedAt: string;
  habits: any[];
  tags: any[];
  completions: any[];
  dayNotes: any[];
  adHocTodos: any[];
}

export async function exportAll(): Promise<BackupBundle> {
  return {
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    habits:     await db.habits.toArray(),
    tags:       await db.tags.toArray(),
    completions:await db.completions.toArray(),
    dayNotes:   await db.dayNotes.toArray(),
    adHocTodos: await db.adHocTodos.toArray()
  };
}

export function downloadBundle(bundle: BackupBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `myjournal-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportDiff {
  habitsAdded: number;
  tagsAdded: number;
  completionsAdded: number;
  dayNotesAdded: number;
  adHocTodosAdded: number;
}

export async function previewImport(bundle: BackupBundle): Promise<ImportDiff> {
  const existing = {
    habits: new Set((await db.habits.toArray()).map(h => h.id)),
    tags: new Set((await db.tags.toArray()).map(t => t.id)),
    completions: new Set((await db.completions.toArray()).map(c => `${c.habitId}|${c.date}`)),
    dayNotes: new Set((await db.dayNotes.toArray()).map(n => n.date)),
    adHocTodos: new Set((await db.adHocTodos.toArray()).map(t => t.id))
  };
  return {
    habitsAdded:     bundle.habits.filter(h => !existing.habits.has(h.id)).length,
    tagsAdded:       bundle.tags.filter(t => !existing.tags.has(t.id)).length,
    completionsAdded:bundle.completions.filter(c => !existing.completions.has(`${c.habitId}|${c.date}`)).length,
    dayNotesAdded:   bundle.dayNotes.filter(n => !existing.dayNotes.has(n.date)).length,
    adHocTodosAdded: bundle.adHocTodos.filter(t => !existing.adHocTodos.has(t.id)).length
  };
}

/** Idempotent: existing rows by primary key are preserved unchanged. */
export async function applyImport(bundle: BackupBundle): Promise<void> {
  if (bundle.backupVersion !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${bundle.backupVersion}`);
  }

  // For each table, add only rows not already present.
  await db.transaction('rw',
    db.habits, db.tags, db.completions, db.dayNotes, db.adHocTodos,
    async () => {
      const existingHabits = new Set((await db.habits.toArray()).map(h => h.id));
      const existingTags = new Set((await db.tags.toArray()).map(t => t.id));
      const existingCompletions = new Set((await db.completions.toArray()).map(c => `${c.habitId}|${c.date}`));
      const existingNotes = new Set((await db.dayNotes.toArray()).map(n => n.date));
      const existingTodos = new Set((await db.adHocTodos.toArray()).map(t => t.id));

      await db.habits.bulkAdd(bundle.habits.filter(h => !existingHabits.has(h.id)));
      await db.tags.bulkAdd(bundle.tags.filter(t => !existingTags.has(t.id)));
      await db.completions.bulkAdd(bundle.completions.filter(c => !existingCompletions.has(`${c.habitId}|${c.date}`)));
      await db.dayNotes.bulkAdd(bundle.dayNotes.filter(n => !existingNotes.has(n.date)));
      await db.adHocTodos.bulkAdd(bundle.adHocTodos.filter(t => !existingTodos.has(t.id)));
    });
}

export function recordExportTimestamp() {
  localStorage.setItem('myjournal.lastExport', String(Date.now()));
}

export function getLastExportTimestamp(): number | null {
  const v = localStorage.getItem('myjournal.lastExport');
  return v ? Number(v) : null;
}
```

- [ ] **Step 2: Quick unit test for round-trip**

Create `tests/backup.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { exportAll, previewImport, applyImport } from '../src/lib/backup';

describe('backup', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('round-trips empty DB', async () => {
    const b = await exportAll();
    await applyImport(b);
    expect(await db.habits.count()).toBe(0);
  });

  it('round-trips populated DB without duplicating', async () => {
    await db.habits.put({ id: 'h1', name: 'A', tagIds: [], createdAt: 1, archivedAt: null, sortOrder: 0 });
    await db.completions.put({ habitId: 'h1', date: '2026-05-23', completedAt: 1 });

    const b = await exportAll();

    await db.delete(); await db.open();
    const diff = await previewImport(b);
    expect(diff.habitsAdded).toBe(1);

    await applyImport(b);
    expect(await db.habits.count()).toBe(1);

    // Apply again — idempotent
    await applyImport(b);
    expect(await db.habits.count()).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests across the suite pass (including the two new ones).

- [ ] **Step 4: Commit**

```bash
git add src/lib/backup.ts tests/backup.test.ts
git commit -m "feat(lib): JSON export/import with idempotent merge"
```

---

## Task 17: Settings screen

**Files:**
- Create: `src/routes/settings/+page.svelte`
- Modify: `src/components/TabBar.svelte` (no — settings is reached via gear in Habits, not as a tab)
- Modify: `src/routes/habits/+page.svelte` (add gear icon link)

- [ ] **Step 1: Implement `src/routes/settings/+page.svelte`**

```svelte
<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { db } from '$lib/db';
  import { exportAll, downloadBundle, previewImport, applyImport, recordExportTimestamp, type BackupBundle, type ImportDiff } from '$lib/backup';
  import { bumpData } from '$lib/store';

  const APP_VERSION = '0.1.0';

  let importState: { stage: 'idle' } | { stage: 'preview'; bundle: BackupBundle; diff: ImportDiff } | { stage: 'error'; message: string } = { stage: 'idle' };
  let resetConfirm = '';

  async function onExport() {
    const b = await exportAll();
    downloadBundle(b);
    recordExportTimestamp();
  }

  async function onImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as BackupBundle;
      if (bundle.backupVersion !== 1) throw new Error(`Unsupported version: ${bundle.backupVersion}`);
      const diff = await previewImport(bundle);
      importState = { stage: 'preview', bundle, diff };
    } catch (err) {
      importState = { stage: 'error', message: String(err) };
    }
  }

  async function confirmImport() {
    if (importState.stage !== 'preview') return;
    await applyImport(importState.bundle);
    importState = { stage: 'idle' };
    bumpData();
  }

  async function onReset() {
    if (resetConfirm !== 'DELETE') return;
    await db.delete();
    await db.open();
    bumpData();
    resetConfirm = '';
    goto(`${base}/`);
  }
</script>

<main class="px-4 pt-6 pb-4 max-w-md mx-auto">
  <a href="{base}/habits/" class="text-sm text-neutral-500">← Habits</a>
  <h1 class="text-2xl font-semibold mt-2">Settings</h1>

  <section class="mt-6">
    <button class="w-full bg-emerald-500 text-black rounded-lg py-3 font-medium" on:click={onExport}>
      Export data
    </button>
    <p class="text-xs text-neutral-500 mt-2">Downloads a JSON file containing every habit, completion, note, and todo.</p>
  </section>

  <section class="mt-8">
    <label class="block w-full bg-neutral-900 rounded-lg py-3 text-center text-sm font-medium cursor-pointer">
      Import data
      <input type="file" accept="application/json" class="hidden" on:change={onImportFile} />
    </label>
    {#if importState.stage === 'preview'}
      <div class="mt-3 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm">
        <div class="text-neutral-400 mb-2">This will add:</div>
        <ul class="text-xs space-y-1 text-neutral-300">
          <li>{importState.diff.habitsAdded} habits</li>
          <li>{importState.diff.tagsAdded} tags</li>
          <li>{importState.diff.completionsAdded} completions</li>
          <li>{importState.diff.dayNotesAdded} day notes</li>
          <li>{importState.diff.adHocTodosAdded} ad-hoc todos</li>
        </ul>
        <p class="text-xs text-neutral-500 mt-2">Existing data is preserved; nothing is overwritten.</p>
        <div class="mt-3 flex gap-2 justify-end">
          <button class="text-sm text-neutral-500 px-3 py-1.5" on:click={() => importState = { stage: 'idle' }}>Cancel</button>
          <button class="text-sm bg-emerald-500 text-black px-3 py-1.5 rounded font-medium" on:click={confirmImport}>Confirm import</button>
        </div>
      </div>
    {:else if importState.stage === 'error'}
      <p class="text-xs text-red-400 mt-2">{importState.message}</p>
    {/if}
  </section>

  <section class="mt-10">
    <div class="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Danger zone</div>
    <input
      class="w-full bg-neutral-900 rounded px-3 py-2 text-sm outline-none"
      placeholder='Type "DELETE" to enable reset'
      bind:value={resetConfirm} />
    <button
      class="w-full mt-2 bg-red-500/20 text-red-400 rounded-lg py-3 text-sm font-medium disabled:opacity-30"
      disabled={resetConfirm !== 'DELETE'}
      on:click={onReset}>Reset all data</button>
  </section>

  <p class="text-xs text-neutral-700 mt-10 text-center">My Journal v{APP_VERSION}</p>
</main>
```

- [ ] **Step 2: Add gear link from Habits**

In `src/routes/habits/+page.svelte`, just below the `<h1>`:

```svelte
<a href="{base}/settings/" class="absolute top-6 right-4 text-neutral-500 text-lg" aria-label="Settings">⚙</a>
```

Add to imports:

```svelte
import { base } from '$app/paths';
```

And wrap `<main>` with `class="relative ..."` or move the link inside an absolutely-positioned wrapper as appropriate.

- [ ] **Step 3: Smoke test**

`npm run dev`. Habits → gear → Settings. Click Export — downloads `myjournal-YYYY-MM-DD.json`. Open it, verify it has all data. Click Import → pick the same file → see "0 habits to add" (idempotent). Type "DELETE" → Reset enables → click → data wiped, redirected to Today, see seed data again.

- [ ] **Step 4: Commit**

```bash
git add src/routes/settings/+page.svelte src/routes/habits/+page.svelte
git commit -m "feat(settings): export, import-with-diff, two-step reset"
```

---

## Task 18: Backup nudge banner

**Files:**
- Create: `src/components/BackupBanner.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Implement `src/components/BackupBanner.svelte`**

```svelte
<script lang="ts">
  import { base } from '$app/paths';
  import { getLastExportTimestamp } from '$lib/backup';

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const DISMISS_KEY = 'myjournal.backupBannerDismissedAt';

  let show = false;
  let daysSince = 0;

  function refresh() {
    const lastExport = getLastExportTimestamp();
    if (lastExport === null) { show = false; return; }  // never nudge users who haven't exported yet
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const now = Date.now();
    const ageMs = now - lastExport;
    const dismissedRecently = now - dismissedAt < 7 * 24 * 60 * 60 * 1000;
    show = ageMs > THIRTY_DAYS_MS && !dismissedRecently;
    daysSince = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  }
  refresh();

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
      <button on:click={dismiss} class="text-amber-200/50 text-base leading-none" aria-label="Dismiss">×</button>
    </div>
  </div>
{/if}
```

- [ ] **Step 2: Mount in Today**

In `src/routes/+page.svelte`, add to imports:

```svelte
import BackupBanner from '../components/BackupBanner.svelte';
```

Insert at the top of `<main>`, before the `<h1>`:

```svelte
<BackupBanner />
```

- [ ] **Step 3: Smoke test (manual time travel)**

In devtools console:

```js
localStorage.setItem('myjournal.lastExport', String(Date.now() - 35 * 86400000));
location.reload();
```

Expected: amber banner appears on Today. Click × — dismissed for 7 days. Click "Export now" — goes to Settings.

Clean up:

```js
localStorage.removeItem('myjournal.lastExport');
localStorage.removeItem('myjournal.backupBannerDismissedAt');
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BackupBanner.svelte src/routes/+page.svelte
git commit -m "feat(today): 30-day backup nudge banner"
```

---

## Task 19: PWA — manifest, service worker, install banner

**Files:**
- Modify: `vite.config.ts`
- Create: `static/icons/icon-192.png`, `static/icons/icon-512.png`, `static/icons/icon-maskable.png`
- Create: `src/components/InstallBanner.svelte`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Configure vite-plugin-pwa**

Replace `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'My Journal',
        short_name: 'Journal',
        description: 'A deadly-simple personal habit tracker',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,webmanifest}'],
        navigateFallback: '/index.html'
      }
    })
  ]
});
```

`@vite-pwa/sveltekit` and `workbox-window` are already installed from Task 1 — nothing to add.

- [ ] **Step 2: Generate icons**

Use any 512×512 PNG of a journal/checkmark/notebook glyph. For development a quick option:

```bash
mkdir -p static/icons
# Use a simple SVG conversion or download a placeholder.
# For real release, replace with a designed icon.
```

Place three files: `static/icons/icon-192.png`, `static/icons/icon-512.png`, `static/icons/icon-maskable.png`. If you don't have them yet, create 1×1 PNGs as placeholders and revisit before deploy. (Manual step; not blocking.)

- [ ] **Step 3: Implement install banner**

Create `src/components/InstallBanner.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  const DISMISS_KEY = 'myjournal.installBannerDismissed';

  let deferred: any = null;
  let show = false;

  onMount(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const handler = (e: any) => {
      e.preventDefault();
      deferred = e;
      show = true;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  });

  async function install() {
    if (!deferred) return;
    deferred.prompt();
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
    <button class="text-sm bg-emerald-500 text-black px-3 py-1.5 rounded font-medium" on:click={install}>Install</button>
    <button class="text-neutral-500 text-lg" on:click={dismiss} aria-label="Dismiss">×</button>
  </div>
{/if}
```

- [ ] **Step 4: Mount install banner in the layout**

In `src/routes/+layout.svelte`, add to imports:

```svelte
import InstallBanner from '../components/InstallBanner.svelte';
```

Add inside the `{#if ready}` slot:

```svelte
<InstallBanner />
```

- [ ] **Step 5: Build and smoke test**

```bash
npm run build
npm run preview -- --port 4173
```

Open `http://localhost:4173/` in Chromium. DevTools → Application → Manifest — should show "My Journal" with the manifest fields. Application → Service Workers — should show one activated. Toggle network to "Offline" and reload — page still loads.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(pwa): manifest, service worker, install banner"
```

---

## Task 20: Playwright happy-path e2e

**Files:**
- Create: `e2e/happy-path.spec.ts`

- [ ] **Step 1: Write the e2e test**

```ts
import { test, expect } from '@playwright/test';

test('add a habit, check it off, reload, verify persistence', async ({ page, context }) => {
  // Clear IndexedDB before run (Playwright contexts default to a clean state, but be explicit)
  await context.clearCookies();
  await page.goto('/');

  // Wait for seed data to render
  await expect(page.locator('text=Study something new')).toBeVisible({ timeout: 5000 });

  // Go to Habits and add a new one
  await page.click('text=Habits');
  await page.click('text=+ Add habit');
  await page.fill('input[placeholder^="Habit name"]', 'E2E test habit');
  await page.fill('input[placeholder="Emoji"]', '🧪');
  await page.click('button:has-text("Add habit")');

  // Go to Today, see the new habit
  await page.click('text=Today');
  await expect(page.locator('text=E2E test habit')).toBeVisible();

  // Check it off (find its row's checkbox)
  const row = page.locator('div', { hasText: 'E2E test habit' }).filter({ has: page.locator('button[aria-label="Mark complete"]') }).first();
  await row.locator('button[aria-label="Mark complete"]').click();

  // Verify streak label became "1d"
  await expect(page.locator('text=E2E test habit').locator('..').locator('..')).toContainText('1d');

  // Reload, verify persisted
  await page.reload();
  await expect(page.locator('text=E2E test habit')).toBeVisible();
  await expect(page.locator('button[aria-label="Mark incomplete"]')).toHaveCount(1);
});
```

- [ ] **Step 2: Install Playwright browser**

```bash
npx playwright install chromium
```

- [ ] **Step 3: Run e2e**

```bash
npm run e2e
```

Expected: 1 test passes. (May take 30-60s for build + preview start.)

- [ ] **Step 4: Commit**

```bash
git add e2e/happy-path.spec.ts
git commit -m "test(e2e): add Playwright happy-path coverage"
```

---

## Task 21: GitHub Pages deploy

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `package.json` (scripts)
- Create: `docs/superpowers/smoke-check.md`

- [ ] **Step 1: Configure base path for GitHub Pages**

If the repo is `arun/my-journal`, the site lives at `https://arun.github.io/my-journal/`. The base path is `/my-journal`.

Already wired via `BASE_PATH` env var in `svelte.config.js` (Task 1). No change needed.

- [ ] **Step 2: GitHub Actions workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: BASE_PATH="/${GITHUB_REPOSITORY##*/}" npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Create smoke check doc**

Create `docs/superpowers/smoke-check.md`:

```markdown
# Pre-Deploy Smoke Check

Run this 7-step manual check on a real phone before tagging a release.

1. **Fresh install:** open the deployed URL in mobile Safari/Chrome. See the "Install My Journal" banner. Install.
2. **Open from home screen:** confirm the app opens standalone (no browser chrome).
3. **Add habit:** Habits → + Add habit → name + emoji + tag. Save. Appears on Today.
4. **Check off:** tap the new habit's checkbox. Fills green. Streak says "1d".
5. **Write note:** Today → tap "Add a note about today…", type a sentence, tap away. Reload — text persists.
6. **Export → Import:** Settings → Export. Open Files → see `myjournal-YYYY-MM-DD.json`. Open the file, inspect: should contain habits, completions, notes. Import the same file → see "0 added" diff (idempotent).
7. **Offline:** turn airplane mode on, force-quit, reopen. App loads. Check off a habit. Turn airplane mode off — data is still there.

If any step fails, do not deploy; file an issue.
```

- [ ] **Step 4: Commit**

```bash
git add .github/ docs/superpowers/smoke-check.md
git commit -m "ci: GitHub Pages deploy + pre-deploy smoke checklist"
```

- [ ] **Step 5: First deploy (manual, after pushing to GitHub)**

After pushing the repo to GitHub, enable Pages: Repo → Settings → Pages → Source: "GitHub Actions". Push to `main` → workflow runs → site lives at `https://<you>.github.io/my-journal/`.

---

## Task 22: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# My Journal

A deadly-simple, local-first personal journal for tracking habits and goals. Inspired by Seinfeld's "don't break the chain" and James Clear's "never miss twice."

- **Local-only** — IndexedDB, no servers, no auth, no telemetry
- **PWA** — installs to your phone home screen, works offline
- **Tag-as-goals** — flat habit list with `#career` / `#health` / etc.
- **30-day chain** per habit on the home screen
- **"Never miss twice"** streak rule

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run e2e
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push to `main` → GitHub Actions builds and publishes to GitHub Pages.

## Design

See [`docs/superpowers/specs/2026-05-23-personal-journal-design.md`](docs/superpowers/specs/2026-05-23-personal-journal-design.md).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review Notes (already applied)

- Spec § 3 in-scope list mapped to tasks: project setup (T1), date/streaks libs (T2-T3), Dexie schema (T4-T5), Today screen with chains/streaks/checkboxes/header/todos/note (T6-T11), Habits CRUD + reorder (T12-T14), History (T15), Backup module + Settings (T16-T17), Backup nudge (T18), PWA + install (T19), e2e (T20), Deploy + smoke checklist (T21), README (T22).
- All out-of-scope items in spec § 3 are not implemented (no notifications, no cadence variants, no cloud sync, etc.).
- `computeStreak` signature is consistent across Tasks 3 and 8 (same in tests, lib, and consumer).
- Property names match across tasks: `archivedAt`, `tagIds`, `sortOrder`, `completedAt`, `doneAt` — verified by grep.
- No placeholders, no "TODO", no "similar to Task N".
- The Dexie composite key `[habitId+date]` is used identically in T4 schema and T5 helpers.

## Definition of Done

- All Vitest tests pass (`npm test`).
- Playwright happy-path passes (`npm run e2e`).
- `npm run build` produces a working static site.
- Manual smoke-check in `docs/superpowers/smoke-check.md` passes on a real phone.
- Deployed to GitHub Pages via the workflow.
