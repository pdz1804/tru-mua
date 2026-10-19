/** Where the objective marker sits, in CSS pixels of the canvas. `rot` is radians, 0 = pointing right, clockwise on screen. */
export interface MarkerSpot {
  edge: boolean;
  x: number;
  y: number;
  rot: number;
}

/** Side margin, and the bands kept clear of the top bars and of the bottom controls (bigger on touch screens). */
const SIDE = 30;
const TOP = 84;
const BOTTOM = { coarse: 190, fine: 120 };
/** The vertical band never gets thinner than this, however short the viewport. */
const MIN_BAND = 60;

/**
 * Places the marker for a target already projected to canvas pixels (`behind`: the target is behind the camera and
 * `px`,`py` are already mirrored through the centre). On-screen it stays put; otherwise it is pushed to the inside
 * edge of the safe box along the line from the box centre. A short viewport keeps a minimum band, so the clamp can
 * never fold over and put the arrow on the wrong side.
 */
export function clampMarker(px: number, py: number, behind: boolean, w: number, h: number, coarse: boolean): MarkerSpot {
  const l = SIDE,
    r = w - SIDE,
    top = TOP,
    bot = Math.max(top + MIN_BAND, h - (coarse ? BOTTOM.coarse : BOTTOM.fine));
  if (!behind && px >= l && px <= r && py >= top && py <= bot) return { edge: false, x: px, y: py, rot: Math.PI / 2 };
  const cx = w / 2,
    cy = (top + bot) / 2;
  const dx = px - cx;
  let dy = py - cy;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) dy = 1;
  const k = Math.min(Math.max(cx - l, 0) / Math.max(Math.abs(dx), 1e-3), (cy - top) / Math.max(Math.abs(dy), 1e-3));
  return { edge: true, x: cx + dx * k, y: cy + dy * k, rot: Math.atan2(dy, dx) };
}
