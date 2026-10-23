/** The minimal canvas surface the probe needs, so tests can stand in for a browser. */
interface ProbeCanvas {
  getContext(id: string): unknown;
}

/**
 * True when this browser can create a WebGL context. The game's 3D scenes cannot start without one, so the app asks
 * before it mounts a react-three-fiber Canvas (which throws while creating its renderer).
 */
export function hasWebGL(create: () => ProbeCanvas = () => document.createElement('canvas')): boolean {
  try {
    const canvas = create();
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
