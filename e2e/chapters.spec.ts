import { test, expect, type Page } from '@playwright/test';

/*
 * Plays each rain chapter to its postcard. Software WebGL renders a few frames per second, so the
 * test speeds up game time and moves the couple between beats through the dev-only engine hook,
 * then uses the real keys/buttons for every action the design defines (F, R, the choice).
 */
type Dev = {
  __store: { getState: () => { playChapter: (id: string) => void } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __ch: any;
};
/** Software WebGL on CI renders ~1-2 fps and the sim steps at most 0.05 s of game time per frame, so waits scale up there. */
const SLOW = process.env.CI ? 4 : 1;
const shot = (page: Page, name: string, project: string) => page.screenshot({ path: `test-results/shots/${project}-ch-${name}.png` });

const opacityOf = (page: Page, selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).opacity);

const howto = (page: Page) => page.getByRole('dialog', { name: /Cách chơi/ });

/**
 * Starts a chapter the way a first-time player sees it: the how-to card opens over a frozen level
 * (a shot is kept for review), and "Chơi thôi" starts the game.
 */
async function enter(page: Page, id: string, project: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as Dev).__store);
  await page.evaluate((i) => (window as unknown as Dev).__store.getState().playChapter(i), id);
  await page.waitForFunction(() => !!(window as unknown as Dev).__ch?.running);
  await expect(howto(page)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Dev).__ch.paused)).toBe(true);
  // the date card waits behind the how-to card and shows once the game starts
  await expect.poll(() => opacityOf(page, '.chud .ccard'), { timeout: 5000 }).toBe('0');
  await page.waitForTimeout(800);
  await shot(page, `howto-${id.slice(-4)}`, project);
  await page.getByRole('button', { name: 'Chơi thôi' }).click();
  await expect(howto(page)).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as Dev).__ch.paused)).toBe(false);
  await page.evaluate(() => ((window as unknown as Dev).__ch.timeScale = 6));
  return errors;
}
/** Put both walkers at (x, z), Su half a step behind. */
const place = (page: Page, x: number, z: number, y = 0.14) =>
  page.evaluate(
    ([x, z, y]) => {
      const W = (window as unknown as Dev).__ch.W;
      [W.P, W.S].forEach((c: { x: number; z: number; y: number; vx: number; vz: number }, k: number) =>
        Object.assign(c, { x: x + (k ? -0.5 : 0.5), z, y, vx: 0, vz: 0 }),
      );
    },
    [x, z, y],
  );
const postcard = (page: Page) => expect(page.locator('.post')).toBeVisible({ timeout: 90_000 * SLOW });

test('menu: the title card lists the chapters and starts one with its how-to card', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const open = () => page.getByRole('button', { name: /^Chương mưa/ }).click();
  const menu = page.getByRole('dialog', { name: 'Chọn chương mưa' });
  await open();
  await expect(menu).toBeVisible();
  await expect(menu.locator('.lv')).toHaveCount(3);
  await shot(page, 'menu-title', info.project.name);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await open();
  await menu.locator('.lv', { hasText: '25 · 07' }).click();
  await expect(page.locator('.chapter-stage')).toBeVisible({ timeout: 60_000 });
  await expect(howto(page)).toContainText('Trung Nguyên', { timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('07·07: both snacks, then the bánh tráng stall', async ({ page }, info) => {
  const errors = await enter(page, 'rain-0707', info.project.name);
  await expect(page.locator('.chud .obj')).toContainText('Tới sạp bánh tráng', { timeout: 30_000 });
  // "?" reopens the card and pauses the game; Esc resumes without leaving the chapter
  await page.getByRole('button', { name: 'Cách chơi', exact: true }).click();
  await expect(howto(page)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Dev).__ch.paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(howto(page)).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as Dev).__ch.paused)).toBe(false);
  await expect(page.locator('.chapter-stage')).toBeVisible();
  // the objective marker points at the next snack
  await expect(page.locator('.mark.on')).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(2500);
  await shot(page, '0707-street', info.project.name);
  await place(page, 55.6, -8.6);
  await expect(page.locator('.chud .pill.y')).toContainText('1/2', { timeout: 30_000 });
  await place(page, 36.9, -3.6, 1.64); // on top of the crates: Su's double jump
  await expect(page.locator('.chud .pill.y')).toContainText('2/2', { timeout: 30_000 });
  await place(page, 77.5, -2.6);
  await postcard(page);
  await expect(page.locator('.post')).toContainText('Bánh tráng & gà rán');
  await shot(page, '0707-postcard', info.project.name);
  await page.getByRole('button', { name: /về phòng/ }).click();
  await expect(page.locator('.chapter-stage')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('25·07: two photos, the flowers, the confession, the rain, the hug', async ({ page }, info) => {
  const errors = await enter(page, 'rain-2507', info.project.name);
  const counter = page.locator('.chud .pill.y');
  // the second photo moves the HUD on to the flowers at once, so its counter shows 'Hoa' instead of '2/2'
  for (const [x, z, n] of [
    [16, -1.1, /Ảnh 1\/2/],
    [31, 1.6, /Hoa/],
  ] as const) {
    await place(page, x, z);
    await expect(async () => {
      await page.keyboard.press('KeyF');
      await expect(counter).toContainText(n, { timeout: 3000 });
    }).toPass({ timeout: 45_000 * SLOW });
  }
  await shot(page, '2507-photos', info.project.name);
  const yes = page.getByRole('button', { name: 'Đồng ý', exact: true });
  await expect(async () => {
    await page.keyboard.press('KeyF');
    await expect(yes).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 60_000 });
  // the choice box takes the talk line's place, so the line steps aside
  await expect.poll(() => opacityOf(page, '.chud .talk'), { timeout: 5000 * SLOW }).toBe('0');
  await shot(page, '2507-confession', info.project.name);
  await yes.click();
  await expect(page.locator('.chud .obj')).toContainText('đu trend', { timeout: 60_000 });
  await expect(async () => {
    await page.keyboard.press('KeyF');
    await expect(page.locator('.chud .obj')).toContainText('Trung Nguyên', { timeout: 3000 });
  }).toPass({ timeout: 45_000 });
  // a sneeze far from the café lands both under Trung Nguyên's awning, and only the soaked one was wet
  await place(page, 30, 1.6);
  await page.evaluate(() => {
    const W = (window as unknown as Dev).__ch.W;
    W.P.wet = 100;
    W.S.wet = 0;
  });
  await expect(async () => {
    const r = await page.evaluate(() => {
      const L = (window as unknown as Dev).__ch.level;
      const W = (window as unknown as Dev).__ch.W;
      return { x: W.P.x, z: W.P.z, wetP: W.P.wet, wetS: W.S.wet, sheltered: L.shelter(W.P) && L.shelter(W.S) };
    });
    expect(r.x).toBeGreaterThan(55);
    expect(r.sheltered).toBe(true);
    expect(r.wetS).toBeLessThanOrEqual(40);
  }).toPass({ timeout: 30_000 * SLOW });
  await place(page, 64, -2.4);
  await expect(async () => {
    await page.keyboard.press('KeyR');
    await expect(page.locator('.chud .talk')).toContainText('dang hai tay', { timeout: 3000 });
  }).toPass({ timeout: 45_000 });
  await postcard(page);
  await expect(page.locator('.post')).toContainText('Su dang tay ôm trước');
  await shot(page, '2507-postcard', info.project.name);
  expect(errors).toEqual([]);
});

test('13·09: the hug, the ride to Nowzone, twelve loaves and five more', async ({ page }, info) => {
  const errors = await enter(page, 'rain-1309', info.project.name);
  const lv = () => page.evaluate(() => (window as unknown as Dev).__ch.level.stage as string);
  await expect.poll(lv, { timeout: 90_000 }).toBe('ride');
  await page.waitForTimeout(2000);
  await shot(page, '1309-ride', info.project.name);
  await page.evaluate(() => ((window as unknown as Dev).__ch.level.s.x = 168));
  await expect.poll(lv, { timeout: 90_000 }).toBe('bread');
  // hand over to everyone at the right curb, except the first person: ride straight past them and
  // the round must still finish (Su throws the loaf after them)
  for (let i = 0; i < 40 && (await lv()) === 'bread'; i++) {
    await page.evaluate((miss) => {
      const L = (window as unknown as Dev).__ch.level;
      const next = L.people.find((p: { got: boolean }) => !p.got);
      if (next) Object.assign(L.s, miss ? { x: next.x + 4, z: 0 } : { x: next.x, z: 2.6 });
    }, i === 0);
    // under load a slice of 400 ms may not render a single frame, so wait for the missed loaf itself
    if (i === 0) await page.waitForFunction(() => (window as unknown as Dev).__ch.level.s.missed >= 1, null, { timeout: 60_000 });
    else await page.waitForTimeout(400);
  }
  await postcard(page);
  await expect(page.locator('.post')).toContainText('Mười hai ổ, thêm năm ổ');
  expect(await page.evaluate(() => (window as unknown as Dev).__ch.level.s.missed)).toBeGreaterThanOrEqual(1);
  await shot(page, '1309-postcard', info.project.name);
  expect(errors).toEqual([]);
});
