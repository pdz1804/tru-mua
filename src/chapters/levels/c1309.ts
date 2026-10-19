/**
 * 13·09 — Áo mưa đỏ, áo mưa xanh, in the real order: raincoats on, a hug and kisses in the
 * light rain first; then the Exciter ride to Nowzone through heavy rain, where trucks overtake
 * on the left and Su turns her face to the right; Dookki while the rain eases; then the bánh mì
 * round: twelve loaves, the two cô at the gas station sharing the last one, Su's idea to buy
 * five more, and the security guard last.
 */
import * as THREE from 'three';
import { TUNING, serveBread, shieldStamp, shouldWarn, truckHit } from '../tuning';
import { SKY, type Engine, type Level, type Walker } from '../engine/runtime';
import { CHAPTER_META } from '../catalog';
import {
  clamp,
  damp,
  glow,
  glowTex,
  lamp,
  lerp,
  makeChar,
  makeExciter,
  makePerson,
  makeTruck,
  rnd,
  setSeed,
  signTex,
  std,
  streetRow,
  tiled,
  tiles,
  asphalt,
  type Person,
  type Rig,
  type Vehicle,
} from '../engine/kit';

type Stage = 'prologue' | 'ride' | 'dookki' | 'bread' | 'end';
interface Waiting {
  g: Person;
  x: number;
  got: boolean;
  station: boolean;
  extra: boolean;
  guard: boolean;
}

const LEG1_END = 170;
const LEG2_START = 190;

export class Chapter1309 implements Level {
  id = CHAPTER_META[2].id;
  date = CHAPTER_META[2].date;
  title = CHAPTER_META[2].title;
  memo = CHAPTER_META[2].memo;
  mode = 'ride' as const;
  postText = 'Một cái ôm dưới mưa nhỏ, rồi hai đứa chạy xe đi phát bánh mì: mười hai ổ, hai cô chia đôi ổ cuối, và Su bảo mua thêm năm ổ.';
  spawnZ = 0;
  private len = 470;
  private stage: Stage = 'prologue';
  private stageT = 0;
  private s = {
    x: 0,
    z: 1.3,
    vz: 0,
    speed: 0,
    wet: 0,
    shield: 0,
    bread: TUNING.breadFirst as number,
    given: 0,
    faceSplashes: 0,
    shielded: 0,
    missed: 0,
    lean: 0,
  };
  private bike!: THREE.Group;
  private ex!: Vehicle;
  private phu!: Rig;
  private su!: Rig;
  private shadow!: THREE.Mesh;
  private trucks: { g: Vehicle; on: boolean; x: number; v: number; warned: boolean; hit: boolean }[] = [];
  private nextTruck = 6;
  private puddles: { x: number; z: number; hit: boolean }[] = [];
  private people: Waiting[] = [];
  private stationX = 0;
  private stationDone = false;
  private snapped = false;
  private hearted = false;
  private readonly tgt = new THREE.Vector3();

  build(e: Engine) {
    e.newWorld();
    setSeed(53);
    e.intensity = 0.5;
    (e.scene.background as THREE.Color).copy(SKY.NIGHT);
    (e.scene.fog as THREE.FogExp2).color.copy(SKY.NIGHT);
    (e.scene.fog as THREE.FogExp2).density = 0.03;
    const w = e.world,
      len = this.len;
    asphalt.repeat.set((len + 80) / 6, 2);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(len + 80, 10), std(0x1b2230, { map: asphalt, roughness: 0.22, metalness: 0.05, envMapIntensity: 0.7 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(len / 2, 0, 0);
    road.receiveShadow = true;
    w.add(road);
    [-1.3, 1.3].forEach((z) => {
      for (let x = -40; x < len + 40; x += 4) {
        const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.12), glow(0xaab3c0, 0.7));
        d.rotation.x = -Math.PI / 2;
        d.position.set(x, 0.01, z);
        w.add(d);
      }
    });
    [-6.2, 6.2].forEach((z) => {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(len + 80, 0.14, 2.4),
        std(0x9aa3b4, { map: tiled(tiles, (len + 80) / 1.2, 2), roughness: 0.4, envMapIntensity: 0.45 }),
      );
      s.position.set(len / 2, 0.07, z);
      s.receiveShadow = true;
      w.add(s);
    });
    // tube houses on both sides
    const rowR = new THREE.Group();
    w.add(rowR);
    streetRow(rowR, -40, len + 40, -7.4);
    const rowL = new THREE.Group();
    w.add(rowL);
    streetRow(rowL, -40, len + 40, -7.4);
    rowL.rotation.y = Math.PI;
    rowL.position.set(len, 0, 0);
    for (let x = 10; x < len; x += 22) lamp(w, x, -6.4, e.lamps);
    // the Exciter with both riders in raincoats
    this.bike = new THREE.Group();
    w.add(this.bike);
    this.ex = makeExciter();
    this.ex.rotation.y = Math.PI;
    this.bike.add(this.ex);
    this.phu = makeChar('phu', e.opts.phu);
    this.su = makeChar('su', e.opts.su);
    [this.phu, this.su].forEach((r) => {
      r.poncho.visible = true;
      r.hood.visible = true;
      if (r.jacket) r.jacket.visible = false;
      this.bike.add(r.root);
      r.legs.forEach((l, i) => {
        l.rotation.x = -1.2;
        l.rotation.z = (i ? 1 : -1) * 0.25;
      });
      r.root.scale.setScalar(0.95);
    });
    this.phu.root.position.set(0.05, 0.4, 0);
    this.phu.root.rotation.y = Math.PI / 2;
    this.su.root.position.set(-0.55, 0.42, 0);
    this.su.root.rotation.y = Math.PI / 2;
    this.phu.arms.forEach((a) => (a.rotation.x = -1.25));
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.9),
      new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    w.add(this.shadow);
    // trucks overtake in the left lane (−z is left when riding toward +x)
    this.trucks = [0, 1].map(() => {
      const t = makeTruck();
      t.visible = false;
      w.add(t);
      return { g: t, on: false, x: 0, v: 0, warned: false, hit: false };
    });
    this.puddles = [];
    for (let x = 30; x < LEG1_END - 10; x += 16 + rnd() * 12) {
      const z = [-2.6, 0, 2.6][Math.floor(rnd() * 3)];
      const p = new THREE.Mesh(
        new THREE.CircleGeometry(1.1, 28),
        std(0x203550, { roughness: 0.03, metalness: 0.2, envMapIntensity: 1.3, transparent: true, opacity: 0.9 }),
      );
      p.rotation.x = -Math.PI / 2;
      p.scale.y = 0.6;
      p.position.set(x, 0.015, z);
      w.add(p);
      this.puddles.push({ x, z, hit: false });
    }
    const sign = (txt: string, x: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6), new THREE.MeshBasicMaterial({ map: signTex(txt, '#ffffff', '#1a2238'), toneMapped: false }));
      m.position.set(x, 6, 7.2);
      m.rotation.y = Math.PI;
      w.add(m);
    };
    sign('NOWZONE', LEG1_END + 4);
    // the bánh mì round: eleven people, then the gas station where two cô share the last loaf
    const coats = [0x4a6fd1, 0xd9a33a, 0x3f7d5c, 0xb04a7a, 0x8a6bd1, 0x2e8a57];
    const add = (x: number, o: Partial<Waiting> = {}) => {
      const p = makePerson(coats[this.people.length % coats.length], rnd() < 0.5);
      p.position.set(x, 0.14, 5.6);
      p.rotation.y = Math.PI;
      w.add(p);
      this.people.push({ g: p, x, got: false, station: false, extra: false, guard: false, ...o });
    };
    this.people = [];
    for (let i = 0; i < TUNING.breadFirst - 1; i++) add(LEG2_START + 16 + i * 13 + rnd() * 4);
    this.stationX = LEG2_START + 16 + (TUNING.breadFirst - 1) * 13 + 12;
    add(this.stationX - 0.6, { station: true });
    add(this.stationX + 0.6, { station: true });
    for (let i = 0; i < TUNING.breadExtra - 1; i++) add(this.stationX + 14 + i * 10, { extra: true });
    add(this.stationX + 14 + (TUNING.breadExtra - 1) * 10 + 6, { extra: true, guard: true });
    const gs = new THREE.Group();
    gs.position.set(this.stationX, 0, 8.5);
    w.add(gs);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 6), std(0xe8e8e8));
    roof.position.y = 4.6;
    gs.add(roof);
    const band = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.5, 6.1), glow(0xd8342c, 1.3));
    band.position.y = 4.3;
    gs.add(band);
    const under = new THREE.PointLight(0xffffff, 12, 12, 1.5);
    under.position.set(0, 3.8, -1);
    gs.add(under);
    sign('GÀ RÁN', this.people[this.people.length - 1].x + 2);
    Object.assign(this, { stage: 'prologue', stageT: 0, nextTruck: 6, stationDone: false, snapped: false, hearted: false });
    this.s = { x: 0, z: 1.3, vz: 0, speed: 0, wet: 0, shield: 0, bread: TUNING.breadFirst, given: 0, faceSplashes: 0, shielded: 0, missed: 0, lean: 0 };
    e.groundFn = (_x, z) => (Math.abs(z) > 5 ? 0.14 : 0);
  }

  start(e: Engine) {
    e.say([
      ['', 'Mưa to quá. Hai đứa mặc áo mưa, một đỏ một xanh. Áo của Su hơi dài.', 3.4],
      ['', 'Dưới mưa nho nhỏ, Su chủ động dang tay ra trước.', 3.2],
    ]);
    e.setObj('Ôm nhau dưới mưa nhỏ');
  }

  /** The Nowzone sign on the way there, then whoever is waiting for bread next. */
  target() {
    if (this.stage === 'ride') return this.tgt.set(LEG1_END + 4, 5, 3);
    if (this.stage === 'bread') {
      const next = this.people.find((p) => !p.got && !(p.extra && !this.stationDone));
      if (next) return this.tgt.set(next.x, 2.7, 5.6);
    }
    return null;
  }

  // ride mode does not use the walk-world queries
  clampXZ(_c: Walker, x: number, z: number): [number, number] {
    return [x, z];
  }
  groundAt() {
    return 0;
  }
  solid() {
    return false;
  }
  puddle() {
    return false;
  }
  puddleNear() {
    return false;
  }
  shelter() {
    return false;
  }
  checkpoint() {
    return null;
  }

  /** Slow down as the next waiting person comes up so a hand-over is never a split-second window. */
  private breadTargetSpeed() {
    const next = this.people.find((p) => !p.got && !(p.extra && !this.stationDone));
    if (!next) return TUNING.breadSpeed;
    const d = next.x - this.s.x;
    if (d <= 0 || d > TUNING.breadSlowDist) return TUNING.breadSpeed;
    return lerp(TUNING.breadSlowSpeed, TUNING.breadSpeed, clamp((d - 3) / (TUNING.breadSlowDist - 3), 0, 1));
  }

  private breadIcons() {
    return '🥖'.repeat(this.s.bread) || 'hết bánh';
  }

  update(e: Engine, dt: number) {
    const s = this.s;
    this.stageT += dt;
    let steer = (e.H('a.right') || e.H('b.right') || e.H('t.sr') ? 1 : 0) - (e.H('a.left') || e.H('b.left') || e.H('t.sl') ? 1 : 0) + e.joy.x;
    steer = clamp(steer, -1, 1);
    const shieldOn = e.H('a.down') || e.H('b.down') || e.H('a.jump') || e.H('b.jump') || e.H('t.shield');
    s.shield = lerp(s.shield, shieldOn ? 1 : 0, damp(10, dt));
    const moving = this.stage === 'ride' || this.stage === 'bread';
    if (moving) {
      s.speed = lerp(s.speed, this.stage === 'ride' ? TUNING.rideSpeed : this.breadTargetSpeed(), damp(this.stage === 'ride' ? 0.6 : 1.5, dt));
      s.vz = lerp(s.vz, steer * 4.2, damp(6, dt));
      s.z = clamp(s.z + s.vz * dt, -3.4, 3.6);
      s.lean = lerp(s.lean, -steer * 0.22, damp(5, dt));
    } else {
      s.speed = lerp(s.speed, 0, damp(1.2, dt));
      s.lean = lerp(s.lean, 0, damp(3, dt));
    }
    s.x += s.speed * dt;

    if (this.stage === 'prologue') {
      e.intensity = lerp(e.intensity, 0.5, damp(1, dt));
      if (this.stageT > 2.2 && !this.hearted) {
        this.hearted = true;
        e.hearts(s.x + 0.3, 2.6, s.z + 0.2, 12);
        e.say([['Phú', '(Anh xin hôn hai má, hôn trán em nha.)', 2.8]]);
      }
      if (this.stageT > 6.5) {
        this.stage = 'ride';
        this.stageT = 0;
        e.sayNow([
          ['Su', 'Anh chạy cẩn thận nha.', 2.4],
          ['Phú', 'Bám chắc nha. Xe lớn bên trái thì em quay mặt sang phải nè.', 3.6],
        ]);
        e.setObj('Tới Nowzone', 'giữ “Su quay mặt” khi xe lớn vượt bên trái');
      }
    }
    if (this.stage === 'ride') {
      e.intensity = lerp(e.intensity, 2, damp(0.8, dt));
      this.updTrucks(e, dt);
      this.puddles.forEach((p) => {
        if (!p.hit && s.x > p.x && s.x < p.x + 1.4 && Math.abs(s.z - p.z) < 1.1) {
          p.hit = true;
          e.splashAt(s.x, 0.3, s.z, 14);
          e.addTrauma(0.18);
          s.wet = Math.min(100, s.wet + TUNING.puddleRide);
        }
      });
      if (s.x > LEG1_END) {
        this.stage = 'dookki';
        this.stageT = 0;
        this.trucks.forEach((t) => ((t.on = false), (t.g.visible = false)));
        e.hud.warnL = false;
        e.card('Nowzone', 'Dookki, gà sốt chua, mì tương đen', 'Ăn xong thì mưa cũng đỡ hơn.');
      }
    }
    if (this.stage === 'dookki') {
      e.intensity = lerp(e.intensity, 0.5, damp(2, dt));
      if (this.stageT > 2.8) {
        s.x = LEG2_START;
        s.z = 1.3;
        s.speed = 0;
        e.camRig.pos.set(s.x - 7.2, 3.3, 1.4);
        this.stage = 'bread';
        this.stageT = 0;
        e.sayNow([
          ['', 'Mua mười hai ổ bánh mì, đi phát cho mọi người quanh đây.', 3.2],
          ['', 'Áp sát lề phải, chạy ngang ai đang chờ là trao được.', 3],
        ]);
        e.setObj('Trao bánh mì', 'áp sát lề phải');
      }
    }
    if (this.stage === 'bread') {
      e.intensity = lerp(e.intensity, 0.5, damp(1, dt));
      for (const p of this.people) {
        if (p.got || (p.extra && !this.stationDone)) continue;
        const inReach = Math.abs(s.x - p.x) < TUNING.breadReach && s.z > 1.9;
        // ride past someone and Su throws the loaf after them, so the round always finishes
        const passed = s.x > p.x + TUNING.breadMissPast;
        if ((inReach || passed) && s.bread > 0) {
          if (passed) {
            s.missed++;
            e.toast('Chạy lố rồi, Su ném bánh theo!');
          }
          if (p.station) {
            // two cô, one loaf left: they share it, and Su has an idea
            this.people.filter((q) => q.station).forEach((q) => this.give(e, q));
            s.bread = serveBread(s.bread, 'station');
            this.stationDone = true;
            e.sayNow([
              ['', 'Còn một ổ mà có hai cô. Hai cô chia đôi.', 2.8],
              ['Su', 'Mình mua thêm năm ổ nha anh, em trả chung cho vui!', 3.4],
              ['Phú', 'Ok luôn.', 1.8],
            ]);
            e.toast('Mua thêm năm ổ bánh mì');
          } else {
            this.give(e, p);
            s.bread = serveBread(s.bread, 'single');
            if (p.guard)
              e.sayNow([
                ['Su', 'Chú bảo vệ ơi, bánh mì nè!', 2.4],
                ['Phú', 'Mốt mình đi tìm các chú bảo vệ tiệm gà rán mà phát.', 3],
              ]);
          }
          break;
        }
      }
      if (this.people.every((p) => p.got) && this.stage === 'bread') {
        this.stage = 'end';
        this.stageT = 0;
      }
    }
    if (this.stage === 'end') {
      if (this.stageT > 2.6 && !this.snapped) {
        this.snapped = true;
        e.snapNext = true;
      }
      if (this.stageT > 4.6) e.finish();
    }
    e.hud.counter = this.stage === 'bread' || this.stage === 'end' ? `Bánh mì ${this.breadIcons()}` : this.stage === 'ride' ? 'Tới Nowzone' : '';
    e.hud.shield = s.shield > 0.6;
    e.hud.wetS = s.wet;
  }

  private give(e: Engine, p: Waiting) {
    p.got = true;
    this.s.given++;
    p.g.userData.arm.rotation.x = -2.4;
    e.hearts(p.x, 2.3, 5.4, 4);
  }

  private updTrucks(e: Engine, dt: number) {
    const s = this.s;
    this.trucks.forEach((t) => {
      if (!t.on) {
        if (s.x > 30 && s.x < LEG1_END - 40 && !this.trucks.some((o) => o.on) && (this.nextTruck -= dt) <= 0) {
          Object.assign(t, { on: true, x: s.x - TUNING.truckSpawnBack, v: s.speed + TUNING.truckOvertake, warned: false, hit: false });
          t.g.visible = true;
          this.nextTruck = 6 + Math.random() * 3;
        }
        return;
      }
      t.x += t.v * dt;
      t.g.position.set(t.x, 0, -2.7);
      t.g.rotation.y = Math.PI;
      t.g.userData.wheels.forEach((w) => (w.rotation.y += dt * 12));
      // time to impact uses the closing speed, measured to the same point the splash is tested at
      const gap = s.x - 0.5 - (t.x + 3);
      if (!t.warned && shouldWarn(gap, t.v - s.speed)) {
        t.warned = true;
        e.hud.warnL = true;
        e.toast(`Xe lớn bên trái! ${e.coarse ? 'Giữ “Su quay mặt”' : 'Giữ phím S (Su quay mặt)'}`, 2.2);
      }
      if (!t.hit && t.x + 3 > s.x - 0.5) {
        t.hit = true;
        e.hud.warnL = false;
        const hit = truckHit({ z: s.z, shielding: s.shield > 0.6 });
        if (hit.kind !== 'dodged') {
          e.splashAt(s.x, 0.8, -1, 40, 0xcfe2f8, 1.6);
          e.addTrauma(0.55);
          if (hit.kind === 'shielded') {
            s.shielded++;
            e.toast('Su quay mặt kịp rồi, không ướt mặt!');
            e.hearts(s.x + 0.5, 2.4, s.z, 3);
          } else {
            s.wet = Math.min(100, s.wet + hit.wet);
            s.faceSplashes++;
            e.hud.wetFx = 1.6;
            e.hitStop = 0.08;
            e.toast('Ướt mặt rồi! Lần sau nhớ quay mặt nha');
          }
        }
      }
      if (t.x > s.x + 60) {
        t.on = false;
        t.g.visible = false;
      }
    });
  }

  render(e: Engine, dt: number) {
    const s = this.s;
    this.bike.position.set(s.x, 0, s.z);
    this.bike.rotation.set(s.lean, 0, 0);
    this.ex.userData.wheels.forEach((w) => (w.rotation.z -= s.speed * dt * 3.2));
    this.shadow.position.set(s.x, 0.02, s.z);
    // Su turns her face right (toward +z) while shielding
    const sh = s.shield;
    this.su.head.rotation.y = -sh * 1.1;
    this.su.arms[0].rotation.x = lerp(-0.9, -1.6, sh);
    this.su.arms[1].rotation.x = lerp(-0.9, -0.4, sh);
    this.su.arms.forEach((a, i) => (a.rotation.z = (i ? -1 : 1) * 0.35));
    // the prologue hug: Phú turns round on the seat and they hold each other
    const hugK = this.stage === 'prologue' ? clamp((this.stageT - 0.6) / 1.2, 0, 1) * (1 - clamp((this.stageT - 5.4) / 1, 0, 1)) : 0;
    this.phu.root.rotation.y = lerp(Math.PI / 2, -Math.PI / 2, hugK);
    this.su.root.position.x = lerp(-0.55, -0.35, hugK);
    if (hugK > 0)
      [this.phu, this.su].forEach((r) =>
        r.arms.forEach((a, i) => {
          a.rotation.x = lerp(-1.25, -1.45, hugK);
          a.rotation.z = (i ? -1 : 1) * lerp(0.2, 0.65, hugK);
        }),
      );
    else this.phu.arms.forEach((a) => (a.rotation.x = -1.25));
    [this.phu, this.su].forEach((r) => {
      r.blink -= dt;
      r.eyes.forEach((el) => (el.scale.y = 1.3 * (r.blink < 0.12 ? 0.15 : 1)));
      if (r.blink < 0) r.blink = 2 + Math.random() * 3;
    });
    const still = this.stage === 'prologue' || this.stage === 'end';
    const fov = 40 + s.speed * 0.9;
    const behind = still ? new THREE.Vector3(s.x + 2.6, 2.4, s.z + 4.2) : new THREE.Vector3(s.x - 7.2, 3.3, s.z * 0.6 + 0.6);
    const look = still ? new THREE.Vector3(s.x, 1.4, s.z) : new THREE.Vector3(s.x + 6, 1.1, s.z * 0.8);
    e.camUpdate(dt, behind, look, still ? 1.6 : 5, still ? 36 : fov, s.lean * 0.35);
    e.updRain(dt, s.x + 10, s.z, 0.6);
    e.poolLamps(s.x + 6, 4);
    e.moonFollow(s.x + 4, 0);
  }

  stamps() {
    const s = this.s;
    return [
      { label: 'Ôm nhau dưới mưa nhỏ', earned: true },
      { label: 'Su quay mặt kịp (không ướt mặt)', earned: shieldStamp(s) },
      { label: 'Mười hai ổ, thêm năm ổ', earned: this.stationDone && s.missed === 0 && this.people.every((p) => p.got) },
    ];
  }
}
