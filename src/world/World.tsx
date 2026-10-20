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
import { CHAPTER_META } from '../chapters/catalog';
import { toastBus } from '../lib/toast';
import { A, Prop } from './Prop';
import { Rain } from './Rain';
import { Bouquet, Camera35, Chalkboard, FishTank, Frame, GuppySchool, Lanterns, Necklace } from './Details';
import { Designer } from './Designer';
import { DesignerEnabled } from './designer-catalog';

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
      <Designer
        file="scene-hall-bench"
        scale={1.5}
        position={[-5.6, 0.12, 2.6]}
        rotation={Math.PI}
        collide
        fallback={<Prop src="street-kenney/detail-bench.glb" height={0.9} position={[-5.6, 0.12, 2.6]} rotation={Math.PI} collide />}
      />
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

/** The door set is 1.1 m wide and 2.21 m tall; stretch it to the opening (depth follows the height). */
const DOOR_SCALE: [number, number, number] = [DOOR.w / 1.1, DOOR.h / 2.21, DOOR.h / 2.21];

/** The code-built door leaf: the stand-in while the designer's door loads, and the fallback if it never does. */
function CodeDoorLeaf() {
  return (
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
      {/*
        The designer's door set is stretched to fill the 1.5 m opening. Its frame stays put and only the leaf swings, on its
        hinge edge (0.1 m in from the set's origin). The code-built leaf stands in until it loads and is the fallback.
      */}
      <Designer file="scene-door-set" part="frame" scale={DOOR_SCALE} position={[-DOOR.w / 2, 0, -0.12]} />
      <group ref={pivot} position={[-DOOR.w / 2 + 0.1 * DOOR_SCALE[0], 0, -0.12]}>
        <Designer
          file="scene-door-set"
          part="leaf"
          scale={DOOR_SCALE}
          position={[-0.1 * DOOR_SCALE[0], 0, 0]}
          fallback={
            <group position={[-0.1 * DOOR_SCALE[0], 0, 0]}>
              <CodeDoorLeaf />
            </group>
          }
        />
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
          {/* the paper lantern hangs from the cord's end; its shell has the designer's own glow material */}
          <Designer
            file="scene-paper-lantern"
            scale={0.7}
            shadows={false}
            fallback={
              <>
                <mesh>
                  <coneGeometry args={[0.28, 0.24, 24, 1, true]} />
                  <meshStandardMaterial color="#2f6f62" side={THREE.DoubleSide} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.08, 0]}>
                  <sphereGeometry args={[0.08, 12, 10]} />
                  <meshBasicMaterial toneMapped={false} color={new THREE.Color(3, 2.2, 1.3)} />
                </mesh>
              </>
            }
          />
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
      {/* just inside the door: umbrella stand on the right, a lantern-glow sconce on each side wall */}
      <Designer file="scene-umbrella-stand" scale={1.3} position={[1.45, 0.02, -0.5]} collide />
      {(
        [
          [-ROOM.x, -3.6, Math.PI / 2],
          [-ROOM.x, -6.5, Math.PI / 2],
          [-ROOM.x, -9.2, Math.PI / 2],
          [ROOM.x, -3.3, -Math.PI / 2],
          [ROOM.x, -6.8, -Math.PI / 2],
          [ROOM.x, -10.3, -Math.PI / 2],
        ] as const
      ).map(([x, z, r]) => (
        <Designer key={`${x}${z}`} file="scene-wall-sconce" scale={1.4} shadows={false} position={[x, 2.3, z]} rotation={r} />
      ))}
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
      // the yellow umbrella of that day, left open to dry beside the coat rack
      <Designer
        file="tm-umbrella-open"
        scale={0.95}
        position={[0.3, 0, 0.25]}
        rotation={0.6}
        fallback={
          <group position={[0.25, 0, 0.2]} rotation={[0, 0, 0.12]}>
            <Prop src="street-misc/umbrella-closed.glb" height={1} tint="#f6e27a" />
          </group>
        }
      />
    ),
  },
  {
    id: 'first-bouquet',
    at: [2.2, -0.9],
    node: (
      <>
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} collide />
        <Prop src="restaurant-kaykit/jar_A_medium.gltf" height={0.26} position={[0, 0.72, 0]} />
        {/* the wrapped bouquet stands in the jar, stem tip at the jar's mouth */}
        <Designer
          file="tm-bouquet-wrapped"
          scale={1.15}
          position={[0, 0.84, 0]}
          fallback={<Bouquet position={[0, 0.9, 0]} colors={['#a9c8ff', '#ffffff', '#ffb6cf', '#ffffff', '#ff8fb0', '#fff2a8']} />}
        />
        {/* the Hello Kitty in a pink dress that came with the flowers */}
        <Designer file="keepsake-hello-kitty" scale={1.5} position={[0.3, 0.72, 0.08]} rotation={-0.4} />
      </>
    ),
  },
  {
    id: 'cactus',
    at: [-4.4, -0.55],
    node: (
      <>
        <Designer
          file="keepsake-cactus"
          scale={2.4}
          position={[0, WIN.y0, 0.1]}
          fallback={<Prop src="furniture-kaykit/cactus_small_A.gltf" height={0.34} position={[0, WIN.y0, 0.1]} />}
        />
        {/* the wool bought that day */}
        <Designer file="keepsake-yarn-basket" scale={1.3} position={[0.45, WIN.y0, 0.1]} />
      </>
    ),
  },
  {
    id: 'mirror-heart',
    at: [4.4, -0.55],
    node: (
      <>
        <Designer
          file="keepsake-heart-mirror-box"
          scale={3}
          position={[-0.15, WIN.y0, 0.1]}
          fallback={<Prop src="street-misc/present.glb" height={0.26} tint="#5fa8e8" position={[-0.15, WIN.y0, 0.1]} />}
        />
        {/* the blue box with a ribbon it came in */}
        <Designer file="keepsake-blue-gift-box" scale={1} position={[0.3, WIN.y0, 0.1]} />
      </>
    ),
  },
  {
    id: 'dalat-keychain',
    at: [-3.2, -2.3],
    node: (
      <>
        <Prop src="furniture-kenney/tableRound.glb" height={0.75} collide />
        <Designer
          file="keepsake-phin-keychain"
          scale={2.4}
          position={[0, 0.75, 0]}
          fallback={
            <>
              <Prop src="food-kenney/mug.glb" height={0.12} position={[0.1, 0.75, 0]} />
              <Prop src="food-kenney/croissant.glb" width={0.18} position={[-0.15, 0.75, 0.05]} />
            </>
          }
        />
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
        <Designer file="tm-firefly-necklace" scale={2.4} position={[0, 0.75, 0]} fallback={<Necklace position={[0, 0.95, 0]} />} />
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
        <Designer
          file="tm-menu-card"
          scale={1.6}
          position={[0, 1.05, -0.1]}
          rotation={-Math.PI / 2}
          fallback={<Prop src="restaurant-kaykit/menu.gltf" height={0.3} position={[0, 1.05, 0]} rotation={-Math.PI / 2} />}
        />
        <Designer
          file="keepsake-taro-milk-tea"
          scale={1.7}
          position={[0, 1.05, 0.3]}
          fallback={<Prop src="food-kenney/cup-tea.glb" height={0.1} position={[0, 1.05, 0.3]} />}
        />
      </>
    ),
  },
  {
    id: 'stitch',
    at: [-6.05, -4.1],
    y: 0.48,
    node: (
      <Designer
        file="keepsake-stitch"
        scale={1.4}
        position={[0, -0.45, 0]}
        rotation={Math.PI / 2}
        fallback={<Prop src="furniture-kenney/bear.glb" height={0.42} tint="#6fb4ff" rotation={Math.PI / 2} />}
      />
    ),
  },
  {
    id: 'photobooth-album',
    at: [-4.7, -5.1],
    node: (
      <>
        <Prop src="furniture-kaykit/table_low.gltf" height={0.42} width={1.3} rotation={Math.PI / 2} collide />
        <Designer
          file="keepsake-photobooth-album"
          scale={2}
          position={[0, 0.42, 0]}
          rotation={0.4}
          fallback={<Prop src="furniture-kaykit/book_set.gltf" height={0.14} position={[0, 0.42, 0]} rotation={0.4} />}
        />
      </>
    ),
  },
  {
    id: 'bubu-dudu',
    at: [-6.05, -6.1],
    y: 0.48,
    node: (
      <Designer
        file="keepsake-bubu-dudu"
        scale={2}
        position={[0, -0.45, 0]}
        rotation={Math.PI / 2}
        fallback={
          <>
            <Prop src="furniture-kenney/bear.glb" height={0.3} tint="#ffffff" position={[0, 0, -0.18]} rotation={Math.PI / 2} />
            <Prop src="furniture-kenney/bear.glb" height={0.33} tint="#a8774f" position={[0, 0, 0.18]} rotation={Math.PI / 2} />
          </>
        }
      />
    ),
  },
  {
    id: 'sala-flower',
    at: [-6.85, -5.1],
    y: 1.4,
    node: (
      <>
        {/* the giant flower itself, standing on the floor under its photo (the group sits 1.4 m up the wall) */}
        <Designer file="scene-sala-flower" scale={0.5} position={[0.95, -1.38, 0]} />
        {/* the teddy that was hunted on sale that day, sitting at its foot */}
        <Designer file="keepsake-sale-bear" scale={1.8} position={[0.6, -1.38, 0.4]} rotation={Math.PI / 2 - 0.6} />
        <Frame
          position={[0, 0, 0]}
          rotation={Math.PI / 2}
          height={1.0}
          src="furniture-kaykit/pictureframe_large_A.gltf"
          label="25 · 07"
          sub="Sala, bông hoa khổng lồ"
        />
      </>
    ),
  },
  {
    id: 'childhood',
    at: [-6.85, -7.9],
    y: 1.4,
    node: (
      <>
        {/* her baby photo on a little table under the wall, its caption drawn on the blank picture (no photo ships) */}
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} position={[0.3, -1.38, 0]} rotation={Math.PI / 2} />
        <Designer
          file="tm-baby-photo-frame"
          scale={1.7}
          position={[0.3, -0.66, 0]}
          rotation={Math.PI / 2}
          fallback={
            <Frame
              position={[0, 0, 0]}
              rotation={Math.PI / 2}
              height={0.6}
              src="furniture-kaykit/pictureframe_small_A.gltf"
              label="Bé Su"
              sub="tấm hình chét kem"
            />
          }
        >
          <Text position={[0, 0.2, 0.07]} fontSize={0.06} color="#5a3d2a" anchorX="center" maxWidth={0.2} textAlign="center">
            {'Bé Su\ntấm hình chét kem'}
          </Text>
        </Designer>
        {/* the mask she was afraid of as a child, on the floor under the photo */}
        <Designer file="keepsake-mask-toy" scale={2.5} position={[0.35, -1.38, 0.65]} rotation={Math.PI / 2} />
      </>
    ),
  },
  {
    id: 'song',
    at: [-6.2, -9.5],
    node: (
      <>
        <Prop src="furniture-kenney/sideTableDrawers.glb" height={0.7} rotation={Math.PI / 2} collide />
        <Designer
          file="keepsake-radio"
          scale={1.3}
          position={[0, 0.7, 0]}
          rotation={Math.PI / 2}
          fallback={<Prop src="furniture-kenney/radio.glb" height={0.22} position={[0, 0.7, 0]} rotation={Math.PI / 2} />}
        />
      </>
    ),
  },
  {
    id: 'teddy-drumstick',
    at: [-1.6, -5.6],
    node: (
      <>
        <Prop src="restaurant-kaykit/table_round_A.gltf" height={0.78} collide />
        <Prop src="food-kenney/plate.glb" width={0.46} position={[0, 0.78, 0]} />
        <Designer
          file="keepsake-fried-chicken-plush"
          scale={1.5}
          position={[0, 0.8, 0]}
          rotation={0.5}
          fallback={<Prop src="food-kenney/donut.glb" width={0.12} position={[0, 0.8, 0]} tint="#d98a3a" />}
        />
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
        {/* the bag of bread loaves from that day */}
        <Designer
          file="tm-banh-mi-bag"
          scale={1}
          position={[-0.15, 0.78, 0]}
          rotation={0.3}
          fallback={
            <>
              <Prop src="food-kenney/bowl.glb" width={0.3} position={[-0.15, 0.78, 0]} />
              <Prop src="food-kenney/croissant.glb" width={0.18} position={[-0.15, 0.84, 0]} />
            </>
          }
        />
        <Prop src="furniture-kaykit/chair_A_wood.gltf" height={0.95} position={[0, 0, 0.85]} rotation={Math.PI} collide />
        {/* the red and blue raincoats of that day, hung to dry on a rod from the ceiling beside the table */}
        <group position={[1.35, 0, -0.1]}>
          <mesh position={[0, 1.78, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 1.1, 8]} />
            <meshStandardMaterial color="#3b2a1f" roughness={0.6} />
          </mesh>
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 3, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 2.44, 4]} />
              <meshBasicMaterial color="#111" />
            </mesh>
          ))}
          <Designer file="keepsake-raincoats" scale={0.85} position={[0, 1.78, 0.04]} />
        </group>
      </>
    ),
  },
  {
    id: 'bubbles',
    at: [3.0, -8.2],
    node: (
      <>
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} collide />
        <Designer
          file="keepsake-bubble-wand"
          scale={3}
          position={[0, 0.72, 0]}
          fallback={<Prop src="food-kenney/soda-glass.glb" height={0.2} position={[0, 0.78, 0]} />}
        />
        <Sparkles position={[0, 1.2, 0]} count={14} scale={[0.6, 0.6, 0.6]} size={6} color="#cfe8ff" speed={0.3} />
      </>
    ),
  },
  { id: 'mini-lanterns', at: [0.2, -3.6], node: <Lanterns position={[0, 2.75, 0]} /> },
  {
    id: 'lily-hcmue',
    at: [6.0, -4.4],
    node: (
      <>
        <Prop src="furniture-kaykit/table_medium_long.gltf" height={0.8} width={1.0} rotation={Math.PI / 2} collide />
        <Designer
          file="keepsake-white-lily"
          scale={1.8}
          position={[0, 0.8, 0]}
          fallback={
            <>
              <Prop src="restaurant-kaykit/jar_C_large.gltf" height={0.34} position={[0, 0.8, 0]} />
              <Bouquet position={[0, 1.08, 0]} colors={['#ffffff', '#fff6d0', '#ffffff', '#fff6d0', '#ffffff']} scale={1.2} />
            </>
          }
        />
      </>
    ),
  },
  {
    id: 'florist-table',
    at: [6.0, -6.0],
    node: (
      <>
        <Prop src="furniture-kaykit/table_medium_long.gltf" height={0.8} width={1.0} rotation={Math.PI / 2} collide />
        <Designer
          file="keepsake-ten-oclock-flower"
          scale={2.4}
          position={[0, 0.8, -0.28]}
          fallback={<Bouquet position={[0, 0.8, -0.25]} colors={['#ff8fb0', '#ffffff', '#ffd1e0']} />}
        />
        {/* the florist's flower cart (her dream) takes the place of the code-built bouquet and jar */}
        <Designer
          file="keepsake-flower-shop"
          scale={0.8}
          position={[0, 0.8, 0.22]}
          rotation={-Math.PI / 2}
          fallback={
            <>
              <Bouquet position={[0, 0.8, 0.25]} colors={['#f2c14e', '#ff6a3d', '#fff2a8']} scale={0.9} />
              <Prop src="restaurant-kaykit/jar_B_small.gltf" height={0.18} position={[0.2, 0.8, 0]} />
            </>
          }
        />
      </>
    ),
  },
  {
    id: 'ecuador-roses',
    at: [6.0, -7.6],
    node: (
      <>
        <Prop src="furniture-kaykit/table_medium_long.gltf" height={0.8} width={1.0} rotation={Math.PI / 2} collide />
        {/* the MC certificate she collected that day, framed on the wall behind the roses */}
        <Designer file="keepsake-mc-certificate" scale={2} position={[0.95, 1.5, 0]} rotation={-Math.PI / 2} shadows={false} />
        <Designer
          file="keepsake-ecuador-roses"
          scale={1.5}
          position={[0, 0.8, 0]}
          fallback={
            <>
              <Prop src="restaurant-kaykit/jar_D_medium.gltf" height={0.28} position={[0, 0.8, 0]} />
              <Bouquet position={[0, 1.02, 0]} colors={['#e0344f', '#ff5f7a', '#e0344f', '#ff9fb5', '#e0344f']} scale={1.25} />
            </>
          }
        />
      </>
    ),
  },
  {
    id: 'lamour-camera',
    at: [6.0, -9.2],
    node: (
      <>
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} collide />
        <Designer
          file="keepsake-film-camera"
          scale={2.4}
          position={[0, 0.72, 0]}
          rotation={-Math.PI / 2}
          fallback={<Camera35 position={[0, 0.72, 0]} rotation={-Math.PI / 2} />}
        />
      </>
    ),
  },
  {
    id: 'chalkboard',
    at: [4.4, -11.7],
    y: 1.5,
    node: (
      // the easel board stands on the floor (the group sits 1.5 m up the wall); the caption is drawn on its dark face
      <Designer file="tm-chalkboard" scale={1.9} position={[0, -1.48, 0.1]} fallback={<Chalkboard position={[0, 0, 0]} />}>
        <Text position={[0, 0.95, 0.12]} fontSize={0.12} color="#f4f1e6" anchorX="center" maxWidth={0.7} textAlign="center">
          Cô Su ♡
        </Text>
        <Text position={[0, 0.78, 0.12]} fontSize={0.05} color="#f4f1e6" anchorX="center" maxWidth={0.7} textAlign="center">
          {'Sư phạm Tiểu học · HCMUE\nhọc trò ngoan, cô thương'}
        </Text>
      </Designer>
    ),
  },
  {
    id: 'banh-trang-jar',
    at: [2.4, -11.4],
    node: (
      <>
        <Prop src="furniture-kaykit/cabinet_small.gltf" height={0.9} collide />
        <Designer
          file="keepsake-rice-paper-jar"
          scale={2.4}
          position={[-0.12, 0.9, 0]}
          fallback={<Prop src="restaurant-kaykit/jar_B_large.gltf" height={0.36} position={[0, 0.9, 0]} tint="#ffe6b0" />}
        />
        {/* the guava from the same visit, still with its stem */}
        <Designer file="keepsake-guava" scale={1.6} position={[0.2, 0.9, 0.02]} />
      </>
    ),
  },
  {
    id: 'guppies',
    at: [0.2, -11.4],
    node: (
      <>
        <Prop src="furniture-kaykit/cabinet_medium.gltf" height={0.9} width={1.2} collide />
        {/* the designer's tank has an opaque water mesh (top face at 0.237 m before scaling), so the animated guppies swim just above it */}
        <Designer file="keepsake-guppy-tank" scale={1.7} position={[-0.18, 0.9, 0]} fallback={<FishTank position={[0, 0.9, 0]} />}>
          <GuppySchool position={[0, 0.237 * 1.7, 0]} halfX={0.28} halfZ={0.1} />
        </Designer>
        <Designer file="keepsake-blue-hydrangea" scale={1.3} position={[0.42, 0.9, 0.02]} />
        <pointLight position={[-0.18, 1.35, 0.3]} color="#8fd0ff" intensity={1.2} distance={2.2} />
      </>
    ),
  },
  {
    id: 'brown-bear-letter',
    at: [-2.0, -11.4],
    node: (
      <>
        <Designer file="scene-bookcase" scale={1.05} collide fallback={<Prop src="furniture-kenney/bookcaseOpen.glb" height={2.0} collide />} />
        <Designer file="keepsake-mc-mic" scale={1.6} position={[0.38, 2.05, 0.02]} />
        {/* the very long letter, folded on top of the case */}
        <Designer file="tm-long-letter" scale={1.8} position={[-0.38, 2.05, 0.02]} rotation={0.35} />
        <Designer
          file="keepsake-pajama-bear"
          scale={1.5}
          position={[0, 2.05, 0.02]}
          fallback={<Prop src="furniture-kenney/bear.glb" height={0.32} tint="#8a5a3a" position={[0, 2.05, 0.05]} />}
        />
      </>
    ),
  },
  {
    id: 'shell-car',
    at: [-4.4, -11.4],
    node: (
      <>
        <Prop src="furniture-kaykit/shelf_B_large_decorated.gltf" width={1.8} height={0.8} collide />
        <Designer
          file="keepsake-shell-car"
          scale={2.5}
          position={[0.3, 0.8, 0.05]}
          fallback={<Prop src="street-misc/present.glb" height={0.22} position={[0.3, 0.8, 0.05]} tint="#ffd9a0" />}
        />
      </>
    ),
  },
  {
    id: 'movie-ticket',
    at: [-6.85, -10.5],
    y: 1.45,
    node: (
      <>
        <Frame
          position={[0, 0, 0]}
          rotation={Math.PI / 2}
          height={0.55}
          src="furniture-kaykit/pictureframe_small_B.gltf"
          label="Thư tình gửi ngoại"
          sub="08 · 08"
        />
        {/* the two ticket stubs, on a little table under the poster (the group sits 1.45 m up the wall) */}
        <Prop src="furniture-kenney/sideTable.glb" height={0.72} position={[0.35, -1.43, 0.1]} rotation={Math.PI / 2} />
        <Designer file="tm-movie-ticket-pair" scale={2.4} position={[0.35, -0.71, 0.1]} rotation={Math.PI / 2 + 0.3} />
      </>
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

/** The three rain chapters: standing frames across the back of the room, one per date. */
const CHAPTER_AT: [number, number][] = [
  [-3.6, -9.9],
  [-0.7, -9.9],
  [2.2, -9.9],
];

function ChapterFrame({ i }: { i: number }) {
  const c = CHAPTER_META[i];
  const [x, z] = CHAPTER_AT[i];
  const play = useGame((st) => st.playChapter);
  const done = useGame((st) => st.postcards.some((p) => p.id === c.id));
  useEffect(() => register({ id: c.id, x, z, radius: 1.3, prompt: `Vào chương mưa ${c.date} · ${c.title}`, onUse: () => play(c.id) }), [c, x, z, play]);
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

/*
 * Wayfinding to the rain chapters: dots of light run from just inside the door straight back to the three frames,
 * then fan out along the row in front of them. A pulse travels down the trail so it reads as "this way".
 */
const TRAIL: { x: number; z: number; s: number }[] = (() => {
  const dots: { x: number; z: number; s: number }[] = [];
  for (let z = -1.5; z >= -8.5; z -= 0.55) dots.push({ x: 0.05, z, s: -1.5 - z });
  const along = 7;
  for (let x = -3.6; x <= 2.21; x += 0.55) dots.push({ x, z: -8.75, s: along + Math.abs(x - 0.05) });
  return dots;
})();

function ChapterTrail() {
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats.current.forEach((m, i) => {
      if (!m) return;
      const w = Math.max(0, Math.sin(t * 2.6 - TRAIL[i].s * 1.2));
      m.color.setRGB(0.5, 0.9, 1.5).multiplyScalar(0.8 + 1.2 * w * w);
      m.opacity = 0.7 + 0.3 * w;
    });
  });
  return (
    <group>
      {TRAIL.map((d, i) => (
        <mesh key={i} position={[d.x, 0.06, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.085, 14]} />
          <meshBasicMaterial ref={(m) => void (m && (mats.current[i] = m))} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {CHAPTER_AT.map(([x]) => (
        <mesh key={x} position={[x, 0.065, -9.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.58, 32]} />
          <meshBasicMaterial color={new THREE.Color(0.5, 0.9, 1.6)} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A standing sign just inside the door, beside the trail: "Chương mưa" and a glowing chevron that points
 * straight ahead. It stands beside the trail at about the depth the couple reach a few steps in, so the camera
 * (held off the front wall, looking down over them) frames the whole board next to them instead of cutting it at
 * the bottom of the screen or hiding them behind it.
 */
function ChapterSign() {
  const glowCol = useMemo(() => new THREE.Color(0.55, 1.0, 1.7), []);
  return (
    <group position={[1.75, 0, -3.6]} rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0.7, -0.03]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#3b2a1f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.5, 0.5, 0.06]} />
        <meshStandardMaterial color="#4a2f1e" roughness={0.6} emissive="#2a1a10" emissiveIntensity={0.7} />
      </mesh>
      <Text position={[-0.18, 1.4, 0.04]} fontSize={0.19} color="#f6e7c4" anchorX="center" anchorY="middle">
        Chương mưa
      </Text>
      {/* an upward chevron: straight ahead, where the trail goes */}
      <group position={[0.58, 1.4, 0.04]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.065, -0.015, 0]} rotation={[0, 0, s * -0.75]}>
            <boxGeometry args={[0.2, 0.055, 0.02]} />
            <meshBasicMaterial color={glowCol} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Slow establishing shot for the title screen. */
const SIGN_VIEW_WIDTH = 5.6;
function PreviewCamera() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.06;
    // a phone-width canvas sees less of the street at the same distance: back off until the whole sign (about 5.6 m with margin) fits
    const cam = camera as THREE.PerspectiveCamera;
    const dist = Math.max(9.5, SIGN_VIEW_WIDTH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect));
    camera.position.set(Math.sin(t) * 3.5, 2.2 + Math.sin(t * 2) * 0.2, dist);
    camera.lookAt(0, 2.1, 0);
  });
  return null;
}

export default function World({ preview = false }: { preview?: boolean }) {
  // back from a rain chapter: stand in front of its frame instead of out on the street
  const last = useGame((s) => s.lastChapter);
  const spawn = useMemo<[number, number, number]>(() => {
    const i = CHAPTER_META.findIndex((c) => c.id === last);
    return i < 0 ? SPAWN : [CHAPTER_AT[i][0], SPAWN[1], CHAPTER_AT[i][1] + 1.6];
  }, [last]);
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
      <DesignerEnabled.Provider value={!preview}>
        <Physics gravity={[0, -9.81, 0]}>
          <Suspense fallback={null}>
            <Street />
            <Facade />
            <Door />
            <Interior />
            {SPOTS.map((s) => (
              <MemorySpot key={s.id} s={s} />
            ))}
            {CHAPTER_META.map((c, i) => (
              <ChapterFrame key={c.id} i={i} />
            ))}
            <ChapterTrail />
            <ChapterSign />
          </Suspense>
          {!preview && <Couple spawn={spawn} />}
        </Physics>
      </DesignerEnabled.Provider>
      <Rain count={touch ? 900 : 2000} indoorBox={indoor} />
      {preview && <PreviewCamera />}
      <EffectComposer multisampling={touch ? 0 : 4}>
        <Bloom luminanceThreshold={0.9} intensity={0.7} mipmapBlur />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}
