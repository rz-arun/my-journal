import { test, expect } from '@playwright/test';

test('habit name on Today links to stats page; calendars render', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Study something new')).toBeVisible({ timeout: 10_000 });

  // Check off today and yesterday's habit to populate data
  await page.locator('button[aria-label="Mark complete"]').first().click();

  // Tap the habit name
  await page.getByRole('link', { name: /Study something new/ }).click();

  // Stats page loads
  await expect(page.getByRole('heading', { name: 'Study something new' })).toBeVisible();
  await expect(page.getByText('Current')).toBeVisible();
  await expect(page.getByText('Longest')).toBeVisible();
  await expect(page.getByText('Total')).toBeVisible();

  // Two month sections render
  const sectionHeadings = page.locator('h2');
  await expect(sectionHeadings).toHaveCount(2);

  // Back link works
  await page.getByRole('link', { name: '← Today' }).click();
  await expect(page.getByText('Study something new')).toBeVisible();
});
