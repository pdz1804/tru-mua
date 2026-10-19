import { test, expect, type Page } from '@playwright/test';

/** Headless WebGL renders at a few fps, so the test teleports between beats instead of walking far. */
const tp = (page: Page, x: number, z: number) =>
  page.evaluate(([a, b]) => (window as unknown as { __tm: { teleport: (x: number, z: number) => void } }).__tm.teleport(a, b), [x, z]);
const shot = (page: Page, name: string, project: string) => page.screenshot({ path: `test-results/shots/${project}-${name}.png` });

type TM = { __tm: { pos: () => { x: number; z: number }[]; cam: () => [number, number, number] } };
const camPos = (page: Page) => page.evaluate(() => (window as unknown as TM).__tm.cam());
/**
 * The camera eases toward its spot a few frames at a time on a software renderer, and a slow frame can leave it
 * standing still halfway: wait until it has stayed put for three readings in a row AND sits where the shot needs it.
 */
async function cameraSettled(page: Page, atSpot: (cam: [number, number, number]) => boolean) {
  let last = await camPos(page);
  let still = 0;
  await expect(async () => {
    await page.waitForTimeout(700);
    const now = await camPos(page);
    const moved = Math.hypot(now[0] - last[0], now[1] - last[1], now[2] - last[2]);
    last = now;
    still = moved < 0.02 && atSpot(now) ? still + 1 : 0;
    expect(still).toBeGreaterThanOrEqual(3);
  }).toPass({ timeout: 60_000 });
}
/** A screenshot of the 3D room: a frame caught between two software renders comes out blank, so retry until it has content. */
async function sceneShot(page: Page, name: string, project: string) {
  for (let i = 0; i < 8; i++) {
    const png = await page.screenshot({ path: `test-results/shots/${project}-${name}.png` });
    if (png.length > 200_000) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`${name}: the room never rendered`);
}

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

  // the title screen has its own way into the rain chapters; it opens and closes without side effects
  const chapterMenu = page.getByRole('dialog', { name: 'Chọn chương mưa' });
  await page.getByRole('button', { name: /^Chương mưa/ }).click();
  await expect(chapterMenu).toBeVisible();
  await expect(chapterMenu.locator('.lv')).toHaveCount(3);
  await shot(page, '1b-title-menu', P);
  await page.keyboard.press('Escape');
  await expect(chapterMenu).toBeHidden();

  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page.getByText('Hôm nay mặc gì nhỉ?')).toBeVisible();
  await page.getByRole('button', { name: /Màu đầm #7fb3ea/ }).click();
  await page.waitForTimeout(1500);
  await shot(page, '2-studio', P);

  await page.getByRole('button', { name: /Tới trước cửa quán/ }).click();
  await page.waitForFunction(() => !!(window as unknown as { __tm?: unknown }).__tm);
  await page.waitForTimeout(3000);
  await sceneShot(page, '3-door', P);

  await tp(page, 0, 1.8);
  const door = page.getByRole('button', { name: /Mở cửa bước vào/ });
  await expect(door).toBeVisible({ timeout: 15000 });
  await door.click();
  await page.waitForTimeout(2500);
  await sceneShot(page, '4-door-open', P);

  // standing just inside the open door the camera backs out through it instead of hovering over their heads
  await tp(page, 0, -1.2);
  await cameraSettled(page, ([, , z]) => z > 3); // out on the street, looking in through the door
  const who = (await page.evaluate(() => (window as unknown as TM).__tm.pos()))[0];
  const [cx, cy, cz] = await camPos(page);
  expect(Math.hypot(cx - who.x, cy - 1.15, cz - who.z)).toBeGreaterThan(3);
  await sceneShot(page, '4a-doorway', P);

  // a few steps in, the camera looks down the trail: the sign beside it, the glowing dots and the three frames.
  // A portrait phone is too narrow for the sign, so it stands further back to keep the dots and frames in view.
  await (P === 'mobile' ? tp(page, 0.6, -5.2) : tp(page, 0.1, -4.2));
  await cameraSettled(page, ([, , z]) => z < -0.6); // inside, held just off the front wall
  await sceneShot(page, '4b-sign-and-trail', P);

  // well inside, the camera has room behind them: the whole room reads, not just two heads
  await tp(page, 0, -5.5);
  await cameraSettled(page, ([, , z]) => z < -0.6);
  await sceneShot(page, '5-inside', P);

  await tp(page, -2.3, -1.6);
  const prompt = page.locator('.prompt');
  await expect(prompt).toContainText('Cơn mưa', { timeout: 15000 });
  // slow CI GPUs: the press is consumed on the next rendered frame, so retry until the card opens
  await expect(async () => {
    if (!(await page.getByRole('dialog').isVisible())) await page.keyboard.press('KeyE');
    await expect(page.getByRole('dialog')).toContainText('che mưa đưa em về', { timeout: 4000 });
  }).toPass({ timeout: 45000 });
  await shot(page, '6-memory', P);
  await page.getByRole('button', { name: /Cất lại/ }).click();
  await expect(page.getByText(/Kỷ niệm\s*1\/27/)).toBeVisible();

  // the café HUD's "Chương mưa" button opens the same menu
  await page.getByRole('button', { name: 'Chương mưa', exact: true }).click();
  await expect(chapterMenu).toBeVisible();
  await expect(chapterMenu.locator('.lv')).toHaveCount(3);
  await shot(page, '6b-hud-menu', P);
  await page.keyboard.press('Escape');
  await expect(chapterMenu).toBeHidden();

  await tp(page, 4, -6);
  await page.waitForTimeout(2500);
  await sceneShot(page, '7-room', P);
  expect(errors.filter((e) => !/fonts\.g|net::ERR|favicon/.test(e))).toEqual([]);
});
