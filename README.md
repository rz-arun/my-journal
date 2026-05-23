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

## Implementation plan

See [`docs/superpowers/plans/2026-05-23-personal-journal.md`](docs/superpowers/plans/2026-05-23-personal-journal.md).
