import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Instanced rain streaks that follow the camera, plus pooled ripple rings on the ground.
 * `indoorBox` lets rain stop at the café walls so it never falls inside the room.
 */
export function Rain({ count = 1800, indoorBox }: { count?: number; indoorBox?: THREE.Box3 }) {
  const lines = useRef<THREE.LineSegments>(null);
  const { geo, vel } = useMemo(() => {
    const pos = new Float32Array(count * 6);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 36,
        y = Math.random() * 14,
        z = (Math.random() - 0.5) * 36;
      pos.set([x, y, z, x + 0.04, y + 0.55, z], i * 6);
      vel[i] = 16 + Math.random() * 8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo: g, vel };
  }, [count]);
  const ripples = useMemo(() => Array.from({ length: 48 }, () => ({ t: 1, x: 0, z: 0 })), []);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, raw) => {
    const dt = Math.min(raw, 0.05);
    const p = geo.attributes.position.array as Float32Array;
    const cx = camera.position.x,
      cz = camera.position.z;
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      let x = p[o],
        y = p[o + 1] - vel[i] * dt,
        z = p[o + 2];
      tmp.set(x, Math.max(y, 0), z);
      const inside = indoorBox?.containsPoint(tmp);
      if (y < 0 || inside) {
        if (!inside && Math.random() < 0.12) {
          const r = ripples.find((q) => q.t >= 1);
          if (r) {
            r.t = 0;
            r.x = x;
            r.z = z;
          }
        }
        y = 10 + Math.random() * 4;
        x = cx + (Math.random() - 0.5) * 36;
        z = cz + (Math.random() - 0.5) * 36;
      }
      if (x < cx - 18) x += 36;
      else if (x > cx + 18) x -= 36;
      if (z < cz - 18) z += 36;
      else if (z > cz + 18) z -= 36;
      p[o] = x;
      p[o + 1] = y;
      p[o + 2] = z;
      p[o + 3] = x + 0.04;
      p[o + 4] = y + 0.55;
      p[o + 5] = z;
    }
    geo.attributes.position.needsUpdate = true;
    ripples.forEach((r, i) => {
      const m = ringRefs.current[i];
      if (!m) return;
      if (r.t < 1) {
        r.t += dt * 1.8;
        m.visible = true;
        m.position.set(r.x, 0.02, r.z);
        m.scale.setScalar(1 + r.t * 3.5);
        (m.material as THREE.MeshBasicMaterial).opacity = (1 - r.t) * 0.35;
      } else m.visible = false;
    });
  });

  return (
    <>
      <lineSegments ref={lines} geometry={geo} frustumCulled={false}>
        <lineBasicMaterial color="#b9d0ee" transparent opacity={0.32} depthWrite={false} />
      </lineSegments>
      {ripples.map((_, i) => (
        <mesh key={i} ref={(m) => (ringRefs.current[i] = m)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.03, 0.05, 24]} />
          <meshBasicMaterial color="#9fb7d6" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
  );
}
