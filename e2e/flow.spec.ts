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
  // slow CI GPUs: the press is consumed on the next rendered frame, so retry until the card opens
  await expect(async () => {
    if (!(await page.getByRole('dialog').isVisible())) await page.keyboard.press('KeyE');
    await expect(page.getByRole('dialog')).toContainText('che dù đưa em về', { timeout: 4000 });
  }).toPass({ timeout: 45000 });
  await shot(page, '6-memory', P);
  await page.getByRole('button', { name: /Cất lại/ }).click();
  await expect(page.getByText(/Kỷ niệm\s*1\/27/)).toBeVisible();

  // rain chapter: walk up to the middle frame, play it through the choice to the postcard
  await tp(page, -0.7, -8.9);
  await expect(prompt).toContainText('Chương mưa 25 · 07', { timeout: 15000 });
  await expect(async () => {
    if (!(await page.locator('.chapter').isVisible())) await page.keyboard.press('KeyE');
    await expect(page.locator('.chapter')).toContainText('Sala, hoa và Trung Nguyên', { timeout: 4000 });
  }).toPass({ timeout: 45000 });
  await shot(page, '7-chapter', P);
  const album = page.getByRole('button', { name: /Cất vào album/ });
  for (let i = 0; i < 30 && !(await album.isVisible()); i++) {
    const pick = page.getByRole('button', { name: 'Góc có đèn vàng' });
    await ((await pick.isVisible()) ? pick : page.getByRole('button', { name: /Tiếp/ })).click();
  }
  await expect(page.locator('.postcard')).toContainText('dạ đồng ý');
  await shot(page, '8-postcard', P);
  await album.click();
  await expect(page.getByText(/Chương mưa\s*1\/3/)).toBeVisible();

  // ambient rain toggles on and off without errors
  await page.getByRole('button', { name: /Tiếng mưa: tắt/ }).click();
  await page.getByRole('button', { name: /Tiếng mưa: bật/ }).click();

  await tp(page, 4, -6);
  await page.waitForTimeout(2500);
  await shot(page, '9-room', P);
  expect(errors.filter((e) => !/fonts\.g|net::ERR|favicon/.test(e))).toEqual([]);
});

test('album reopens memories from the title screen', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tru-mua-v1', JSON.stringify({ state: { seen: ['yellow-umbrella'], chaptersDone: ['rain-2507'] }, version: 0 })),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Album kỷ niệm' }).click();
  await expect(page.locator('.album .postcard')).toContainText('Trung Nguyên');
  await page.locator('.album-item').first().click();
  await expect(page.getByRole('dialog')).toContainText('che dù đưa em về');
});
