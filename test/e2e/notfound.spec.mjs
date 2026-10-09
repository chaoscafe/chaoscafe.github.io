import { test, expect } from '@playwright/test';

test('404 page is styled', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/404.html');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(244, 239, 230)');
  await expect(page.locator('h1')).toBeVisible();
});
