/** Frame-rate independent smoothing factor (camera-systems skill: never lerp by a constant). */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Rotate a stick vector (x right, z down-screen) into world space for a camera looking along `yaw`. */
export function cameraRelative(x: number, z: number, yaw: number) {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

/** Shortest signed angle from a to b, in radians. */
export function angleDelta(a: number, b: number) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}
