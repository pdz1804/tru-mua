import { Component, Suspense, useContext, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

import { DesignerEnabled, designerUrl, type DesignerFile } from './designer-catalog';

/** Shows `fallback` if its children throw (a model that fails to load), instead of taking the whole scene down. */
class KeepFallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('designer model failed to load, keeping the code-built prop', err);
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
  /** The models are true size and keepsakes are small, so the room scales them up; one number or per axis. */
  scale?: number | [number, number, number];
  /** The door set is one mesh (frame and leaf together): `leaf` keeps only the swinging leaf, `frame` only the fixed frame. */
  part?: 'leaf' | 'frame';
  shadows?: boolean;
  collide?: boolean;
  /** The code-built prop shown until the model arrives, and kept if it never does. */
  fallback?: ReactNode;
  /** Drawn in the same spot as the model, only once the model is there (labels on a picture or a board). */
  children?: ReactNode;
}

/** Placed by the model's own pivot (bottom-centre, back-centre for wall pieces, the hanging point for lanterns, the hinge edge for the door). */
function Model({ file, position = [0, 0, 0], rotation = 0, scale = 1, part, shadows = true, collide = false, children }: DesignerProps) {
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
    if (typeof scale === 'number') g.scale.setScalar(scale);
    else g.scale.set(...scale);
    g.add(root);
    return g;
    // `scale` is a literal at every call site, so compare it by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, typeof scale === 'number' ? scale : scale.join(), part, shadows]);
  const node = <primitive object={obj} />;
  return collide ? (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={[0, rotation, 0]}>
      {node}
      {children}
    </RigidBody>
  ) : (
    <group position={position} rotation={[0, rotation, 0]}>
      {node}
      {children}
    </group>
  );
}

/** A designer model in the café. Until it has loaded (or if it fails, or the switch is off) the `fallback` prop stands in. */
export function Designer(props: DesignerProps) {
  const { fallback = null } = props;
  const enabled = useContext(DesignerEnabled);
  if (!enabled) return <>{fallback}</>;
  return (
    <KeepFallback fallback={fallback}>
      <Suspense fallback={fallback}>
        <Model {...props} />
      </Suspense>
    </KeepFallback>
  );
}
