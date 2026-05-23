import { test, expect } from '@playwright/test';

test('archive sends habit to archived section', async ({ page }) => {
  await page.goto('/habits/');
  await expect(page.getByText('Study something new')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Active (3)')).toBeVisible();
  await expect(page.getByText(/^Archived/)).toHaveCount(0);

  // Click the first Archive button (corresponds to first active habit: "Study something new")
  await page.getByRole('button', { name: 'Archive' }).first().click();

  // Active count drops; Archived section appears
  await expect(page.getByText('Active (2)')).toBeVisible();
  await expect(page.getByText(/^Archived \(1\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(1);

  // "Study something new" no longer appears in the active section
  // (it would still show in archived — confirm by checking archived section contains it)
  const archivedSection = page.locator('section', { hasText: 'Archived (1)' });
  await expect(archivedSection.getByText('Study something new')).toBeVisible();
});

test('restore moves habit back to active', async ({ page }) => {
  await page.goto('/habits/');
  await expect(page.getByText('Active (3)')).toBeVisible({ timeout: 10_000 });

  // Archive then restore
  await page.getByRole('button', { name: 'Archive' }).first().click();
  await expect(page.getByText('Active (2)')).toBeVisible();

  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Active (3)')).toBeVisible();
  await expect(page.getByText(/^Archived/)).toHaveCount(0);
});

test('edit habit name persists to DB', async ({ page }) => {
  await page.goto('/habits/');
  await expect(page.getByText('Study something new')).toBeVisible({ timeout: 10_000 });

  // Click the pencil button on the first habit
  await page.getByRole('button', { name: 'Edit' }).first().click();

  // The edit form appears with pre-filled name
  await expect(page.getByText('Editing')).toBeVisible();
  const nameInput = page.getByPlaceholder(/Habit name/);
  await expect(nameInput).toHaveValue('Study something new');

  // Edit the name
  await nameInput.fill('Study Rust 30 min');

  // Save
  await page.getByRole('button', { name: 'Save changes' }).click();

  // Form closes, new name visible
  await expect(page.getByText('Editing')).toHaveCount(0);
  await expect(page.getByText('Study Rust 30 min')).toBeVisible();
  await expect(page.getByText('Study something new')).toHaveCount(0);

  // Persist after reload
  await page.reload();
  await expect(page.getByText('Study Rust 30 min')).toBeVisible({ timeout: 10_000 });
});

test('edit habit tags persists to DB', async ({ page }) => {
  await page.goto('/habits/');
  await expect(page.getByText('Study something new')).toBeVisible({ timeout: 10_000 });

  // Click the pencil button on the first habit (Study)
  await page.getByRole('button', { name: 'Edit' }).first().click();

  // Toggle off "Career" tag (it's pre-selected)
  await page.getByRole('button', { name: 'Career' }).click();

  // Save
  await page.getByRole('button', { name: 'Save changes' }).click();

  // Reload and verify the row no longer has "Career" pill
  await page.reload();
  await expect(page.getByText('Study something new')).toBeVisible({ timeout: 10_000 });

  // The row for "Study something new" should no longer contain a "Career" tag pill
  const studyRow = page.locator('div').filter({ hasText: /^📚Study something new/ }).first();
  await expect(studyRow.getByText('Career')).toHaveCount(0);
});
