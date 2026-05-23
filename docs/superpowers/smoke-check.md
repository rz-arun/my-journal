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
