import { describe, expect, it } from 'vitest';
import { clampMarker } from './marker-clamp';

describe('objective marker clamp', () => {
  it('leaves an on-screen target where it is', () => {
    const m = clampMarker(400, 300, false, 800, 600, false);
    expect(m).toEqual({ edge: false, x: 400, y: 300, rot: Math.PI / 2 });
  });

  it('pushes a target off the right side onto the right edge, pointing right', () => {
    const m = clampMarker(1600, 300, false, 800, 600, false);
    expect(m.edge).toBe(true);
    expect(m.x).toBeCloseTo(770);
    expect(m.rot).toBeCloseTo(0, 1);
  });

  it('pushes a target off the left side onto the left edge, pointing left', () => {
    const m = clampMarker(-900, 300, false, 800, 600, false);
    expect(m.x).toBeCloseTo(30);
    expect(Math.abs(m.rot)).toBeCloseTo(Math.PI, 1);
  });

  it('treats a target behind the camera as off-screen even when it projects inside', () => {
    const m = clampMarker(400, 100, true, 800, 600, false);
    expect(m.edge).toBe(true);
    expect(m.y).toBeLessThan(300);
  });

  it('survives a target exactly at the centre of the safe box', () => {
    const m = clampMarker(400, (84 + 480) / 2, true, 800, 600, false);
    expect(Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.rot)).toBe(true);
  });

  it('keeps the arrow on the side of the target on a very short viewport', () => {
    for (const h of [200, 260, 300]) {
      const above = clampMarker(400, -500, false, 800, h, true);
      const below = clampMarker(400, h + 500, false, 800, h, true);
      expect(above.y).toBeLessThan(below.y);
      expect(above.y).toBeGreaterThanOrEqual(84);
    }
  });

  it('never leaves the horizontal margins on a very narrow viewport', () => {
    const m = clampMarker(900, 300, false, 50, 600, false);
    expect(Number.isFinite(m.x)).toBe(true);
    expect(m.x).toBeCloseTo(25);
  });
});
