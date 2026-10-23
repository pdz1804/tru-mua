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
import { OUTLINE, SHARED, glow, toon } from './kit';
import type { HouseInfo, Person } from './kit';
import type { Engine } from './runtime';

const base = import.meta.env.BASE_URL;
const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();
const failed = new Set<string>();

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
    // a failed file stays failed for the session: one attempt, one warning, and every placement keeps its code-built prop
    p.catch((err) => {
      failed.add(name);
      console.warn(`designer model ${name} failed to load, keeping the code-built prop`, err);
    });
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
  /**
   * Choose the material for one of the model's materials (matched by its glTF name, e.g. an emissive lens or a
   * tintable wall) before the toon skin is applied. Return undefined to take the default for that material.
   */
  material?: (mat: THREE.Material) => THREE.Material | undefined;
  /** Called with the placed model once it is in the group. */
  after?: (model: THREE.Object3D) => void;
}

/**
 * How the new models sit in place of the code-built vehicles and umbrella. The code-built ones face -x with their
 * pivot on the ground; the models face +Z, so they are turned a quarter and scaled to the same footprint.
 */
export const FIT: Record<'umbrella' | 'scooter' | 'truck' | 'exciter', SwapOptions> = {
  /** the Exciter is 1.89 long with its front on +Z; the code bike (rotated half a turn by the level) faces -x */
  exciter: { scale: 1.08, rotY: -Math.PI / 2, toon: true },
  /** code canopy: 2.1 wide, shaft bottom at y -0.97, top at y 0.41 */
  umbrella: { scale: [2.05, 1.4, 2.05], offset: [0, -0.97, 0], toon: true },
  /** code scooter: wheels at x +-0.62, about 1.9 long */
  scooter: { scale: 1.05, rotY: -Math.PI / 2, toon: true },
  /** code truck: cab front at x -4.1 to the box end at x 2.9 (7 long, 2.3 wide); the model is 4.785 long, so it is stretched along its length (scale is in the model's own axes: x width, y height, z length) */
  truck: { scale: [1.1, 1.3, 1.46], rotY: -Math.PI / 2, offset: [-0.6, 0, 0], toon: true },
};

/** The worn raincoats hang from the chibi's neck (body space, the head sits at y 1.5) and are scaled up from the 1.05 m model. */
export const RAINCOAT_FIT: WearOptions = { scale: 1.5, neck: [0, 1.2, 0] };

/** Sprites and lights are part of the effect, not the code-built mesh, so they stay. */
const keeps = (o: THREE.Object3D) => (o as THREE.Sprite).isSprite || (o as THREE.Light).isLight || o.userData.keep === true;

export interface WearOptions {
  /** Uniform scale of the garment, which is modelled for a 1.05 m chibi. */
  scale?: number;
  /** Where the garment's neck point sits in the parent's space. */
  neck?: [number, number, number];
  /** Translucent garments blend and never write depth, so the rider shows through. */
  translucent?: boolean;
  /** Re-hue the garment's coloured parts to this colour; near-white trims (snaps, piping) keep their own. */
  hue?: THREE.ColorRepresentation;
  /** Called with the placed garment once it is in the parent. */
  after?: (garment: THREE.Object3D) => void;
}

/**
 * Hang one named node of a designer file on `parent` (the file may hold several garments side by side for its
 * preview, so the node's own offset is dropped and its origin, the neck point, is placed at `opts.neck`).
 * Resolves false and leaves `parent` untouched when the file or node is missing or the chapter was torn down.
 */
export async function wearDesigner(e: Engine, parent: THREE.Object3D, name: string, node: string, opts: WearOptions = {}): Promise<boolean> {
  const world = e.world;
  try {
    const src = await load(name);
    if (!e.isCurrent(world)) return false;
    const found = src.getObjectByName(node);
    if (!found) throw new Error(`node ${node} not found in ${name}`);
    const garment = found.clone(true);
    garment.position.set(...(opts.neck ?? [0, 0, 0]));
    garment.scale.multiplyScalar(opts.scale ?? 1);
    garment.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = false;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
        const s = mat as THREE.MeshStandardMaterial;
        const color = new THREE.Color(s.color ?? 0xffffff);
        if (opts.hue !== undefined) {
          // baked colours live in the texture, so tint multiplies it; flat-coloured parts are re-hued instead
          if (s.map) color.set(opts.hue);
          else {
            const from = color.getHSL({ h: 0, s: 0, l: 0 });
            const to = new THREE.Color(opts.hue).getHSL({ h: 0, s: 0, l: 0 });
            if (from.s > 0.25) color.setHSL(to.h, Math.max(from.s, to.s), from.l);
          }
        }
        const t = toon(color, { map: s.map, side: THREE.DoubleSide });
        if (opts.translucent) {
          t.transparent = true;
          t.opacity = s.opacity < 1 ? s.opacity : 0.6;
          t.depthWrite = false;
        }
        return t;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
      if (opts.translucent) m.renderOrder = 2;
    });
    parent.add(garment);
    opts.after?.(garment);
    return true;
  } catch (err) {
    // a file that failed to load has already been reported once
    if (!failed.has(name)) console.warn(`designer garment ${name}/${node} failed, keeping the code-built one`, err);
    return false;
  }
}

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
        const own = opts.material?.(mat);
        if (own) return own;
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
    // a file that failed to load has already been reported once; this is a problem with placing the model
    if (!failed.has(name)) console.warn(`designer model ${name} could not be placed, keeping the code-built prop`, err);
    return false;
  }
}

/* ===================== street pieces ===================== */
/** A `material` hook that replaces only the model material with this glTF name. */
export const byName = (name: string, make: (mat: THREE.Material) => THREE.Material) => (mat: THREE.Material) => (mat.name === name ? make(mat) : undefined);

/** The tube house model: 4.2 wide, 9.3 tall (three floors), wall face 0.5 in front of its back edge, signboard at y 2.93 to 3.47. */
const HOUSE = { w: 4.2, h: 9.3, wallFront: 0.5, boardTop: 3.47, boardBottom: 2.93, boardFront: 0.675, boardW: 3.56 };

/**
 * Swap one code-built tube house for the designer's: stretched to the house's width, its height kept within a
 * floor of the code-built one, the wall tinted with the house's colour, the shop opening lit or dark as in code. The
 * neon sign texture (code) is moved onto the model's blank signboard.
 */
export function designerHouse(e: Engine, g: THREE.Group, h: HouseInfo) {
  const sx = (h.w - 0.08) / HOUSE.w;
  const sy = THREE.MathUtils.clamp(h.H / HOUSE.h, 0.8, 1.25);
  const wall = new THREE.Color(h.col).multiplyScalar(h.dim);
  void swapDesigner(e, g, 'trumua-tube-house', {
    scale: [sx, sy, 1],
    offset: [h.x + h.w / 2, 0, h.front - HOUSE.wallFront],
    toon: true,
    material: (mat) => {
      switch (mat.name) {
        case 'tube_house_wall':
          return toon(wall);
        case 'tube_house_shop_interior':
          return h.shop.material instanceof THREE.Material ? h.shop.material.clone() : undefined;
        default: {
          const s = mat as THREE.MeshStandardMaterial;
          return toon(new THREE.Color(s.color ?? 0xffffff).multiplyScalar(h.dim), { map: s.map });
        }
      }
    },
    after: () => {
      const boardH = (HOUSE.boardTop - HOUSE.boardBottom) * sy;
      const boardW = HOUSE.boardW * sx;
      const plane = h.sign.geometry as THREE.PlaneGeometry;
      // the sign keeps its aspect and sits centred on the board, just proud of it
      const k = Math.min((boardW * 0.92) / plane.parameters.width, (boardH * 0.9) / plane.parameters.height);
      h.sign.scale.set(k, k, 1);
      h.sign.position.set(h.x + h.w / 2, ((HOUSE.boardTop + HOUSE.boardBottom) / 2) * sy, h.front - HOUSE.wallFront + HOUSE.boardFront + 0.012);
    },
  });
}

/** The street lamp model: pole axis at the origin, arm toward +Z, lens underside at y 3.97, z 1.1; scaled up to the code lamp's 4.6 m pole. */
export function designerLamp(e: Engine, g: THREE.Group, x: number, z: number) {
  void swapDesigner(e, g, 'trumua-street-lamp', {
    scale: 1.07,
    offset: [x, 0, z],
    toon: true,
    material: byName('street_lamp_lens', () => glow(0xffd29a, 4)),
  });
}

/**
 * The bystander model replaces the code-built waiting person. Its raised arm is on the -X side, the code arm on +X, so
 * the model is mirrored; the `arm` node (pivot at the shoulder) takes over `userData.arm` and `userData.raise`.
 */
export function designerPerson(e: Engine, p: Person, coat: number) {
  void swapDesigner(e, p, 'trumua-bystander', {
    scale: [-1.1, 1.1, 1.1],
    toon: true,
    material: byName('bystander_coat', () => toon(coat)),
    after: (model) => {
      const arm = model.getObjectByName('arm');
      if (!arm) return;
      p.userData.arm = arm as THREE.Mesh;
      p.userData.raise = () => arm.rotation.set(0, 0, 0.5);
    },
  });
}
