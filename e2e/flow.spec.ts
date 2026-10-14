import { test, expect, type Page } from '@playwright/test';

/** Headless WebGL renders at a few fps, so the test teleports between beats instead of walking far. */
const tp = (page: Page, x: number, z: number) =>
  page.evaluate(([a, b]) => (window as unknown as { __tm: { teleport: (x: number, z: number) => void } }).__tm.teleport(a, b), [x, z]);
const shot = (page: Page, name: string, project: string) => page.screenshot({ path: `test-results/shots/${project}-${name}.png` });

test('title → studio → door → inside → memory card', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const P = info.project.name;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Trú Mưa' })).toBeVisible();
  await page.waitForTimeout(4000);
  await shot(page, '1-title', P);

  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByText('Hôm nay mặc gì nhỉ?')).toBeVisible();
  await page.getByRole('button', { name: /Màu đầm #7fb3ea/ }).click();
  await page.waitForTimeout(1500);
  await shot(page, '2-studio', P);

  await page.getByRole('button', { name: /Tới trước cửa quán/ }).click();
  await page.waitForFunction(() => !!(window as unknown as { __tm?: unknown }).__tm);
  await page.waitForTimeout(3000);
  await shot(page, '3-door', P);

  await tp(page, 0, 1.8);
  const door = page.getByRole('button', { name: /Mở cửa bước vào/ });
  await expect(door).toBeVisible({ timeout: 15000 });
  await door.click();
  await page.waitForTimeout(2500);
  await shot(page, '4-door-open', P);

  await tp(page, 0, -3);
  await page.waitForTimeout(2500);
  await shot(page, '5-inside', P);

  await tp(page, -2.3, -1.6);
  const prompt = page.locator('.prompt');
  await expect(prompt).toContainText('Cây dù', { timeout: 15000 });
  await prompt.click();
  await expect(page.getByRole('dialog')).toContainText('che dù đưa em về');
  await shot(page, '6-memory', P);
  await page.getByRole('button', { name: /Cất lại/ }).click();
  await expect(page.getByText(/Kỷ niệm\s*1\/27/)).toBeVisible();

  await tp(page, 4, -6);
  await page.waitForTimeout(2500);
  await shot(page, '7-room', P);
  expect(errors.filter((e) => !/fonts\.g|net::ERR|favicon/.test(e))).toEqual([]);
});
