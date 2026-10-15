import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody, type RapierCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Chibi, type ChibiHandle } from '../world/Chibi';
import { useGame } from '../state/store';
import { axis, consume, look, resetPresses, stick } from './input';
import { updateFocus, focused } from './interactions';
import { setIndoor } from './audio';
import { angleDelta, cameraRelative, clamp, damp } from '../lib/math';
import { toastBus } from '../lib/toast';

const SPEED = { phu: 2.9, su: 3.1 };
const HOLD_SPEED = 2.8;
const CAPSULE = { half: 0.42, r: 0.3 };

interface Walker {
  body: React.RefObject<RapierRigidBody>;
  col: React.RefObject<RapierCollider>;
  vis: React.RefObject<THREE.Group>;
  chibi: React.RefObject<ChibiHandle>;
  face: number;
  vel: THREE.Vector2;
  phase: number;
}

function useWalker(): Walker {
  const body = useRef<RapierRigidBody>(null);
  const col = useRef<RapierCollider>(null);
  const vis = useRef<THREE.Group>(null);
  const chibi = useRef<ChibiHandle>(null);
  const state = useRef({ face: Math.PI, vel: new THREE.Vector2(), phase: 0 });
  return useMemo(() => Object.assign(state.current, { body, col, vis, chibi }), []);
}

/**
 * The couple: one kinematic capsule each, moved by Rapier's character controller so they
 * slide along walls and furniture. One person is led by input; the other follows a step
 * behind, or walks hand in hand. Also owns the third-person camera (orbit + wall push-in).
 */
export function Couple({ spawn }: { spawn: [number, number, number] }) {
  const { su, phu, lead, twoPlayer, toggleLead, active } = useGame();
  const { world, rapier } = useRapier();
  const { camera } = useThree();
  const P = useWalker();
  const S = useWalker();
  const hold = useRef(false);
  const ctrl = useMemo(() => {
    const c = world.createCharacterController(0.02);
    c.setSlideEnabled(true);
    c.enableAutostep(0.25, 0.2, true);
    c.setApplyImpulsesToDynamicBodies(false);
    return c;
  }, [world]);
  useEffect(() => () => world.removeCharacterController(ctrl), [world, ctrl]);
  const cam = useRef({ yaw: 0, pitch: 0.32, dist: 6.2, pos: new THREE.Vector3(spawn[0], 3, spawn[2] + 6), target: new THREE.Vector3(...spawn) });

  const step = (w: Walker, ix: number, iz: number, speed: number, dt: number) => {
    const body = w.body.current;
    const col = w.col.current;
    if (!body || !col) return;
    const tx = ix * speed;
    const tz = iz * speed;
    w.vel.x += (tx - w.vel.x) * damp(12, dt);
    w.vel.y += (tz - w.vel.y) * damp(12, dt);
    const desired = { x: w.vel.x * dt, y: 0, z: w.vel.y * dt };
    ctrl.computeColliderMovement(col, desired, undefined, undefined, (c) => c.handle !== P.col.current?.handle && c.handle !== S.col.current?.handle);
    const m = ctrl.computedMovement();
    const t = body.translation();
    // one flat floor level for street and room: keep the capsule at standing height
    const next = { x: t.x + m.x, y: spawn[1] + CAPSULE.half + CAPSULE.r, z: t.z + m.z };
    body.setNextKinematicTranslation(next);
    const sp = Math.hypot(w.vel.x, w.vel.y);
    if (sp > 0.15) w.face += angleDelta(w.face, Math.atan2(w.vel.x, w.vel.y)) * damp(12, dt);
    w.phase += sp * dt * 3.2;
    if (w.vis.current) {
      w.vis.current.position.set(next.x, next.y - CAPSULE.half - CAPSULE.r, next.z);
      w.vis.current.rotation.y = w.face;
    }
    const pose = w.chibi.current?.pose;
    if (pose) {
      pose.speed = Math.min(1, sp / 2.6);
      pose.phase = w.phase;
    }
  };

  useEffect(() => resetPresses(), []);

  // test hook: lets e2e read positions (dev builds only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __tm?: unknown }).__tm = {
      pos: () => [P, S].map((w) => w.body.current?.translation()),
      cam: () => camera.position.toArray(),
      teleport: (x: number, z: number) =>
        [P, S].forEach((w, i) => {
          const y = spawn[1] + CAPSULE.half + CAPSULE.r;
          w.body.current?.setTranslation({ x: x + (i ? -0.5 : 0.5), y, z: z + 0.3 * i }, true);
          w.vel.set(0, 0);
        }),
    };
  }, [P, S, spawn, camera]);
  const indoor = useRef(false);
  useFrame((_, rawDt) => {
    // 0.1 s cap: slow devices still move at real speed; the controller resolves collisions per step
    const dt = Math.min(rawDt, 0.1);
    const c = cam.current;
    // ----- camera input (drag to orbit, wheel to zoom)
    c.yaw -= look.dx * 0.005;
    c.pitch = clamp(c.pitch + look.dy * 0.003, 0.08, 0.95);
    c.dist = clamp(c.dist + look.zoom * 0.6, 3.2, 10);
    look.dx = look.dy = look.zoom = 0;

    const L = lead === 'phu' ? P : S;
    const F = lead === 'phu' ? S : P;
    if (consume('swap') && !twoPlayer) {
      toggleLead();
      toastBus.emit(`Giờ là ${lead === 'phu' ? 'Su' : 'Phú'} dẫn đường`);
    }
    if (consume('hold')) {
      const a = L.body.current?.translation();
      const b = F.body.current?.translation();
      if (a && b && Math.hypot(a.x - b.x, a.z - b.z) < 1.8) {
        hold.current = !hold.current;
        toastBus.emit(hold.current ? 'Nắm tay rồi. Đi đâu cũng đi cùng nhau.' : 'Buông tay một chút thôi nha.');
      } else toastBus.emit('Lại gần nhau hơn để nắm tay');
    }
    if (active) {
      step(P, 0, 0, 0, dt);
      step(S, 0, 0, 0, dt);
    } else if (twoPlayer && !hold.current) {
      const a = axis('a');
      const b = axis('b');
      const va = cameraRelative(a.x + (lead === 'phu' ? stick.x : 0), a.z + (lead === 'phu' ? stick.z : 0), c.yaw);
      const vb = cameraRelative(b.x + (lead === 'su' ? stick.x : 0), b.z + (lead === 'su' ? stick.z : 0), c.yaw);
      step(P, va.x, va.z, SPEED.phu, dt);
      step(S, vb.x, vb.z, SPEED.su, dt);
    } else {
      const a = axis('both');
      const v = cameraRelative(clamp(a.x + stick.x, -1, 1), clamp(a.z + stick.z, -1, 1), c.yaw);
      step(L, v.x, v.z, hold.current ? HOLD_SPEED : SPEED[lead], dt);
      const lt = L.body.current?.translation();
      const ft = F.body.current?.translation();
      if (lt && ft) {
        // follower target: beside the leader when holding hands, otherwise a step behind
        const back = hold.current ? 0 : 1.1;
        const side = hold.current ? 0.62 : 0.35;
        const fx = Math.sin(L.face),
          fz = Math.cos(L.face);
        const tx = lt.x - fx * back + fz * side * (F === S ? 1 : -1);
        const tz = lt.z - fz * back - fx * side * (F === S ? 1 : -1);
        const dx = tx - ft.x,
          dz = tz - ft.z,
          d = Math.hypot(dx, dz);
        const sp = hold.current ? HOLD_SPEED * 1.25 : SPEED[F === P ? 'phu' : 'su'];
        if (d > 0.18) step(F, dx / d, dz / d, Math.min(sp, d * 4), dt);
        else step(F, 0, 0, 0, dt);
        if (hold.current && Math.hypot(L.vel.x, L.vel.y) < 0.2) F.face += angleDelta(F.face, L.face) * damp(6, dt);
      }
    }
    // hand-hold pose
    const sideP = hold.current ? (lead === 'phu' ? -1 : 1) : 0;
    if (P.chibi.current) P.chibi.current.pose.holdSide = sideP;
    if (S.chibi.current) S.chibi.current.pose.holdSide = hold.current ? -sideP : 0;

    // ----- interaction
    // in 2-player either person can open a memory: use whoever stands closer to one
    const lt = L.body.current?.translation();
    const ot = F.body.current?.translation();
    if (lt) {
      const inside = lt.z < -0.3;
      if (inside !== indoor.current) setIndoor((indoor.current = inside));
      const f = updateFocus(lt.x, lt.z);
      if (!f && twoPlayer && ot) updateFocus(ot.x, ot.z);
      if (consume('interact') && !active) focused()?.onUse();
    }

    // ----- camera: orbit around the couple, pushed in by walls (camera-systems: spring arm)
    const pt = P.body.current?.translation();
    const stt = S.body.current?.translation();
    if (pt && stt) {
      const mid = new THREE.Vector3((pt.x + stt.x) / 2, 1.15, (pt.z + stt.z) / 2);
      // indoors the camera rises so furniture never blocks the couple
      const inside = mid.z < -0.4;
      if (inside && c.pitch < 0.62) c.pitch += (0.62 - c.pitch) * damp(2, dt);
      c.target.lerp(mid, damp(6, dt));
      const dir = new THREE.Vector3(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
      // portrait phones need a wider frame to show both people and the room
      let dist = c.dist * ((camera as THREE.PerspectiveCamera).aspect < 0.8 ? 1.35 : 1);
      const ray = new rapier.Ray(c.target, dir);
      const hit = world.castRay(
        ray,
        dist,
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        (col) => !!(col.parent()?.userData as { wall?: boolean } | undefined)?.wall,
      );
      if (hit) dist = Math.max(0.9, hit.timeOfImpact - 0.25);
      const want = c.target.clone().addScaledVector(dir, dist);
      // keep the camera in the same space as the couple: inside the room box, or out on the street
      if (inside) {
        want.x = clamp(want.x, -6.5, 6.5);
        want.y = clamp(want.y, 0.6, 3.9);
        want.z = clamp(want.z, -11.5, -0.7);
      } else want.z = Math.max(want.z, 0.5);
      c.pos.lerp(want, damp(hit ? 14 : 5, dt));
      camera.position.copy(c.pos);
      camera.lookAt(c.target);
    }
  });

  return (
    <>
      {(
        [
          ['phu', P, 0.45],
          ['su', S, -0.45],
        ] as const
      ).map(([kind, w, dx]) => (
        <group key={kind}>
          <RigidBody
            ref={w.body}
            type="kinematicPosition"
            colliders={false}
            position={[spawn[0] + dx, spawn[1] + CAPSULE.half + CAPSULE.r, spawn[2]]}
            enabledRotations={[false, false, false]}
          >
            <CapsuleCollider ref={w.col} args={[CAPSULE.half, CAPSULE.r]} />
          </RigidBody>
          <group ref={w.vis} position={[spawn[0] + dx, spawn[1], spawn[2]]} rotation={[0, Math.PI, 0]}>
            <Chibi ref={w.chibi} kind={kind} su={su} phu={phu} />
          </group>
        </group>
      ))}
    </>
  );
}
