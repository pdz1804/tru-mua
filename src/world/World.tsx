import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshReflectorMaterial, Sparkles, Text, useTexture } from '@react-three/drei';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Couple } from '../game/Couple';
import { register } from '../game/interactions';
import { useGame } from '../state/store';
import { memoryById } from '../content/memories';
import { CHAPTERS } from '../content/chapters';
import { toastBus } from '../lib/toast';
import { A, Prop } from './Prop';
import { Rain } from './Rain';
import { Bouquet, Camera35, Chalkboard, FishTank, Frame, Lanterns, Necklace } from './Details';

/*
 * Layout (metres). The café front wall faces +z at z = 0, door centred at x = 0.
 * Street/sidewalk: z ∈ [0, 13]. Room: x ∈ [-7, 7], z ∈ [-12, 0], ceiling 4.2.
 * The couple spawns on the sidewalk facing the door.
 */
const ROOM = { x: 7, z: -12, h: 4.2, wall: 0.3 };
const DOOR = { w: 1.5, h: 2.4 };
const WIN = {
  y0: 0.9,
  y1: 2.6,
  xs: [
    [-5.6, -1.8],
    [1.8, 5.6],
  ] as const,
};
const SPAWN: [number, number, number] = [0, 0.12, 5.2];
const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

function usePBR(name: string, rx: number, ry: number, tint?: string) {
  const t = useTexture({
    map: A(`textures/${name}/${name}_diff_1k.jpg`),
    normalMap: A(`textures/${name}/${name}_nor_gl_1k.jpg`),
    arm: A(`textures/${name}/${name}_arm_1k.jpg`),
  });
  return useMemo(() => {
    const maps = [t.map, t.normalMap, t.arm].map((x) => {
      const c = x.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(rx, ry);
      c.needsUpdate = true;
      return c;
    });
    maps[0].colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      map: maps[0],
      normalMap: maps[1],
      aoMap: maps[2],
      roughnessMap: maps[2],
      metalnessMap: maps[2],
      color: tint ?? '#ffffff',
      envMapIntensity: 0.5,
    });
  }, [t, rx, ry, tint]);
}

/** A solid box that is both visible and a physics wall. */
function Wall({ from, to, mat }: { from: [number, number, number]; to: [number, number, number]; mat: THREE.Material }) {
  const size: [number, number, number] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const pos: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return (
    <RigidBody type="fixed" colliders={false} position={pos} userData={{ wall: true }}>
      <CuboidCollider args={[Math.abs(size[0]) / 2, Math.abs(size[1]) / 2, Math.abs(size[2]) / 2]} />
      <mesh material={mat} castShadow receiveShadow>
        <boxGeometry args={size.map(Math.abs) as [number, number, number]} />
      </mesh>
    </RigidBody>
  );
}

function neonTexture(text: string, color: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const g = c.getContext('2d')!;
  g.font = '700 120px "Pangolin", "Be Vietnam Pro", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 30;
  g.fillStyle = color;
  g.fillText(text, 512, 116);
  g.shadowBlur = 0;
  g.globalAlpha = 0.8;
  g.fillStyle = '#fff';
  g.fillText(text, 512, 116);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Facade() {
  const plaster = usePBR('grey_plaster_02', 3, 1.5, '#e9d8bd');
  const neighbour = usePBR('grey_plaster_02', 2, 2, '#9fb3c9');
  const neighbour2 = usePBR('grey_plaster_02', 2, 2, '#d7a9a0');
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.55 }), []);
  const sign = useMemo(() => neonTexture('Trú Mưa', '#ffcf5a'), []);
  const z0 = -ROOM.wall;
  const [L, R] = WIN.xs;
  return (
    <group>
      {/* front wall pieces around the two windows and the door */}
      <Wall from={[-ROOM.x, 0, z0]} to={[-DOOR.w / 2, WIN.y0, 0]} mat={plaster} />
      <Wall from={[DOOR.w / 2, 0, z0]} to={[ROOM.x, WIN.y0, 0]} mat={plaster} />
      <Wall from={[-ROOM.x, WIN.y0, z0]} to={[L[0], WIN.y1, 0]} mat={plaster} />
      <Wall from={[L[1], WIN.y0, z0]} to={[-DOOR.w / 2, WIN.y1, 0]} mat={plaster} />
      <Wall from={[DOOR.w / 2, WIN.y0, z0]} to={[R[0], WIN.y1, 0]} mat={plaster} />
      <Wall from={[R[1], WIN.y0, z0]} to={[ROOM.x, WIN.y1, 0]} mat={plaster} />
      <Wall from={[-ROOM.x, WIN.y1, z0]} to={[-DOOR.w / 2, 6.4, 0]} mat={plaster} />
      <Wall from={[DOOR.w / 2, WIN.y1, z0]} to={[ROOM.x, 6.4, 0]} mat={plaster} />
      <Wall from={[-DOOR.w / 2, DOOR.h, z0]} to={[DOOR.w / 2, 6.4, 0]} mat={plaster} />
      {/* glass + frames */}
      {WIN.xs.map(([a, b]) => (
        <group key={a}>
          <mesh position={[(a + b) / 2, (WIN.y0 + WIN.y1) / 2, -0.15]}>
            <planeGeometry args={[b - a, WIN.y1 - WIN.y0]} />
            <meshPhysicalMaterial color="#cfe3f5" transparent opacity={0.16} roughness={0.04} metalness={0.1} clearcoat={1} side={THREE.DoubleSide} />
          </mesh>
          {[a, (a + b) / 2, b].map((x) => (
            <mesh key={x} material={frame} position={[x, (WIN.y0 + WIN.y1) / 2, -0.13]}>
              <boxGeometry args={[0.07, WIN.y1 - WIN.y0, 0.1]} />
            </mesh>
          ))}
          {[WIN.y0, WIN.y1].map((y) => (
            <mesh key={y} material={frame} position={[(a + b) / 2, y, -0.1]}>
              <boxGeometry args={[b - a + 0.1, 0.08, 0.26]} />
            </mesh>
          ))}
          <CuboidCollider args={[(b - a) / 2, (WIN.y1 - WIN.y0) / 2, 0.1]} position={[(a + b) / 2, (WIN.y0 + WIN.y1) / 2, -0.15]} />
        </group>
      ))}
      {/* awning + neon sign */}
      <group position={[0, 2.85, 0.55]} rotation={[0.28, 0, 0]}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-6.5 + i + 0.5, 0, 0]} castShadow>
            <boxGeometry args={[1, 0.04, 1.3]} />
            <meshStandardMaterial color={i % 2 ? '#f6e7c4' : '#2f6f62'} roughness={0.8} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 3.75, 0.03]}>
        <planeGeometry args={[4.2, 0.9]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} color={new THREE.Color(1.6, 1.5, 1.3)} />
      </mesh>
      <Text position={[0, 3.2, 0.03]} fontSize={0.2} color="#f6e7c4" anchorX="center">
        cà phê · kỷ niệm · nơi trú mưa của hai đứa
      </Text>
      <pointLight position={[0, 3.5, 1.2]} color="#ffcf5a" intensity={5} distance={7} />
      {/* neighbouring shophouses so the street feels lived-in */}
      {[
        [-ROOM.x - 5.2, 5.2, neighbour],
        [ROOM.x + 5.2, 5.2, neighbour2],
      ].map(([x, w, m], i) => (
        <group key={i}>
          <Wall from={[(x as number) - (w as number) / 2, 0, -6]} to={[(x as number) + (w as number) / 2, 8 + i, 0]} mat={m as THREE.Material} />
          {[1.4, 4.2, 7].map((y, k) => (
            <mesh key={k} position={[x as number, y, 0.02]}>
              <planeGeometry args={[(w as number) * 0.7, k ? 1.4 : 2]} />
              <meshBasicMaterial toneMapped={false} color={k === 0 ? new THREE.Color(1.3, 1.0, 0.7) : new THREE.Color(0.9, 0.8, 0.55)} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Street() {
  const asphalt = usePBR('asphalt_02', 8, 4);
  const tiles = usePBR('brown_floor_tiles', 12, 2, '#b8b2a8');
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 1.8]} receiveShadow material={tiles}>
        <planeGeometry args={[30, 3.6]} />
      </mesh>
      <mesh position={[0, 0.06, 3.65]}>
        <boxGeometry args={[30, 0.14, 0.18]} />
        <meshStandardMaterial color="#8a8f99" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 9]} receiveShadow>
        <planeGeometry args={[30, 11]} />
        {touch ? (
          <meshStandardMaterial map={asphalt.map} normalMap={asphalt.normalMap} roughness={0.25} metalness={0.2} color="#59606c" />
        ) : (
          <MeshReflectorMaterial
            map={asphalt.map ?? undefined}
            normalMap={asphalt.normalMap ?? undefined}
            blur={[300, 80]}
            resolution={512}
            mixBlur={1}
            mixStrength={2.2}
            roughness={0.55}
            depthScale={0.8}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#4c5360"
            metalness={0.4}
            mirror={0.6}
          />
        )}
      </mesh>
      {[-4, 4].map((x) => (
        <group key={x}>
          <Prop src="street-kenney/detail-light-single.glb" height={4.3} position={[x, 0.12, 3.3]} rotation={Math.PI} />
          <pointLight position={[x, 4, 2.6]} color="#ffb46b" intensity={14} distance={11} decay={2} />
          <Sparkles position={[x, 4, 2.6]} count={8} scale={0.6} size={3} color="#ffd29a" speed={0.2} />
        </group>
      ))}
      <Prop src="street-kenney/detail-bench.glb" height={0.9} position={[-5.6, 0.12, 2.6]} rotation={Math.PI} collide />
      <Prop src="furniture-kenney/pottedPlant.glb" height={1.3} position={[-1.6, 0.12, 0.7]} collide />
      <Prop src="furniture-kenney/pottedPlant.glb" height={1.3} position={[1.6, 0.12, 0.7]} collide />
      <Prop src="furniture-kenney/rugDoormat.glb" width={1.4} position={[0, 0.13, 0.9]} />
      {/* invisible street bounds: no fences, the couple just slows to a stop at the edges */}
      <CuboidCollider args={[15, 3, 0.2]} position={[0, 1.5, 13.5]} />
      <CuboidCollider args={[0.2, 3, 7]} position={[-ROOM.x - 2.4, 1.5, 7]} />
      <CuboidCollider args={[0.2, 3, 7]} position={[ROOM.x + 2.4, 1.5, 7]} />
    </group>
  );
}

function Door() {
  const open = useGame((s) => s.doorOpen);
  const setOpen = useGame((s) => s.setDoorOpen);
  const pivot = useRef<THREE.Group>(null);
  useEffect(
    () =>
      register({
        id: 'door',
        x: 0,
        z: 0.9,
        radius: 1.7,
        prompt: useGame.getState().doorOpen ? 'Khép cửa lại' : 'Mở cửa bước vào',
        onUse: () => {
          const next = !useGame.getState().doorOpen;
          setOpen(next);
          if (next) toastBus.emit('Cửa mở. Mùi cà phê, tiếng mưa ở lại phía sau. Mình vào thôi.');
        },
      }),
    [open, setOpen],
  );
  useFrame((_, dt) => {
    if (!pivot.current) return;
    const target = open ? -1.75 : 0;
    pivot.current.rotation.y += (target - pivot.current.rotation.y) * Math.min(1, dt * 3.5);
  });
  return (
    <>
      <group ref={pivot} position={[-DOOR.w / 2, 0, -0.12]}>
        <group position={[DOOR.w / 2, DOOR.h / 2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[DOOR.w - 0.04, DOOR.h - 0.04, 0.07]} />
            <meshStandardMaterial color="#5b3a26" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.35, 0.04]}>
            <planeGeometry args={[DOOR.w * 0.6, DOOR.h * 0.45]} />
            <meshBasicMaterial toneMapped={false} color={new THREE.Color(1.4, 1.05, 0.65)} />
          </mesh>
          <mesh position={[DOOR.w / 2 - 0.15, -0.05, 0.06]}>
            <sphereGeometry args={[0.04, 12, 10]} />
            <meshStandardMaterial color="#d8b85a" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>
      {!open && <CuboidCollider args={[DOOR.w / 2, DOOR.h / 2, 0.1]} position={[0, DOOR.h / 2, -0.12]} />}
    </>
  );
}

function Interior() {
  const floor = usePBR('dark_wooden_planks', 6, 5, '#d9b48c');
  const wall = usePBR('grey_plaster_02', 4, 1.4, '#f1e2c8');
  const beam = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.7 }), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, ROOM.z / 2]} receiveShadow material={floor}>
        <planeGeometry args={[ROOM.x * 2, -ROOM.z]} />
      </mesh>
      <Wall from={[-ROOM.x - ROOM.wall, 0, ROOM.z]} to={[-ROOM.x, ROOM.h, 0]} mat={wall} />
      <Wall from={[ROOM.x, 0, ROOM.z]} to={[ROOM.x + ROOM.wall, ROOM.h, 0]} mat={wall} />
      <Wall from={[-ROOM.x, 0, ROOM.z - ROOM.wall]} to={[ROOM.x, ROOM.h, ROOM.z]} mat={wall} />
      <mesh position={[0, ROOM.h + 0.05, ROOM.z / 2]}>
        <boxGeometry args={[ROOM.x * 2 + 0.6, 0.1, -ROOM.z]} />
        <meshStandardMaterial color="#2d211a" />
      </mesh>
      {[-9.5, -6, -2.5].map((z) => (
        <mesh key={z} material={beam} position={[0, ROOM.h - 0.12, z]}>
          <boxGeometry args={[ROOM.x * 2, 0.22, 0.24]} />
        </mesh>
      ))}
      {/* pendant lights */}
      {(
        [
          [-3.5, -4.5],
          [3.5, -4.5],
          [0, -8.5],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, ROOM.h - 1.1, z]}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 1.1, 4]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          <mesh>
            <coneGeometry args={[0.28, 0.24, 24, 1, true]} />
            <meshStandardMaterial color="#2f6f62" side={THREE.DoubleSide} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.08, 12, 10]} />
            <meshBasicMaterial toneMapped={false} color={new THREE.Color(3, 2.2, 1.3)} />
          </mesh>
          <pointLight
            position={[0, -0.2, 0]}
            color="#ffc98a"
            intensity={9}
            distance={9}
            decay={1.6}
            castShadow={i === 2}
            shadow-mapSize={[512, 512]}
            shadow-bias={-0.002}
          />
        </group>
      ))}
      <Prop src="furniture-kaykit/rug_rectangle_stripes_A.gltf" width={3.2} position={[-4.8, 0.03, -5.1]} rotation={Math.PI / 2} shadows={false} />
      <Prop src="furniture-kaykit/rug_oval_A.gltf" width={2.6} position={[0.6, 0.03, -6.6]} shadows={false} />
      <Prop src="furniture-kenney/coatRack.glb" height={1.8} position={[-2.3, 0.02, -0.7]} collide />
      <Prop src="furniture-kaykit/lamp_standing.gltf" height={1.8} position={[-6.4, 0.02, -2.9]} collide />
      <Prop src="furniture-kaykit/lamp_standing.gltf" height={1.8} position={[6.4, 0.02, -10.6]} collide />
      <Prop src="furniture-kenney/pottedPlant.glb" height={1.4} position={[-6.4, 0.02, -11.3]} collide />
      <Prop src="furniture-kenney/pottedPlant.glb" height={1.4} position={[6.4, 0.02, -1.2]} collide />
      <Prop src="furniture-kenney/ceilingFan.glb" width={1.4} position={[0, ROOM.h - 0.55, -4.2]} shadows={false} />
      <pointLight position={[-6, 1.7, -2.9]} color="#ffcf8a" intensity={2.5} distance={4} />
    </group>
  );
}

interface Spot {
  id: string;
  at: [number, number];
  y?: number;
  node: React.ReactNode;
}

/** All 27 memories: where they sit in the room and what they look like. */
const SPOTS: Spot[] = [
  {
    id: 'yellow-umbrella',
    at: [-2.3, -0.7],
    node: (
      <group position={[0.25, 0, 0.2]} rotation={[0, 0, 0.12]}>
        <Prop src="street-misc/umbrella-closed.glb" height={1} tint="#f6e27a" />
      </group>
    ),
  },
  {
    id: 'first-bouquet',
    at: [2.2, -0.9],
    node: (
      <>
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} collide />
        <Prop src="restaurant-kaykit/jar_A_medium.gltf" height={0.26} position={[0, 0.72, 0]} />
        <Bouquet position={[0, 0.9, 0]} colors={['#a9c8ff', '#ffffff', '#ffb6cf', '#ffffff', '#ff8fb0', '#fff2a8']} />
      </>
    ),
  },
  { id: 'cactus', at: [-4.4, -0.55], node: <Prop src="furniture-kaykit/cactus_small_A.gltf" height={0.34} position={[0, WIN.y0, 0.1]} /> },
  { id: 'mirror-heart', at: [4.4, -0.55], node: <Prop src="street-misc/present.glb" height={0.26} tint="#5fa8e8" position={[0, WIN.y0, 0.1]} /> },
  {
    id: 'dalat-keychain',
    at: [-3.2, -2.3],
    node: (
      <>
        <Prop src="furniture-kenney/tableRound.glb" height={0.75} collide />
        <Prop src="food-kenney/mug.glb" height={0.12} position={[0.1, 0.75, 0]} />
        <Prop src="food-kenney/croissant.glb" width={0.18} position={[-0.15, 0.75, 0.05]} />
        <Prop src="furniture-kaykit/chair_A_wood.gltf" height={0.95} position={[0, 0, -0.75]} collide />
      </>
    ),
  },
  {
    id: 'firefly-necklace',
    at: [3.2, -2.3],
    node: (
      <>
        <Prop src="furniture-kenney/tableRound.glb" height={0.75} collide />
        <Necklace position={[0, 0.95, 0]} />
        <Prop src="furniture-kaykit/chair_A_wood.gltf" height={0.95} position={[0, 0, -0.75]} collide />
      </>
    ),
  },
  {
    id: 'favourite-menu',
    at: [5.9, -2.8],
    node: (
      <>
        <Prop src="furniture-kenney/kitchenBar.glb" height={1.05} rotation={-Math.PI / 2} collide />
        <Prop src="restaurant-kaykit/menu.gltf" height={0.3} position={[0, 1.05, 0]} rotation={-Math.PI / 2} />
        <Prop src="food-kenney/cup-tea.glb" height={0.1} position={[0, 1.05, 0.3]} />
      </>
    ),
  },
  { id: 'stitch', at: [-6.05, -4.1], y: 0.48, node: <Prop src="furniture-kenney/bear.glb" height={0.42} tint="#6fb4ff" rotation={Math.PI / 2} /> },
  {
    id: 'photobooth-album',
    at: [-4.7, -5.1],
    node: (
      <>
        <Prop src="furniture-kaykit/table_low.gltf" height={0.42} width={1.3} rotation={Math.PI / 2} collide />
        <Prop src="furniture-kaykit/book_set.gltf" height={0.14} position={[0, 0.42, 0]} rotation={0.4} />
      </>
    ),
  },
  {
    id: 'bubu-dudu',
    at: [-6.05, -6.1],
    y: 0.48,
    node: (
      <>
        <Prop src="furniture-kenney/bear.glb" height={0.3} tint="#ffffff" position={[0, 0, -0.18]} rotation={Math.PI / 2} />
        <Prop src="furniture-kenney/bear.glb" height={0.33} tint="#a8774f" position={[0, 0, 0.18]} rotation={Math.PI / 2} />
      </>
    ),
  },
  {
    id: 'sala-flower',
    at: [-6.85, -5.1],
    y: 1.4,
    node: (
      <Frame
        position={[0, 0, 0]}
        rotation={Math.PI / 2}
        height={1.0}
        src="furniture-kaykit/pictureframe_large_A.gltf"
        label="25 · 07"
        sub="Sala, bông hoa khổng lồ"
      />
    ),
  },
  {
    id: 'childhood',
    at: [-6.85, -7.9],
    y: 1.4,
    node: (
      <Frame position={[0, 0, 0]} rotation={Math.PI / 2} height={0.6} src="furniture-kaykit/pictureframe_small_A.gltf" label="Bé Su" sub="tấm hình chét kem" />
    ),
  },
  {
    id: 'song',
    at: [-6.2, -9.5],
    node: (
      <>
        <Prop src="furniture-kenney/sideTableDrawers.glb" height={0.7} rotation={Math.PI / 2} collide />
        <Prop src="furniture-kenney/radio.glb" height={0.22} position={[0, 0.7, 0]} rotation={Math.PI / 2} />
      </>
    ),
  },
  {
    id: 'teddy-drumstick',
    at: [-1.6, -5.6],
    node: (
      <>
        <Prop src="restaurant-kaykit/table_round_A.gltf" height={0.78} collide />
        <Prop src="food-kenney/plate.glb" width={0.26} position={[0, 0.78, 0]} />
        <Prop src="food-kenney/donut.glb" width={0.12} position={[0, 0.8, 0]} tint="#d98a3a" />
        <Prop src="furniture-kaykit/chair_A_wood.gltf" height={0.95} position={[0.85, 0, 0]} rotation={-Math.PI / 2} collide />
        <Prop src="furniture-kaykit/chair_A_wood.gltf" height={0.95} position={[-0.85, 0, 0]} rotation={Math.PI / 2} collide />
      </>
    ),
  },
  {
    id: 'bread-for-everyone',
    at: [1.8, -7.2],
    node: (
      <>
        <Prop src="restaurant-kaykit/table_round_A.gltf" height={0.78} collide />
        <Prop src="food-kenney/bowl.glb" width={0.3} position={[-0.15, 0.78, 0]} />
        <Prop src="food-kenney/croissant.glb" width={0.18} position={[-0.15, 0.84, 0]} />
        <Prop src="furniture-kaykit/chair_A_wood.gltf" height={0.95} position={[0, 0, 0.85]} rotation={Math.PI} collide />
      </>
    ),
  },
  {
    id: 'bubbles',
    at: [3.0, -8.2],
    node: (
      <>
        <Prop src="food-kenney/soda-glass.glb" height={0.2} position={[0, 0.78, 0]} />
        <Sparkles position={[0, 1.2, 0]} count={14} scale={[0.6, 0.6, 0.6]} size={6} color="#cfe8ff" speed={0.3} />
      </>
    ),
  },
  { id: 'mini-lanterns', at: [0.2, -3.6], node: <Lanterns position={[0, 2.6, 0]} /> },
  {
    id: 'lily-hcmue',
    at: [6.0, -4.4],
    node: (
      <>
        <Prop src="furniture-kaykit/table_medium_long.gltf" height={0.8} width={1.0} rotation={Math.PI / 2} collide />
        <Prop src="restaurant-kaykit/jar_C_large.gltf" height={0.34} position={[0, 0.8, 0]} />
        <Bouquet position={[0, 1.08, 0]} colors={['#ffffff', '#fff6d0', '#ffffff', '#fff6d0', '#ffffff']} scale={1.2} />
      </>
    ),
  },
  {
    id: 'florist-table',
    at: [6.0, -6.0],
    node: (
      <>
        <Prop src="furniture-kaykit/table_medium_long.gltf" height={0.8} width={1.0} rotation={Math.PI / 2} collide />
        <Bouquet position={[0, 0.8, -0.25]} colors={['#ff8fb0', '#ffffff', '#ffd1e0']} />
        <Bouquet position={[0, 0.8, 0.25]} colors={['#f2c14e', '#ff6a3d', '#fff2a8']} scale={0.9} />
        <Prop src="restaurant-kaykit/jar_B_small.gltf" height={0.18} position={[0.2, 0.8, 0]} />
      </>
    ),
  },
  {
    id: 'ecuador-roses',
    at: [6.0, -7.6],
    node: (
      <>
        <Prop src="furniture-kaykit/table_medium_long.gltf" height={0.8} width={1.0} rotation={Math.PI / 2} collide />
        <Prop src="restaurant-kaykit/jar_D_medium.gltf" height={0.28} position={[0, 0.8, 0]} />
        <Bouquet position={[0, 1.02, 0]} colors={['#e0344f', '#ff5f7a', '#e0344f', '#ff9fb5', '#e0344f']} scale={1.25} />
      </>
    ),
  },
  {
    id: 'lamour-camera',
    at: [6.0, -9.2],
    node: (
      <>
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} collide />
        <Camera35 position={[0, 0.72, 0]} rotation={-Math.PI / 2} />
      </>
    ),
  },
  { id: 'chalkboard', at: [4.4, -11.7], y: 1.5, node: <Chalkboard position={[0, 0, 0]} /> },
  {
    id: 'banh-trang-jar',
    at: [2.4, -11.4],
    node: (
      <>
        <Prop src="furniture-kaykit/cabinet_small.gltf" height={0.9} collide />
        <Prop src="restaurant-kaykit/jar_B_large.gltf" height={0.36} position={[0, 0.9, 0]} tint="#ffe6b0" />
      </>
    ),
  },
  {
    id: 'guppies',
    at: [0.2, -11.4],
    node: (
      <>
        <Prop src="furniture-kaykit/cabinet_medium.gltf" height={0.9} width={1.2} collide />
        <FishTank position={[0, 0.9, 0]} />
      </>
    ),
  },
  {
    id: 'brown-bear-letter',
    at: [-2.0, -11.4],
    node: (
      <>
        <Prop src="furniture-kenney/bookcaseOpen.glb" height={2.0} collide />
        <Prop src="furniture-kenney/bear.glb" height={0.32} tint="#8a5a3a" position={[0, 1.02, 0.05]} />
      </>
    ),
  },
  {
    id: 'shell-car',
    at: [-4.4, -11.4],
    node: (
      <>
        <Prop src="furniture-kaykit/shelf_B_large_decorated.gltf" width={1.8} height={0.8} collide />
        <Prop src="street-misc/present.glb" height={0.22} position={[0.3, 0.8, 0.05]} tint="#ffd9a0" />
      </>
    ),
  },
  {
    id: 'movie-ticket',
    at: [-6.85, -10.5],
    y: 1.45,
    node: (
      <Frame
        position={[0, 0, 0]}
        rotation={Math.PI / 2}
        height={0.55}
        src="furniture-kaykit/pictureframe_small_B.gltf"
        label="Thư tình gửi ngoại"
        sub="08 · 08"
      />
    ),
  },
];

function MemorySpot({ s }: { s: Spot }) {
  const open = useGame((st) => st.open);
  const seen = useGame((st) => st.seen.includes(s.id));
  const m = memoryById(s.id)!;
  useEffect(
    () => register({ id: s.id, x: s.at[0], z: s.at[1], radius: 1.45, prompt: `${m.title}${m.date ? ` · ${m.date}` : ''}`, onUse: () => open(s.id) }),
    [s.id, s.at, m, open],
  );
  return (
    <group position={[s.at[0], s.y ?? 0.02, s.at[1]]}>
      {s.node}
      {!seen && <Sparkles position={[0, 1.1 - (s.y ?? 0) * 0.4, 0]} count={10} scale={[0.7, 0.7, 0.7]} size={4} color="#ffd98a" speed={0.35} />}
    </group>
  );
}

/** The rain chapters: three standing frames in the middle of the back room, one per date. */
const CHAPTER_AT: [number, number][] = [
  [-3.6, -9.9],
  [-0.7, -9.9],
  [2.2, -9.9],
];

function ChapterFrame({ i }: { i: number }) {
  const c = CHAPTERS[i];
  const [x, z] = CHAPTER_AT[i];
  const play = useGame((st) => st.playChapter);
  const done = useGame((st) => st.chaptersDone.includes(c.id));
  useEffect(() => register({ id: c.id, x, z, radius: 1.3, prompt: `Chương mưa ${c.date} · ${c.title}`, onUse: () => play(c.id) }), [c, x, z, play]);
  return (
    <group position={[x, 0.02, z]}>
      <Prop src="furniture-kaykit/pictureframe_standing_B.gltf" height={1.25} />
      <Text position={[0, 0.66, 0.3]} fontSize={0.13} color="#3a2a05" anchorX="center" maxWidth={1.1} textAlign="center">
        {c.title}
      </Text>
      <Text position={[0, 0.46, 0.3]} fontSize={0.09} color="#6b5532" anchorX="center">
        {'Chương mưa · ' + c.date}
      </Text>
      {!done && <Sparkles position={[0, 1.2, 0]} count={14} scale={[0.9, 1.1, 0.6]} size={3.5} color="#9cc8ff" speed={0.6} />}
    </group>
  );
}

/** Slow establishing shot for the title screen. */
function PreviewCamera() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.06;
    camera.position.set(Math.sin(t) * 3.5, 2.2 + Math.sin(t * 2) * 0.2, 9.5);
    camera.lookAt(0, 2.1, 0);
  });
  return null;
}

export default function World({ preview = false }: { preview?: boolean }) {
  const indoor = useMemo(() => new THREE.Box3(new THREE.Vector3(-ROOM.x - 0.4, 0, ROOM.z - 0.4), new THREE.Vector3(ROOM.x + 0.4, 7, 0.4)), []);
  return (
    <>
      <color attach="background" args={['#0b1322']} />
      <fog attach="fog" args={['#0b1322', 14, 34]} />
      <Environment files={A('hdri/kloppenheim_04_1k.hdr')} environmentIntensity={0.25} />
      <hemisphereLight args={['#6f86c0', '#1a1c26', 0.35]} />
      <directionalLight
        position={[-6, 14, 12]}
        intensity={0.55}
        color="#a9c2ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />
      <Physics gravity={[0, -9.81, 0]}>
        <Suspense fallback={null}>
          <Street />
          <Facade />
          <Door />
          <Interior />
          {SPOTS.map((s) => (
            <MemorySpot key={s.id} s={s} />
          ))}
          {CHAPTERS.map((c, i) => (
            <ChapterFrame key={c.id} i={i} />
          ))}
        </Suspense>
        {!preview && <Couple spawn={SPAWN} />}
      </Physics>
      <Rain count={touch ? 900 : 2000} indoorBox={indoor} />
      {preview && <PreviewCamera />}
      <EffectComposer multisampling={touch ? 0 : 4}>
        <Bloom luminanceThreshold={0.9} intensity={0.7} mipmapBlur />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}
