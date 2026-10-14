/**
 * World objects the player can interact with (memories, the door) register here.
 * The player loop asks for the nearest one in range each frame; the HUD shows its prompt.
 */
export interface Interactable {
  id: string;
  /** World-space position on the floor plane. */
  x: number;
  z: number;
  radius: number;
  prompt: string;
  onUse: () => void;
}

const items = new Map<string, Interactable>();
const listeners = new Set<(i: Interactable | null) => void>();
let current: Interactable | null = null;

export function register(i: Interactable) {
  items.set(i.id, i);
  return () => {
    items.delete(i.id);
    if (current?.id === i.id) setCurrent(null);
  };
}

/** Nearest registered item whose radius contains the point, or null. Pure for testability. */
export function nearest(list: Iterable<Interactable>, x: number, z: number): Interactable | null {
  let best: Interactable | null = null;
  let bestD = Infinity;
  for (const i of list) {
    const d = Math.hypot(i.x - x, i.z - z);
    if (d <= i.radius && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

export function updateFocus(x: number, z: number) {
  const n = nearest(items.values(), x, z);
  if (n?.id !== current?.id) setCurrent(n);
  return n;
}

function setCurrent(i: Interactable | null) {
  current = i;
  listeners.forEach((l) => l(i));
}

export function focused() {
  return current;
}

export function onFocus(fn: (i: Interactable | null) => void) {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}
