/**
 * Input as actions, not keys. Keyboard, on-screen joystick and buttons all write
 * into one shared state that the game loop reads every frame.
 */
export type Action = 'interact' | 'swap' | 'jump' | 'hold';

interface Axis {
  x: number;
  z: number;
}

const KEYS: Record<string, { p: 'a' | 'b'; dir?: keyof typeof DIRS; act?: Action }> = {
  KeyW: { p: 'a', dir: 'up' },
  KeyS: { p: 'a', dir: 'down' },
  KeyA: { p: 'a', dir: 'left' },
  KeyD: { p: 'a', dir: 'right' },
  ArrowUp: { p: 'b', dir: 'up' },
  ArrowDown: { p: 'b', dir: 'down' },
  ArrowLeft: { p: 'b', dir: 'left' },
  ArrowRight: { p: 'b', dir: 'right' },
  KeyE: { p: 'a', act: 'interact' },
  Enter: { p: 'b', act: 'interact' },
  KeyQ: { p: 'a', act: 'swap' },
  Space: { p: 'a', act: 'jump' },
  KeyR: { p: 'a', act: 'hold' },
  Slash: { p: 'b', act: 'hold' },
};
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

const held = new Set<string>();
const pressed = new Set<Action>();
export const stick: Axis = { x: 0, z: 0 };
/** Camera look delta accumulated from mouse/touch drags, consumed by the camera each frame. */
export const look = { dx: 0, dy: 0, zoom: 0 };
let enabled = true;

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function attachKeyboard(target: Window = window) {
  const down = (e: KeyboardEvent) => {
    const k = KEYS[e.code];
    if (!k || !enabled || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.code === 'Enter' || e.code === 'Space') && (e.target as HTMLElement)?.tagName === 'BUTTON') return;
    e.preventDefault();
    if (k.act && !held.has(e.code)) pressed.add(k.act);
    held.add(e.code);
  };
  const up = (e: KeyboardEvent) => held.delete(e.code);
  const blur = () => {
    held.clear();
    stick.x = stick.z = 0;
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}

/** Movement for player 'a' (WASD), 'b' (arrows), or both when one person plays. */
export function axis(p: 'a' | 'b' | 'both'): Axis {
  let x = 0;
  let z = 0;
  for (const code of held) {
    const k = KEYS[code];
    if (!k?.dir || (p !== 'both' && k.p !== p)) continue;
    x += DIRS[k.dir][0];
    z += DIRS[k.dir][1];
  }
  const m = Math.hypot(x, z);
  return m > 1 ? { x: x / m, z: z / m } : { x, z };
}

export function press(a: Action) {
  if (enabled) pressed.add(a);
}

/** Returns true once per press, then clears it. */
export function consume(a: Action) {
  const had = pressed.has(a);
  pressed.delete(a);
  return had;
}

/** Drop presses queued before play started (e.g. keys tapped in the studio). */
export function resetPresses() {
  pressed.clear();
}

export function setInputEnabled(v: boolean) {
  enabled = v;
  if (!v) {
    held.clear();
    pressed.clear();
    stick.x = stick.z = 0;
  }
}
