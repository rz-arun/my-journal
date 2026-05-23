# My Journal — Design Spec

**Date:** 2026-05-23
**Status:** Approved for implementation planning
**Author:** Arun (brainstormed with Claude)

## 1. Purpose

A deadly-simple, local-first, phone-installable web app for tracking personal and career goals as **daily habits**, with a short optional daily note. The success criterion is sustained use over months — the design optimizes for low daily friction and an honest, motivating feedback loop.

Inspirations: Jerry Seinfeld's "don't break the chain", James Clear's *Atomic Habits* ("never miss twice"), bullet-journal minimalism.

## 2. Core Concept

The app is primarily a **habit tracker**, secondarily a **micro-journal**. Each day shows a small list of recurring habits to tick off, an optional list of ad-hoc todos, and one optional short note. The headline feedback is a **30-day chain of dots per habit**, showing exactly which habits are sustaining and which are slipping.

There is no separate "goals" entity — goals are expressed as **tags on habits** (e.g., `#career`, `#health`, `#short-term`, `#long-term`). This keeps the data model flat and the UI uncluttered.

## 3. Scope

### In scope
- Habit CRUD (create, archive, edit, reorder)
- Tag CRUD (flat list, color-coded)
- Daily habit check-off with optimistic UI
- Ad-hoc todos attached to a specific date
- One optional daily note per day
- 30-day chain visualization per habit
- "Never miss twice" streak computation with on/warning/broken states
- Three screens: Today, History, Habits; plus a minimal Settings
- PWA with offline-first service worker caching
- Manual JSON export / import (backup)
- 30-day backup-nudge banner
- Unit tests for streak logic, date helpers, schema migrations
- One Playwright happy-path e2e test
- Static-site deploy to GitHub Pages

### Out of scope (deliberate non-features)
- Cloud sync, accounts, auth, multi-device sync
- Push notifications / reminders
- Goals as a separate entity with milestones
- Habit cadences other than daily (no "3x/week", no specific weekdays)
- Editing past completions from the Today screen (must go via History)
- Bulk actions, multi-select
- Themes, font size, or other settings beyond export/import/reset
- Telemetry, analytics
- Conflict resolution / CRDTs

## 4. Architecture

### Stack
- **Svelte 5** + **SvelteKit static adapter** — UI framework + file-based routing
- **Vite** — bundler
- **TypeScript** — used in the data layer for schema correctness; UI components stay light
- **Tailwind CSS** — utility styling, dark mode native
- **Dexie 4** — typed IndexedDB wrapper with schema versioning
- **vite-plugin-pwa** (Workbox `generateSW`) — manifest + service worker
- **Vitest** + **fake-indexeddb** — unit testing
- **Playwright** — single happy-path e2e

### Deployment
- Static `dist/` output deployed to GitHub Pages via a `npm run deploy` script
- HTTPS required for PWA install on iOS — GH Pages provides this
- No backend, no API, no server-side anything

### Code layout
```
src/
  lib/
    db.ts              # Dexie schema + typed queries
    streaks.ts         # "never miss twice" pure functions
    date.ts            # local-day-id helpers (YYYY-MM-DD)
    backup.ts          # JSON export / import
  routes/
    +page.svelte             # Today (home)
    history/+page.svelte     # Past days, scrollable
    habits/+page.svelte      # Manage habits + tags
    settings/+page.svelte    # Export/Import/Reset
  components/
    HabitRow.svelte    # One habit row with 30-day chain
    Chain.svelte       # 30-day dot strip
    Checkbox.svelte
    TagPill.svelte
    TabBar.svelte
  app.css
docs/
  superpowers/
    specs/
      2026-05-23-personal-journal-design.md
    smoke-check.md
```

Target: ~1000 lines of substance.

## 5. Data Model (Dexie tables)

All five tables. Streaks are **computed**, never stored.

### `habits`
```ts
{
  id: string              // crypto.randomUUID()
  name: string            // "Study Rust"
  emoji?: string          // "📚" — optional
  tagIds: string[]        // ["career", "long-term"]
  createdAt: number       // ms timestamp
  archivedAt: number|null // soft-delete; preserves history
  sortOrder: number       // for drag-to-reorder
}
```
Indexed on: `archivedAt`, `sortOrder`.

### `tags`
```ts
{
  id: string              // user-typed slug, e.g. "career"
  name: string            // display name "Career"
  color: string           // hex from preset palette (6-8 colors)
}
```

### `completions`
```ts
{
  habitId: string         // FK → habits.id
  date: string            // "2026-05-23" — local-day
  completedAt: number     // ms timestamp of the check-off
}
```
**Composite primary key:** `[habitId+date]`. Indexed on `date` for fast "show today" queries.

### `dayNotes`
```ts
{
  date: string            // "2026-05-23" — PK
  text: string            // free-form
  updatedAt: number
}
```

### `adHocTodos`
```ts
{
  id: string
  date: string            // the day it belongs to
  text: string
  done: boolean
  doneAt: number|null
}
```
Indexed on `date`.

### Key data-model choices
- **`date` as `YYYY-MM-DD` string, never timestamp.** A "day" is a local-calendar concept. Storing the local-day string sidesteps timezone bug classes.
- **Streaks computed, not stored.** `streaks.ts` derives `{ current, longest, status, totalDays }` from a completions query. No derived state to keep in sync.
- **Soft-delete habits.** `archivedAt` preserves months of chain history when a habit is dropped from the active list.
- **Composite key on completions.** Idempotent check-offs by design.

## 6. Screens & UX

### Tab bar
Three tabs at the bottom of every screen (thumb-reachable on phone): **Today** · **History** · **Habits**. A gear icon top-right of Habits opens Settings.

### A. Today (home)
Default route. Top-to-bottom:
1. **Header strip** — friendly date ("Sat, May 23"), tiny 7-day overall completion strip below
2. **Habit rows** — one per non-archived habit, ordered by `sortOrder`. Each row: emoji + name + tag pills on the left; 30-day chain + streak counter + checkbox on the right
3. **Ad-hoc todos** — collapsed if empty; "+ Add today's todo" inline input when expanded
4. **Daily note** — muted "Add a note about today…" prompt; tap expands a 4-line textarea; saves on blur

### B. History
Reverse-chronological infinite scroll of past days. Each day card shows the date, that day's completion pattern, the note if any, and ad-hoc todos. Tap to expand. Edit-day available from the expanded view (not from Today — deliberate friction).

### C. Habits (manage)
Two sections: Active habits, Archived habits. Per habit: edit name/emoji/tags, drag handle to reorder (active only), archive/unarchive button. FAB ("+") opens add-habit form: name, emoji picker, tag chips (existing + "new tag" inline).

### D. Settings
Four items only:
- Export data (downloads `myjournal-YYYY-MM-DD.json`)
- Import data (file picker → diff preview → confirm)
- App version (build hash)
- Reset all data (two-step confirm, must type "DELETE")

### Key flows
- **Morning open** → Today, all checkboxes empty for today, chains current
- **Check off** → checkbox fills with tag color, dot animates onto the chain's right end, streak ticks. Optimistic; Dexie write fires after
- **Slip a day** → next day's chain shows a gap; streak number turns amber (warning state); second consecutive slip greys it (broken)
- **Quick reflect** → tap "Add a note", type, tap away
- **Adjust past mistake** → History → expand day → "Edit"

## 7. The "Never Miss Twice" Streak Rule

### Algorithm

Walk backward from today. Track `current` (completed days in this run) and `consecutiveMisses`. Completion: `current++`, `misses = 0`. Miss: `misses++` (no change to `current`). Stop when `misses >= 2`.

**Today is open**, not penalized. If today's habit isn't done yet, we skip today and start counting from yesterday — but completing today still adds 1 to `current`.

### Status values shown next to the streak number
- **`on`** (green, e.g. `14d`) — no recent miss
- **`warning`** (amber, e.g. `14d ·`) — yesterday missed, streak still alive; one more miss kills it
- **`broken`** (grey "streak broken", `0`) — already missed twice in a row; new completion starts a fresh streak at 1

The chain visualization is honest: it always shows actual completions, including gaps inside long streaks. The number reflects only the current active run after the last "broken" event.

### Pure function signature
```ts
export function computeStreak(
  completionsForHabit: Set<DateStr>,
  today: DateStr,
  habitCreatedAt: DateStr
): { current: number; status: 'on'|'warning'|'broken'; longest: number; totalDays: number }
```

### Worked examples
Reading newest-first, `✓` = done, `·` = miss:

| Pattern (last 10 days, T at right) | current | status |
|---|---|---|
| `✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓` (T=✓) | 10 | on |
| `✓ ✓ ✓ · ✓ ✓ ✓ ✓ ✓ ✓` (T=✓) | 9 | on |
| `✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ·` (T=·, open) | 9 | on |
| `✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ · ·` (T=·, open) | 8 | warning |
| `✓ ✓ ✓ ✓ ✓ ✓ ✓ · · ✓` (T=✓) | 1 | on |
| `✓ ✓ ✓ ✓ ✓ · · ✓ ✓ ✓` (T=✓) | 3 | on |

## 8. PWA & Storage

### PWA shell
- Manifest: `display: standalone`, dark theme color, full icon set (192/512/maskable)
- Service worker (Workbox `generateSW`): pre-caches the full app shell at build time → instant open, full offline support
- One-time "Add to Home Screen" banner on first phone visit, dismissable
- No notifications (iOS PWA push is unreliable; design avoids dependency)

### Storage layer
- IndexedDB via Dexie, database name `myjournal`, starting at version 1
- Schema migrations through Dexie's `version().stores().upgrade()` chain — new versions added, old ones never edited
- Single transaction per check-off; optimistic UI with revert + toast on failure

### Backup & restore
- **JSON export** (Settings → Export): one file `myjournal-YYYY-MM-DD.json` with all five tables. Human-readable, future-proof.
- **JSON import** (Settings → Import): pick file → preview diff → confirm. Idempotent.
- **30-day backup-nudge banner**: shown on Today when last export is >30 days old. Dismissable; only counted after first successful export. No nag for users who never export.

### iOS warning that drove this decision
iOS may purge IndexedDB if the PWA isn't used for ~7 weeks. JSON export is the safety net that makes "local-only" defensible.

## 9. Non-Functional Requirements

- **Performance:** first paint <300ms on a mid-range phone after install; check-off feedback <50ms (optimistic UI).
- **Bundle size:** target <100 kB gzipped for the JS bundle. Tailwind purged.
- **Accessibility:** keyboard-navigable on desktop; min 44×44 tap targets on phone; color contrast WCAG AA in the dark theme.
- **Privacy:** zero network requests after initial load. No third-party scripts. No analytics.
- **Browsers:** Chromium-family (incl. Android), Safari (incl. iOS) latest two versions. Firefox best-effort.

## 10. Testing Strategy

| Layer | Tool | Coverage | Why |
|---|---|---|---|
| `lib/streaks.ts` | Vitest | ~15 cases (incl. DST + boundaries) | Behavioral spine; bugs silently corrupt months of perceived progress |
| `lib/date.ts` | Vitest | ~6 cases (DST, leap year, year boundary) | Subtle and easy to break |
| `lib/db.ts` migrations | Vitest + fake-indexeddb | 1 per version bump | Schema evolution must preserve data |
| Today screen | Playwright | 1 happy-path e2e | Add habit → check off → reload → persistence verified |
| Components | — | None | Thin Svelte; not worth the testing overhead |

A 7-step manual smoke checklist lives in `docs/superpowers/smoke-check.md` and is run before each deploy.

## 11. Open Risks & Mitigations

| Risk | Mitigation |
|---|---|
| iOS IndexedDB purge after 7 weeks unused | 30-day backup nudge + easy JSON export |
| User abandons after a "broken" streak | "Never miss twice" softens the cliff; chain view shows progress honestly without overweighting one miss |
| Scope creep ("just one more cadence type…") | Out-of-scope list in this spec is binding; deferred to a v2 spec if revisited |
| Svelte 5 churn / framework risk | Stack is mainstream and stable; the data layer (Dexie + JSON) is framework-independent, so a future rewrite is cheap |
| Lost data from browser clear | JSON export is the answer; nudge banner ensures it's done |

## 12. Success Criteria

The app is successful if:
1. After 90 days of personal use, you have ≥60 days with at least one habit completed.
2. You can open the app on your phone offline and check off in <5 seconds.
3. You can export and re-import your data and confirm no loss.
4. Adding a new habit takes <30 seconds.
5. The codebase remains under ~1500 lines, with the streak logic in a single, tested file.
