/**
 * The designer's hand-made models for the rain chapters (original work, see public/models/designer/CREDITS.md).
 *
 * Every prop is first built in code (kit.ts, the level files). `swapDesigner` loads the matching .glb in the
 * background and, once it arrives, replaces the code-built meshes inside the same group, so the pickup logic,
 * positions and animation never depend on the model. A failed load keeps the code-built prop.
 *
 * The parsed scenes are cached for the whole session (one fetch per file, shared by every chapter); each
 * placement gets its own clone with cloned materials, and the shared textures are listed in SHARED so a chapter
 * teardown never frees them under the next chapter.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OUTLINE, SHARED, toon } from './kit';
import type { Engine } from './runtime';

const base = import.meta.env.BASE_URL;
const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();

function load(name: string): Promise<THREE.Group> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(`${base}models/designer/${name}.glb`).then((g) => {
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        for (const mat of Array.isArray(m.material) ? m.material : [m.material])
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) SHARED.add(v);
      });
      return g.scene;
    });
    // a failed fetch must not be remembered, or a later chapter could never retry it
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

export interface SwapOptions {
  /** The models are true size and the chapters are stylised, so props are scaled up. */
  scale?: number | [number, number, number];
  /** Turn the model about Y (radians) so its front lines up with the code-built prop it replaces. */
  rotY?: number;
  /** Shift the placed model (after centring), in the target's units. */
  offset?: [number, number, number];
  /** Put the model's bounding-box centre on the group's origin (pickups float and spin about their middle). */
  center?: boolean;
  /** Re-skin with the chapters' toon material (keeps colour and texture) instead of the model's own PBR material. */
  toon?: boolean;
  /** Called with the placed model once it is in the group. */
  after?: (model: THREE.Object3D) => void;
}

/**
 * How the new models sit in place of the code-built vehicles and umbrella. The code-built ones face -x with their
 * pivot on the ground; the models face +Z, so they are turned a quarter and scaled to the same footprint.
 */
export const FIT: Record<'umbrella' | 'scooter' | 'truck', SwapOptions> = {
  /** code canopy: 2.1 wide, shaft bottom at y -0.97, top at y 0.41 */
  umbrella: { scale: [2.05, 1.4, 2.05], offset: [0, -0.97, 0], toon: true },
  /** code scooter: wheels at x +-0.62, about 1.9 long */
  scooter: { scale: 1.05, rotY: -Math.PI / 2, toon: true },
  /** code truck: cab front at x -4.1 to the box end at x 2.9 (7 long, 2.3 wide); the model is 4.785 long, so it is stretched along its length (scale is in the model's own axes: x width, y height, z length) */
  truck: { scale: [1.1, 1.3, 1.46], rotY: -Math.PI / 2, offset: [-0.6, 0, 0], toon: true },
};

/** Sprites and lights are part of the effect, not the code-built mesh, so they stay. */
const keeps = (o: THREE.Object3D) => (o as THREE.Sprite).isSprite || (o as THREE.Light).isLight || o.userData.keep === true;

/**
 * Replace the code-built meshes in `target` with the designer's model. Resolves false (and leaves `target`
 * untouched) when the model cannot load or the chapter has already been torn down.
 */
export async function swapDesigner(e: Engine, target: THREE.Object3D, name: string, opts: SwapOptions = {}): Promise<boolean> {
  const world = e.world;
  try {
    const src = await load(name);
    if (!e.isCurrent(world)) return false;
    const model = src.clone(true);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
        if (!opts.toon) return mat.clone();
        const s = mat as THREE.MeshStandardMaterial;
        return toon(s.color ?? 0xffffff, { map: s.map, side: s.side });
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
    });
    const s = opts.scale ?? 1;
    if (typeof s === 'number') model.scale.setScalar(s);
    else model.scale.set(...s);
    model.rotation.y = opts.rotY ?? 0;
    if (opts.center) {
      model.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
      model.position.sub(c);
    }
    if (opts.offset) model.position.add(new THREE.Vector3(...opts.offset));
    for (const c of [...target.children]) {
      if (keeps(c)) continue;
      target.remove(c);
      c.traverse((o) => {
        (o as THREE.Mesh).geometry?.dispose();
        const mat = (o as THREE.Mesh).material;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) if (m !== OUTLINE) m.dispose();
      });
    }
    target.add(model);
    opts.after?.(model);
    return true;
  } catch (err) {
    console.warn(`designer model ${name} failed to load, keeping the code-built prop`, err);
    return false;
  }
}
