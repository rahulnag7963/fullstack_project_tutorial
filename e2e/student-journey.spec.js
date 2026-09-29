import { expect, test } from '@playwright/test';

test('a student signs up, uses every HTTP method, gets blocked, and logs out', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    // The browser always logs failed requests; the 404 from the authorization demo is expected.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      consoleErrors.push(message.text());
    }
  });

  // A fresh account each run, so the list always starts empty.
  const email = `e2e-${Date.now()}@demo.test`;
  const panel = page.getByRole('complementary', { name: 'What just happened?' });

  // Sign up (authentication).
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'WELCOME' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Sign up' }).click();

  // GET runs as soon as the todo screen appears.
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'GET · READ' })).toBeVisible();
  await expect(page.getByText('No tasks yet')).toBeVisible();

  // POST
  await page.getByRole('button', { name: 'Add new task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByLabel('Task name').fill('Reading books');
  await dialog.getByLabel('Note').fill('Read every day');
  await dialog.getByRole('button', { name: 'Finish' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Edit Reading books' })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'POST · CREATE' })).toBeVisible();
  await expect(panel.getByText('201 Created').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/after-create.png', fullPage: true });

  // PATCH (toggle)
  const checkbox = page.getByRole('checkbox', { name: 'Mark Reading books as done' });
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  await expect(panel.getByRole('heading', { name: 'PATCH · UPDATE' })).toBeVisible();

  // PATCH (edit)
  await page.getByRole('button', { name: 'Edit Reading books' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit task' });
  await editDialog.getByLabel('Task name').fill('Reading novels');
  await editDialog.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('button', { name: 'Edit Reading novels' })).toBeVisible();

  // Authorization demo
  await page.getByRole('button', { name: "Try to edit someone else's todo" }).click();
  await expect(panel.getByRole('heading', { name: 'AUTHORIZATION · BLOCKED' })).toBeVisible();
  await expect(panel.getByText('404 Not Found').first()).toBeVisible();
  await expect(page.getByText('Blocked!')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/authorization.png', fullPage: true });

  // State tab
  await panel.getByRole('tab', { name: 'State' }).click();
  await expect(panel.getByRole('heading', { name: 'STATE' })).toBeVisible();
  await expect(panel.getByText('"Reading novels"')).toBeVisible();

  // Token tab
  await panel.getByRole('tab', { name: 'Token' }).click();
  await expect(panel.getByRole('cell', { name: email })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/token.png', fullPage: true });

  // DELETE
  await panel.getByRole('tab', { name: 'Live' }).click();
  await page.getByRole('button', { name: 'Delete Reading novels' }).click();
  await expect(panel.getByRole('heading', { name: 'DELETE · REMOVE' })).toBeVisible();
  await expect(panel.getByText('204 No Content').first()).toBeVisible();
  await expect(page.getByText('No tasks yet')).toBeVisible();

  // Log out
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('the demo account sees seeded todos, and the layout works at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Email').fill('alice@demo.test');
  await page.getByLabel('Password').fill('demo-password-123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('button', { name: 'Edit Reading books' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Climb mountains' })).toBeVisible();

  // Nothing should scroll sideways on a phone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/screens/phone.png', fullPage: true });
});
