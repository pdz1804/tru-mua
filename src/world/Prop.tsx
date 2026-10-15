import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export const A = (p: string) => `${import.meta.env.BASE_URL}assets/${p}`;

/**
 * A CC0 model placed in the world at a real-world size.
 * - Packs disagree on scale (Kenney ≈ 0.5 m units, KayKit ≈ 2×), so we fit by target height or width.
 * - Kenney GLBs ship `KHR_materials_unlit`; those are swapped to lit standard materials so they take
 *   the night lighting and shadows like everything else.
 * - Materials are cloned per instance before tinting (the cached GLTF scene shares them).
 */
export function Prop({
  src,
  position = [0, 0, 0],
  rotation = 0,
  height,
  width,
  tint,
  collide = false,
  shadows = true,
}: {
  src: string;
  position?: [number, number, number];
  rotation?: number;
  height?: number;
  width?: number;
  tint?: string;
  collide?: boolean;
  shadows?: boolean;
}) {
  const { scene } = useGLTF(A(src));
  const obj = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
        const src = mat as THREE.MeshBasicMaterial & THREE.MeshStandardMaterial;
        const lit = src.isMeshBasicMaterial
          ? new THREE.MeshStandardMaterial({
              map: src.map,
              color: src.color,
              roughness: 0.75,
              metalness: 0,
              transparent: src.transparent,
              opacity: src.opacity,
            })
          : src.clone();
        if (tint) lit.color = new THREE.Color(tint).multiply(lit.color ?? new THREE.Color(1, 1, 1));
        if ('envMapIntensity' in lit) (lit as THREE.MeshStandardMaterial).envMapIntensity = 0.6;
        return lit;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
      m.castShadow = shadows;
      m.receiveShadow = true;
    });
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const k = height ? height / Math.max(size.y, 1e-4) : width ? width / Math.max(size.x, 1e-4) : 1;
    root.scale.setScalar(k);
    // sit on the floor, centred on the anchor
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    const g = new THREE.Group();
    g.add(root);
    return g;
  }, [scene, height, width, tint, shadows]);

  // The cloned materials belong to this instance only; free them when it unmounts.
  // Geometry and textures stay shared with the cached GLTF, so they are left alone.
  useEffect(
    () => () =>
      obj.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
      }),
    [obj],
  );

  const node = <primitive object={obj} />;
  return collide ? (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={[0, rotation, 0]}>
      {node}
    </RigidBody>
  ) : (
    <group position={position} rotation={[0, rotation, 0]}>
      {node}
    </group>
  );
}
