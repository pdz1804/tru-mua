import { Component, Suspense, useContext, useMemo, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

import { DesignerEnabled, designerUrl, type DesignerFile } from './designer-catalog';
import { failDesigner, useDesignerStatus } from './designer-load';

/** Shows `fallback` if its children throw (a model that fails to load), instead of taking the whole scene down. */
class KeepFallback extends Component<{ url: string; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    failDesigner(this.props.url, err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * scene-door-set (metres): jambs x 0..0.1 and 1.0..1.1 from the floor to y 2.15, a head up to y 2.21, and the leaf
 * between them, x 0.1..1.0, y 0.045..2.105. A triangle belongs to the frame if any corner lies outside the leaf's box.
 */
const inFrame = (x: number, y: number) => x < 0.09 || x > 1.01 || y > 2.11 || y < 0.04;
function splitDoor(geo: THREE.BufferGeometry, wantFrame: boolean) {
  const idx = geo.index;
  const pos = geo.getAttribute('position');
  if (!idx) return geo;
  const keep: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const tri = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)];
    const frame = tri.some((v) => inFrame(pos.getX(v), pos.getY(v)));
    if (frame === wantFrame) keep.push(...tri);
  }
  const g = geo.clone();
  g.setIndex(keep);
  return g;
}
const DOOR_PARTS = { leaf: (g: THREE.BufferGeometry) => splitDoor(g, false), frame: (g: THREE.BufferGeometry) => splitDoor(g, true) };

interface DesignerProps {
  file: DesignerFile;
  position?: [number, number, number];
  rotation?: number;
  /** Leans the whole piece about X (an awning sloping down to the street), radians. */
  tilt?: number;
  /** The models are true size and keepsakes are small, so the room scales them up; one number or per axis. */
  scale?: number | [number, number, number];
  /** The door set is one mesh (frame and leaf together): `leaf` keeps only the swinging leaf, `frame` only the fixed frame. */
  part?: 'leaf' | 'frame';
  /**
   * For the sister app's room furniture, which comes at an arbitrary size with a centred pivot: fit the model into the
   * box (metres, x/y/z) of the piece it replaces and stand it on the floor at the placement point. By default it is
   * stretched to the box (tables and cabinets keep the surface height keepsakes rest on); `keepShape` scales it
   * uniformly to fit inside the box (`'height'`: to the box's height only, for models whose proportions differ from
   * the piece they replace). `turn` spins the model about Y first (to put its long side along x). A flat box
   * (a rug) gets the model's thinnest side turned up.
   */
  fit?: { size: [number, number, number]; keepShape?: boolean | 'height'; turn?: number };
  /** Turns the model's named node about its own +Y axis (a ceiling fan's blades), in radians per second. */
  spin?: { node: string; speed: number };
  shadows?: boolean;
  collide?: boolean;
  /** The code-built prop shown until the model arrives, and kept if it never does. */
  fallback?: ReactNode;
  /** Drawn in the same spot as the model, only once the model is there (labels on a picture or a board). */
  children?: ReactNode;
}

/** Placed by the model's own pivot (bottom-centre, back-centre for wall pieces, the hanging point for lanterns, the hinge edge for the door). */
function Model({ file, position = [0, 0, 0], rotation = 0, tilt = 0, scale = 1, part, fit, spin, shadows = true, collide = false, children }: DesignerProps) {
  const { scene } = useGLTF(designerUrl(file));
  const obj = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // the cached scene shares its materials and geometry: clone before changing anything.
      // The lanterns and the sconce carry their own emissive glow material, so nothing is forced here.
      m.material = Array.isArray(m.material) ? m.material.map((mat) => mat.clone()) : m.material.clone();
      if (part) m.geometry = DOOR_PARTS[part](m.geometry);
      m.castShadow = shadows;
      m.receiveShadow = shadows;
    });
    const g = new THREE.Group();
    if (fit) {
      const want = new THREE.Vector3(...fit.size);
      const holder = new THREE.Group();
      holder.add(root);
      root.rotation.y = fit.turn ?? 0;
      const measure = () => {
        holder.updateMatrixWorld(true);
        return new THREE.Box3().setFromObject(holder);
      };
      let box = measure();
      let have = box.getSize(new THREE.Vector3());
      if (want.y < 0.15 * Math.min(want.x, want.z) && have.y > Math.min(have.x, have.z)) {
        if (have.x < have.z) root.rotation.z = Math.PI / 2;
        else root.rotation.x = Math.PI / 2;
        box = measure();
        have = box.getSize(new THREE.Vector3());
      }
      const k = new THREE.Vector3(want.x / have.x, want.y / have.y, want.z / have.z);
      if (fit.keepShape === 'height') k.setScalar(k.y);
      else if (fit.keepShape) k.setScalar(Math.min(k.x, k.y, k.z));
      // stand on the floor, centred on the placement point (in the unscaled model's units)
      const c = box.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -box.min.y, -c.z);
      g.scale.copy(k);
      g.add(holder);
      return g;
    }
    if (typeof scale === 'number') g.scale.setScalar(scale);
    else g.scale.set(...scale);
    g.add(root);
    return g;
    // `scale` and `fit` are literals at every call site, so compare them by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, typeof scale === 'number' ? scale : scale.join(), fit?.size.join(), fit?.keepShape, fit?.turn, part, shadows]);
  const spinner = useMemo(() => (spin ? obj.getObjectByName(spin.node) : undefined), [obj, spin?.node]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    if (spinner && spin) spinner.rotation.y += spin.speed * Math.min(dt, 0.1);
  });
  const node = <primitive object={obj} />;
  return collide ? (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={[tilt, rotation, 0]}>
      {node}
      {children}
    </RigidBody>
  ) : (
    <group position={position} rotation={[tilt, rotation, 0]}>
      {node}
      {children}
    </group>
  );
}

/** A designer model in the café. Until it has loaded (or if it fails, or the switch is off) the `fallback` prop stands in. */
export function Designer(props: DesignerProps) {
  const { fallback = null } = props;
  const enabled = useContext(DesignerEnabled);
  const url = designerUrl(props.file);
  const status = useDesignerStatus(url);
  if (!enabled || status !== 'ready') return <>{fallback}</>;
  return (
    <KeepFallback url={url} fallback={fallback}>
      <Suspense fallback={fallback}>
        <Model {...props} />
      </Suspense>
    </KeepFallback>
  );
}
