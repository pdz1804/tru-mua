import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Prop } from './Prop';
import { Designer } from './Designer';

/** Small hand-built props for things no CC0 pack has: bouquets, lanterns, a fish tank, a chalkboard, a camera. */

const glow = (r: number, g: number, b: number) => {
  const m = new THREE.MeshBasicMaterial({ toneMapped: false });
  m.color.setRGB(r, g, b);
  return m;
};

export function Bouquet({ colors, position = [0, 0, 0], scale = 1 }: { colors: string[]; position?: [number, number, number]; scale?: number }) {
  const stems = useMemo(
    () =>
      colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.07 + (i % 2) * 0.03;
        return { c, x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.3 + (i % 3) * 0.04, tilt: r * 2.2, a };
      }),
    [colors],
  );
  return (
    <group position={position} scale={scale}>
      {stems.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[Math.sin(s.a) * s.tilt, 0, -Math.cos(s.a) * s.tilt]}>
          <mesh position={[0, s.y / 2, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.01, s.y, 6]} />
            <meshStandardMaterial color="#3f7a4a" />
          </mesh>
          <mesh position={[0, s.y, 0]} castShadow scale={[1, 0.75, 1]}>
            <icosahedronGeometry args={[0.055, 1]} />
            <meshStandardMaterial color={s.c} roughness={0.6} />
          </mesh>
          <mesh position={[0.03, s.y - 0.05, 0]} rotation={[0, 0, 0.8]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#5a9a5e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Lanterns({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.04;
  });
  const mats = useMemo(() => [glow(3, 1.2, 0.5), glow(3, 2.2, 0.7)], []);
  return (
    <group ref={g} position={position}>
      {/*
        The designer's pair of lanterns (each shell has its own glow material). Measured at scale 1.7 with the model set
        0.3 m down: the shells sit at x = ±0.12, y = -0.09 and the handles reach up to y = 0.125 at x ≈ ±0.085, so the two
        cords hang from there. The code-built bulbs stand in until it loads; the cords, the lights and the sway are shared.
      */}
      <Designer
        file="keepsake-two-lanterns"
        scale={1.7}
        shadows={false}
        position={[0, -0.3, 0]}
        fallback={
          <>
            {[-0.14, 0.14].map((x, i) => (
              <group key={x} position={[x, -0.09, 0]}>
                <mesh material={mats[i]} scale={[1, 1.15, 1]}>
                  <sphereGeometry args={[0.13, 16, 12]} />
                </mesh>
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.06, 0.075, 0.05, 12]} />
                  <meshStandardMaterial color="#b8892f" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.2, 0]}>
                  <coneGeometry args={[0.03, 0.14, 8]} />
                  <meshStandardMaterial color="#d8342c" />
                </mesh>
              </group>
            ))}
          </>
        }
      />
      {[-0.12, 0.12].map((x, i) => (
        <group key={x}>
          <mesh position={[x * 0.7, 0.625, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 1, 4]} />
            <meshBasicMaterial color="#222" />
          </mesh>
          <pointLight position={[x, -0.09, 0]} color={i ? '#ffc070' : '#ff8a50'} intensity={1.6} distance={3} decay={2} />
        </group>
      ))}
    </group>
  );
}

const GUPPY_COLORS = ['#ff6a3d', '#3db7ff', '#ffd23d', '#ff5fa2', '#7dffb0', '#c39bff'];

/**
 * Animated guppies for the designer's tank, whose water is an opaque mesh: the fish swim in a shallow glassy slab just
 * above the water's top face (`position` is the centre of that face), so they stay visible from above and from the front.
 */
export function GuppySchool({ position, halfX, halfZ, size = 0.7 }: { position: [number, number, number]; halfX: number; halfZ: number; size?: number }) {
  const fish = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fish.current.forEach((f, i) => {
      if (!f) return;
      const k = t * (0.5 + i * 0.13) + i * 2;
      f.position.set(Math.sin(k) * halfX, 0.025 + Math.sin(k * 1.7) * 0.008 + i * 0.002, Math.cos(k * 0.7) * halfZ);
      f.rotation.y = Math.cos(k) > 0 ? 0 : Math.PI;
    });
  });
  return (
    <group position={position}>
      {GUPPY_COLORS.map((c, i) => (
        <group
          key={c}
          ref={(g) => {
            if (g) fish.current[i] = g;
          }}
          scale={size}
        >
          <mesh scale={[1.6, 0.8, 0.5]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.05, 0.08, 6]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfX * 2.5, halfZ * 2.6]} />
        <meshBasicMaterial color="#8fd0ff" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function FishTank({ position }: { position: [number, number, number] }) {
  const fish = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fish.current.forEach((f, i) => {
      if (!f) return;
      const k = t * (0.5 + i * 0.13) + i * 2;
      f.position.set(Math.sin(k) * 0.32, 0.18 + Math.sin(k * 1.7) * 0.06 + i * 0.03, Math.cos(k * 0.7) * 0.1);
      f.rotation.y = Math.cos(k) > 0 ? 0 : Math.PI;
    });
  });
  const colors = ['#ff6a3d', '#3db7ff', '#ffd23d', '#ff5fa2', '#7dffb0', '#c39bff'];
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.9, 0.5, 0.36]} />
        <meshPhysicalMaterial color="#bfe6ff" transparent opacity={0.22} roughness={0.05} metalness={0} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.86, 0.4, 0.32]} />
        <meshBasicMaterial color="#2e7fbf" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.86, 0.04, 0.32]} />
        <meshStandardMaterial color="#e8d7a8" />
      </mesh>
      {[-0.28, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.15, -0.08]}>
          <coneGeometry args={[0.04, 0.24, 6]} />
          <meshStandardMaterial color="#3f9a5a" />
        </mesh>
      ))}
      {colors.map((c, i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) fish.current[i] = g;
          }}
          scale={0.5}
        >
          <mesh scale={[1.6, 0.8, 0.5]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.05, 0.08, 6]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.45, 0.2]} color="#8fd0ff" intensity={1.2} distance={2.2} />
    </group>
  );
}

export function Chalkboard({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 1.1, 0.06]} />
        <meshStandardMaterial color="#7a5232" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[1.66, 0.96]} />
        <meshStandardMaterial color="#24382e" roughness={0.95} />
      </mesh>
      <Text position={[0, 0.2, 0.04]} fontSize={0.15} color="#f4f1e6" anchorX="center" maxWidth={1.5} textAlign="center">
        Cô Su ♡
      </Text>
      <Text position={[0, -0.12, 0.04]} fontSize={0.075} color="#f4f1e6" anchorX="center" maxWidth={1.5} textAlign="center">
        {'Sư phạm Tiểu học · HCMUE\nhọc trò ngoan, cô thương'}
      </Text>
    </group>
  );
}

export function Camera35({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[0.22, 0.13, 0.08]} />
        <meshStandardMaterial color="#1d1d22" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.22, 0.03, 0.08]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.07, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.08, 20]} />
        <meshStandardMaterial color="#2a2a30" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.07, 0.112]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 20]} />
        <meshPhysicalMaterial color="#334" roughness={0} clearcoat={1} />
      </mesh>
    </group>
  );
}

export function Necklace({ position }: { position: [number, number, number] }) {
  const m = useMemo(() => glow(2.6, 2.4, 0.8), []);
  useFrame(({ clock }) => {
    const k = 2 + Math.sin(clock.elapsedTime * 2.4) * 0.9;
    m.color.setRGB(k, k * 0.92, 0.6);
  });
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.1, 0.004, 6, 40]} />
        <meshStandardMaterial color="#d8c27a" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh material={m} position={[0, -0.09, 0.03]}>
        <sphereGeometry args={[0.022, 12, 10]} />
      </mesh>
      <pointLight position={[0, 0, 0.1]} color="#fff2a0" intensity={0.6} distance={1.2} />
    </group>
  );
}

/** A framed photo whose picture is drawn from text (we never ship private photos in the repo). */
export function Frame({
  position,
  rotation = 0,
  height = 0.5,
  label,
  sub,
  src = 'furniture-kaykit/pictureframe_standing_A.gltf',
}: {
  position: [number, number, number];
  rotation?: number;
  height?: number;
  label: string;
  sub?: string;
  src?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Prop src={src} height={height} />
      <Text position={[0, height * 0.55, height * 0.08]} fontSize={height * 0.13} color="#3a2a05" anchorX="center" maxWidth={height * 0.7} textAlign="center">
        {label}
      </Text>
      {sub && (
        <Text
          position={[0, height * 0.38, height * 0.08]}
          fontSize={height * 0.075}
          color="#6b5532"
          anchorX="center"
          maxWidth={height * 0.7}
          textAlign="center"
        >
          {sub}
        </Text>
      )}
    </group>
  );
}
