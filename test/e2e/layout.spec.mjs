import { test, expect } from '@playwright/test';

for (const colorScheme of ['light', 'dark']) {
  for (const width of [320, 375, 768, 1280]) {
    test(`no horizontal overflow at ${width}px (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('hero art is hidden on phones and shown on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('.hero-art')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.hero-art')).toBeVisible();
});

const cardBoxes = (page) =>
  page.locator('.card').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y) };
    }),
  );

test('practice cards stack on phones and sit in a row on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  let boxes = await cardBoxes(page);
  expect(boxes).toHaveLength(3);
  expect(new Set(boxes.map((b) => b.x)).size).toBe(1);
  expect(boxes[0].y).toBeLessThan(boxes[1].y);
  expect(boxes[1].y).toBeLessThan(boxes[2].y);

  await page.setViewportSize({ width: 1280, height: 800 });
  boxes = await cardBoxes(page);
  expect(new Set(boxes.map((b) => b.y)).size).toBe(1);
});

test('header is sticky only on tall viewports', async ({ page }) => {
  const position = () =>
    page.locator('.site-header').evaluate((el) => getComputedStyle(el).position);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  expect(await position()).toBe('sticky');
  await page.setViewportSize({ width: 1280, height: 600 });
  expect(await position()).toBe('static');
});

test('keyboard focus is visible, starting with the skip link', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Tab');
  const wordmark = page.locator('.wordmark');
  await expect(wordmark).toBeFocused();
  const outline = await wordmark.evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.outlineStyle} ${s.outlineWidth}`;
  });
  expect(outline).toBe('solid 2px');
});

test('reduced motion removes transitions', async ({ page }) => {
  const duration = () =>
    page.locator('.hero .button').evaluate((el) => getComputedStyle(el).transitionDuration);
  await page.goto('/');
  expect(await duration()).not.toBe('0s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await duration()).toBe('0s');
});

test('self-hosted fonts load and nothing comes from a third party', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((f) => ({ family: f.family.replace(/"/g, ''), status: f.status }));
  });
  const loaded = new Set(fonts.filter((f) => f.status === 'loaded').map((f) => f.family));
  expect(loaded).toEqual(new Set(['Crimson Pro', 'Inter Tight']));
  expect(fonts.filter((f) => f.status === 'error')).toEqual([]);
  expect(requests.filter((u) => !u.startsWith(baseURL))).toEqual([]);
});
