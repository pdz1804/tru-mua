import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SuLook, PhuLook } from '../state/store';

/**
 * Stylised chibi characters built from smooth primitives with toon shading and an
 * inverted-hull outline. Built in code (not a GLB) so every colour and accessory is
 * customisable in the studio without texture atlases.
 */
const grad = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 165, 225, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1220, side: THREE.BackSide });
const SKIN = '#f6d3b5';

export interface ChibiPose {
  /** 0..1 walk blend, phase drives the cycle. */
  speed: number;
  phase: number;
  /** 0..1 arms-open hug. */
  hug: number;
  /** -1 left hand reaches to partner, 1 right hand, 0 none. */
  holdSide: number;
  airborne: boolean;
}
export interface ChibiHandle {
  pose: ChibiPose;
}

function Toon({ color, ...p }: { color: string } & JSX.IntrinsicElements['meshToonMaterial']) {
  return <meshToonMaterial color={color} gradientMap={grad} {...p} />;
}
function Outlined({ geo, color, k = 1.06, ...p }: { geo: THREE.BufferGeometry; color: string; k?: number } & JSX.IntrinsicElements['group']) {
  return (
    <group {...p}>
      <mesh geometry={geo} castShadow>
        <Toon color={color} />
      </mesh>
      <mesh geometry={geo} material={OUTLINE} scale={k} />
    </group>
  );
}

const G = {
  head: new THREE.SphereGeometry(0.34, 32, 24),
  cap: new THREE.SphereGeometry(0.365, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56),
  bang: new THREE.SphereGeometry(0.1, 12, 10),
  eye: new THREE.SphereGeometry(0.052, 14, 12),
  glint: new THREE.SphereGeometry(0.017, 8, 8),
  blush: new THREE.CircleGeometry(0.05, 16),
  limb: (() => {
    const g = new THREE.CapsuleGeometry(0.068, 0.3, 4, 12);
    g.translate(0, -0.24, 0);
    return g;
  })(),
  leg: (() => {
    const g = new THREE.CapsuleGeometry(0.078, 0.3, 4, 12);
    g.translate(0, -0.25, 0);
    return g;
  })(),
  hand: new THREE.SphereGeometry(0.07, 12, 10),
  shoe: new THREE.SphereGeometry(0.09, 14, 10),
  dress: new THREE.LatheGeometry(
    [
      [0, 0],
      [0.36, 0.02],
      [0.31, 0.2],
      [0.23, 0.42],
      [0.2, 0.56],
      [0.16, 0.66],
      [0, 0.68],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    28,
  ),
  shirt: new THREE.CapsuleGeometry(0.22, 0.3, 6, 18),
  hip: new THREE.CylinderGeometry(0.23, 0.22, 0.2, 18),
  backHair: new THREE.CapsuleGeometry(0.3, 0.42, 8, 20),
  napeHair: new THREE.SphereGeometry(0.33, 20, 14),
  bowLobe: new THREE.ConeGeometry(0.07, 0.13, 12),
  knot: new THREE.SphereGeometry(0.036, 10, 8),
  chain: new THREE.TorusGeometry(0.15, 0.008, 6, 32, Math.PI),
  firefly: new THREE.SphereGeometry(0.03, 10, 8),
  jacket: new THREE.CylinderGeometry(0.255, 0.285, 0.5, 20, 1, true),
};

export const Chibi = forwardRef<ChibiHandle, { kind: 'su' | 'phu'; su: SuLook; phu: PhuLook }>(function Chibi({ kind, su, phu }, ref) {
  const isSu = kind === 'su';
  const pose = useRef<ChibiPose>({ speed: 0, phase: 0, hug: 0, holdSide: 0, airborne: false });
  useImperativeHandle(ref, () => ({ pose: pose.current }), []);
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const body = useRef<THREE.Group>(null);
  const hair = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const sway = useRef({ v: 0, x: 0, blink: 2 });
  const top = isSu ? su.dress : phu.shirt;
  const hairColor = isSu ? su.hair : phu.hair;
  const bottom = isSu ? SKIN : phu.pants;
  const fireflyMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.2), toneMapped: false });
    return m;
  }, []);

  useFrame((_, dt) => {
    const p = pose.current;
    const sw = Math.sin(p.phase * 2.1) * 0.75 * p.speed;
    legs[0].current!.rotation.x = p.airborne ? 0.5 : sw;
    legs[1].current!.rotation.x = p.airborne ? -0.3 : -sw;
    let la = -sw * 0.8,
      ra = sw * 0.8,
      lz = -0.12,
      rz = 0.12;
    if (p.airborne) {
      la = ra = -0.6;
    }
    if (p.holdSide === -1) {
      la = -0.35;
      lz = -0.5;
    }
    if (p.holdSide === 1) {
      ra = -0.35;
      rz = 0.5;
    }
    if (p.hug > 0) {
      la = THREE.MathUtils.lerp(la, -1.45, p.hug);
      ra = THREE.MathUtils.lerp(ra, -1.45, p.hug);
      lz = THREE.MathUtils.lerp(lz, 0.65, p.hug);
      rz = THREE.MathUtils.lerp(rz, -0.65, p.hug);
    }
    const k = Math.min(1, dt * 12);
    const [a0, a1] = [arms[0].current!, arms[1].current!];
    a0.rotation.x += (la - a0.rotation.x) * k;
    a1.rotation.x += (ra - a1.rotation.x) * k;
    a0.rotation.z += (lz - a0.rotation.z) * k;
    a1.rotation.z += (rz - a1.rotation.z) * k;
    // breathing at idle, bounce while walking
    const t = performance.now() / 1000;
    body.current!.position.y = Math.abs(Math.sin(p.phase * 2.1)) * 0.05 * p.speed;
    body.current!.scale.y = 1 + Math.sin(t * 1.7) * 0.012 * (1 - p.speed);
    // hair follow-through spring
    const s = sway.current;
    if (hair.current) {
      const target = -p.speed * 0.35;
      s.v += (target - s.x) * 40 * dt;
      s.v *= Math.pow(0.02, dt);
      s.x += s.v * dt;
      hair.current.rotation.x = s.x;
    }
    s.blink -= dt;
    if (s.blink < 0) s.blink = 2 + Math.random() * 3;
    eyes.current!.scale.y = s.blink < 0.12 ? 0.15 : 1;
    fireflyMat.color.setRGB(2.6 + Math.sin(t * 3) * 0.8, 2.2 + Math.sin(t * 3) * 0.6, 1);
  });

  return (
    <group>
      <group ref={body}>
        {[-1, 1].map((sx, i) => (
          <group key={i} ref={legs[i]} position={[sx * 0.1, 0.6, 0]}>
            <Outlined geo={G.leg} color={bottom} k={1.09} />
            <Outlined geo={G.shoe} color={isSu ? '#ffffff' : '#2a2a30'} position={[0, -0.52, 0.04]} scale={[1, 0.65, 1.45]} />
          </group>
        ))}
        {isSu ? (
          <Outlined geo={G.dress} color={top} position={[0, 0.52, 0]} k={1.05} />
        ) : (
          <>
            <Outlined geo={G.hip} color={phu.pants} position={[0, 0.68, 0]} />
            <Outlined geo={G.shirt} color={top} position={[0, 0.94, 0]} scale={[1, 1, 0.84]} />
            {phu.jacket && <Outlined geo={G.jacket} color="#23242c" position={[0, 0.95, 0]} k={1.04} />}
          </>
        )}
        {isSu && su.necklace && (
          <group position={[0, 1.1, 0.12]} rotation={[0.3, 0, Math.PI]}>
            <mesh geometry={G.chain}>
              <meshBasicMaterial color="#d8c27a" />
            </mesh>
            <mesh geometry={G.firefly} material={fireflyMat} position={[0, -0.15, 0.02]} />
          </group>
        )}
        {[-1, 1].map((sx, i) => (
          <group key={i} ref={arms[i]} position={[sx * (isSu ? 0.21 : 0.27), 1.16, 0]} rotation={[0, 0, sx * 0.12]}>
            <Outlined geo={G.limb} color={isSu ? SKIN : top} k={1.09} />
            <mesh geometry={G.hand} position={[0, -0.47, 0]}>
              <Toon color={SKIN} />
            </mesh>
          </group>
        ))}
        <group position={[0, isSu ? 1.52 : 1.57, 0]}>
          <Outlined geo={G.head} color={SKIN} scale={[1, 0.96, 0.94]} k={1.04} />
          <group ref={eyes}>
            {[-1, 1].map((sx) => (
              <group key={sx} position={[sx * 0.115, -0.01, 0.3]} scale={[1, 1.3, 0.5]}>
                <mesh geometry={G.eye}>
                  <meshBasicMaterial color="#1b1220" />
                </mesh>
                <mesh geometry={G.glint} position={[0.018, 0.024, 0.03]}>
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          {[-1, 1].map((sx) => (
            <mesh key={sx} geometry={G.blush} position={[sx * 0.19, -0.1, 0.285]} rotation={[0, sx * 0.45, 0]}>
              <meshBasicMaterial color="#ff9bb5" transparent opacity={0.6} />
            </mesh>
          ))}
          <Outlined geo={G.cap} color={hairColor} position={[0, 0.03, -0.02]} rotation={[-0.25, 0, 0]} k={1.03} />
          {[-2, -1, 0, 1, 2].map((i) => (
            <mesh
              key={i}
              geometry={G.bang}
              position={[i * (isSu ? 0.1 : 0.11), 0.2 - Math.abs(i) * 0.02, 0.27]}
              rotation={[0, 0, i * 0.2]}
              scale={[1, 0.7, 0.55]}
            >
              <Toon color={hairColor} />
            </mesh>
          ))}
          {isSu ? (
            <group ref={hair} position={[0, 0.1, -0.08]}>
              <Outlined geo={G.backHair} color={hairColor} position={[0, -0.36, 0]} scale={[1.12, 1, 0.62]} k={1.03} />
            </group>
          ) : (
            <Outlined geo={G.napeHair} color={hairColor} position={[0, -0.05, -0.1]} scale={[1, 0.7, 0.8]} k={1.02} />
          )}
          {isSu && su.bow && (
            <group position={[0.24, 0.24, 0.14]} rotation={[0, 0, -0.4]}>
              {[-1, 1].map((sx) => (
                <Outlined key={sx} geo={G.bowLobe} color="#e0344f" position={[sx * 0.07, 0, 0]} rotation={[0, 0, (sx * Math.PI) / 2]} />
              ))}
              <mesh geometry={G.knot}>
                <Toon color="#e0344f" />
              </mesh>
            </group>
          )}
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
});
