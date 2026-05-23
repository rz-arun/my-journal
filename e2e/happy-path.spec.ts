import { test, expect } from '@playwright/test';

// Wipe IndexedDB on the first page load of each test, but not on
// subsequent reloads within the same test (persistence check needs the data).
// sessionStorage persists across reloads in the same tab but is cleared
// when a new page is opened — perfect as a "first-load" sentinel.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const SENTINEL_KEY = '__idbWiped';
    if (!sessionStorage.getItem(SENTINEL_KEY)) {
      sessionStorage.setItem(SENTINEL_KEY, '1');
      indexedDB.deleteDatabase('myjournal');
    }
  });
});

test('add a habit, check it off, reload, verify persistence', async ({ page }) => {
  await page.goto('/');

  // Wait for the layout to finish loading (seed data + ready flag)
  await expect(page.getByText('Study something new')).toBeVisible({ timeout: 10_000 });

  // Navigate to Habits
  await page.getByRole('link', { name: /Habits/ }).click();
  await expect(page.getByRole('heading', { name: 'Habits' })).toBeVisible();

  // Open the Add habit form
  await page.getByRole('button', { name: '+ Add habit' }).click();

  // Fill in name + emoji
  await page.getByPlaceholder(/Habit name/).fill('E2E test habit');
  await page.getByPlaceholder('Emoji').fill('🧪');

  // Submit
  await page.getByRole('button', { name: 'Add habit' }).click();

  // Wait for the form to close (the "Cancel" button disappears)
  await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible({ timeout: 10_000 });

  // The new habit appears in the active list
  await expect(page.getByText('E2E test habit')).toBeVisible({ timeout: 10_000 });

  // Navigate to Today
  await page.getByRole('link', { name: /Today/ }).click();

  // Find the habit row and check it off
  await expect(page.getByText('E2E test habit')).toBeVisible();
  const checkBtn = page.locator('button[aria-label="Mark complete"]').last();
  await checkBtn.click();

  // The checkbox now reads "Mark incomplete" — i.e., it's checked
  await expect(page.locator('button[aria-label="Mark incomplete"]').last()).toBeVisible();

  // Reload — IndexedDB state should persist
  await page.reload();
  await expect(page.getByText('E2E test habit')).toBeVisible({ timeout: 10_000 });
  // After reload, there should still be a "Mark incomplete" button (i.e., the check is preserved)
  await expect(page.locator('button[aria-label="Mark incomplete"]').first()).toBeVisible();
});
