/**
 * 07·07 — Che mưa đưa em về. Facts: it rained, bánh tráng + gà rán, Phú walked Su home under
 * his umbrella; the day Su started to love Phú. Walk the tube-house street, pick up the two
 * snacks (the gà rán sits on crates only Su's double jump reaches), reach the stall.
 */
import * as THREE from 'three';
import { TUNING, thunderMul } from '../tuning';
import { SKY, type Engine, type Level, type Walker } from '../engine/runtime';
import { CHAPTER_META } from '../catalog';
import { swapDesigner } from '../engine/designer';
import { awning, clamp, damp, glow, lamp, lerp, makeItem, ol, setSeed, sprite, std, streetRow, tiled, tiles, asphalt, toon, wires } from '../engine/kit';

const FRONT = -4.4;
type Box = [xa: number, xb: number, za: number, zb: number, h: number];

export class Chapter0707 implements Level {
  id = CHAPTER_META[0].id;
  date = CHAPTER_META[0].date;
  title = CHAPTER_META[0].title;
  memo = CHAPTER_META[0].memo;
  mode = 'walk' as const;
  postText = 'Một cây dù, hai đứa, bịch bánh tráng và hộp gà rán. Ngày Su bắt đầu thương Phú.';
  spawnZ = -2.6;
  private len = 86;
  private alley: [number, number] = [54, 57.5];
  private awn: [number, number][] = [
    [9, 15],
    [24, 30],
    [42, 48],
    [61, 66],
  ];
  private crates: Box[] = [
    [36.2, 37.6, -4.2, -3, TUNING.crateHeight],
    [37.9, 38.9, -4.2, -3.4, 0.7],
  ];
  private puddles: [number, number, number][] = [
    [20, 1.4, 1.1],
    [33, -1.7, 0.8],
    [40, 2.6, 1.3],
    [59, 1.2, 1],
  ];
  private goal = 78;
  private stools: [number, number][] = [];
  private items: { k: 'bt' | 'ga'; x: number; y: number; z: number; name: string; m: THREE.Group; got: boolean }[] = [];
  private thunderT = 10;
  private thunderAge = -1;
  private sat = 0;
  private snapped = false;
  private hintedCrate = false;
  private readonly tgt = new THREE.Vector3();

  build(e: Engine) {
    e.newWorld();
    setSeed(11);
    e.intensity = 1;
    // the shop fronts sit a step from the camera: softer bloom and lamp power keep them from washing out
    e.look.bloom = 0.25;
    e.look.lamp = 4;
    e.look.exposure = 0.85;
    e.look.moon = 0.8;
    (e.scene.background as THREE.Color).copy(SKY.NIGHT);
    (e.scene.fog as THREE.FogExp2).color.copy(SKY.NIGHT);
    (e.scene.fog as THREE.FogExp2).density = 0.028;
    const w = e.world,
      len = this.len;
    asphalt.repeat.set((len + 60) / 6, 1);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(len + 60, 6), std(0x1b2230, { map: asphalt, roughness: 0.32, metalness: 0.05, envMapIntensity: 0.55 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(len / 2, 0, 2.5);
    road.receiveShadow = true;
    w.add(road);
    for (let x = -30; x < len + 30; x += 3) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.12), glow(0xaab3c0, 0.7));
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 0.01, 2.4);
      w.add(d);
    }
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(len + 60, 0.14, 4),
      std(0x9aa3b4, { map: tiled(tiles, (len + 60) / 1.2, 3.9 / 1.2), roughness: 0.4, envMapIntensity: 0.45 }),
    );
    side.position.set(len / 2, 0.07, -2.45);
    side.receiveShadow = true;
    w.add(side);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(len + 60, 0.18, 0.2), std(0x6b7385));
    curb.position.set(len / 2, 0.09, -0.45);
    w.add(curb);
    streetRow(w, -30, len + 30, FRONT, {
      dim: 0.5,
      skip: [this.alley],
      signs: [
        [12, 'TẠP HÓA', '#62d6ff'],
        [27, 'CƠM TẤM', '#ffcf5a'],
        [45, 'TRÀ SỮA', '#c39bff'],
        [78, 'BÁNH TRÁNG', '#ffcf5a'],
      ],
    });
    const cols: [string, string][] = [
      ['#d9824b', '#f2c08e'],
      ['#3f8f7a', '#a6dcc8'],
      ['#c9455a', '#f2a6b4'],
      ['#4a6fd1', '#b2c6ff'],
    ];
    this.awn.forEach((a, i) => awning(w, a[0], a[1], FRONT, ...cols[i]));
    // the alley with a warm bulb at the back, where the bánh tráng is
    const af = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 6), std(0x20283a, { roughness: 0.3, envMapIntensity: 0.5 }));
    af.rotation.x = -Math.PI / 2;
    af.position.set(55.75, 0.14, -7.4);
    w.add(af);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.5, 8, 0.3), std(0x2a3246));
    back.position.set(55.75, 4, -10.4);
    w.add(back);
    const ab = sprite(0xffc27a, 0.9, 1.6);
    ab.position.set(55.75, 2.6, -10);
    w.add(ab);
    e.lamps.push(new THREE.Vector3(55.75, 2.6, -9.5));
    this.crates.forEach(([xa, xb, za, zb, h]) => {
      const c = ol(new THREE.Mesh(new THREE.BoxGeometry(xb - xa, h, zb - za), toon(0xa07a45)), 1.02);
      c.position.set((xa + xb) / 2, 0.14 + h / 2, (za + zb) / 2);
      c.castShadow = c.receiveShadow = true;
      w.add(c);
    });
    this.puddles.forEach(([x, z, r]) => {
      const p = new THREE.Mesh(
        new THREE.CircleGeometry(r, 32),
        std(0x203550, { roughness: 0.03, metalness: 0.2, envMapIntensity: 1.3, transparent: true, opacity: 0.9 }),
      );
      p.rotation.x = -Math.PI / 2;
      p.scale.y = 0.7;
      p.position.set(x, z < -0.45 ? 0.145 : 0.012, z);
      w.add(p);
    });
    [6, 20, 34, 48, 62, 76].forEach((x) => lamp(w, x, -3.9, e.lamps));
    wires(
      w,
      e.lamps.filter((l) => l.z < 0 && l.y > 4),
    );
    // the bánh tráng stall with two red plastic stools: the goal
    const gx = this.goal;
    const st = ol(new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 0.8), toon(0x7a5a3a)));
    st.position.set(gx - 0.6, 0.6, -3.4);
    w.add(st);
    for (let k = 0; k < 6; k++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.1), toon(0xf6d58a));
      bag.position.set(gx - 1.4 + k * 0.3, 1.17, -3.4);
      w.add(bag);
    }
    this.stools = [
      [gx - 0.9, -2.4],
      [gx + 0.1, -2.4],
    ];
    this.stools.forEach(([x, z]) => {
      // the code-built stool stands in until the designer's red stool arrives (same height and footprint, seat on the pavement)
      const stool = new THREE.Group();
      const s = ol(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 14), toon(0xd8342c)));
      s.position.y = 0.225;
      stool.add(s);
      stool.position.set(x, 0.135, z);
      w.add(stool);
      void swapDesigner(e, stool, 'tm-red-stool', { scale: 1.45, toon: true });
    });
    awning(w, gx - 3, gx + 3, FRONT, '#f2c14e', '#fff1c4');
    const warm = new THREE.PointLight(0xffc56b, 10, 12, 1.5);
    warm.position.set(gx, 2.3, -2.2);
    w.add(warm);
    this.items = (
      [
        { k: 'bt', x: 55.6, y: 0.65, z: -8.6, name: 'bánh tráng' },
        { k: 'ga', x: 36.9, y: 2.15, z: -3.6, name: 'gà rán' },
      ] as const
    ).map((it) => {
      const m = makeItem(it.k);
      // the rice-paper jar and the chicken bucket stand in for the snack bag and the fried chicken once loaded;
      // toon-skinned, because the lit PBR material washes out against the chapters' cel-shaded look
      void swapDesigner(e, m, it.k === 'bt' ? 'keepsake-rice-paper-jar' : 'tm-chicken-bucket', {
        scale: it.k === 'bt' ? 3.2 : 2.4,
        center: true,
        toon: true,
      });
      m.position.set(it.x, it.y, it.z);
      w.add(m);
      return { ...it, m, got: false };
    });
    e.walkInit(3, -2.6);
    e.trafficInit(2);
    this.thunderT = 10;
    this.thunderAge = -1;
    this.sat = 0;
    this.snapped = false;
    this.hintedCrate = false;
    e.groundFn = (_x, z) => (z < -0.45 ? 0.14 : 0);
  }

  /** The nearest snack still on the street, then the stall. */
  target(e: Engine) {
    if (this.sat > 0) return null;
    const mx = (e.W.P.x + e.W.S.x) / 2;
    let next: (typeof this.items)[number] | null = null;
    for (const it of this.items) if (!it.got && (!next || Math.abs(it.x - mx) < Math.abs(next.x - mx))) next = it;
    if (next) return this.tgt.set(next.x, next.y + 0.5, next.z);
    return this.tgt.set(this.goal - 0.6, 1.8, -3.2);
  }

  start(e: Engine) {
    e.say([
      ['Su', 'Mưa rồi… em quên đem dù.', 2.8],
      ['Phú', 'Đi chung dù với anh nha. Anh đưa em về.', 3.2],
    ]);
    e.setObj('Tới sạp bánh tráng', 'nhặt bánh tráng và gà rán');
  }

  clampXZ(c: Walker, nx: number, nz: number): [number, number] {
    nx = clamp(nx, 1, this.len - 1);
    nz = Math.min(nz, 4.6);
    const inA = (x: number) => x > this.alley[0] + 0.3 && x < this.alley[1] - 0.3;
    if (nz < -4.1) {
      if (!inA(nx)) {
        if (c.z < -4.1) nx = c.x;
        else nz = -4.1;
      }
      nz = Math.max(nz, -10);
    }
    if (c.z < -4.1 && nz < -4.1 && !inA(nx)) nx = c.x;
    return [nx, nz];
  }
  groundAt(c: Walker, x: number, z: number) {
    let g = z < -0.45 ? 0.14 : 0;
    for (const [xa, xb, za, zb, h] of this.crates)
      if (x > xa - 0.15 && x < xb + 0.15 && z > za - 0.15 && z < zb + 0.15 && c.y >= 0.14 + h - 0.3) g = Math.max(g, 0.14 + h);
    return g;
  }
  solid(c: Walker, x: number, z: number) {
    return this.crates.some(([xa, xb, za, zb, h]) => x > xa - 0.25 && x < xb + 0.25 && z > za - 0.25 && z < zb + 0.25 && c.y < 0.14 + h - 0.05);
  }
  puddle(x: number, z: number) {
    return this.puddles.some(([px, pz, r]) => (x - px) ** 2 / (r * r) + (z - pz) ** 2 / (r * r * 0.5) < 1);
  }
  puddleNear(x: number) {
    return this.puddles.some(([px, pz, r]) => Math.abs(px - x) < r + 0.6 && pz > -0.45);
  }
  shelter(c: Walker) {
    return (c.z < -1.8 && c.z > -4.5 && this.awn.some((a) => c.x > a[0] && c.x < a[1])) || (c.x > this.goal - 3 && c.x < this.goal + 3 && c.z < -1.6);
  }
  checkpoint(c: Walker) {
    const a = this.awn.find((a) => c.x > a[0] && c.x < a[1] && c.z < -1.8);
    return a ? (a[0] + a[1]) / 2 : null;
  }

  update(e: Engine, dt: number) {
    const W = e.W,
      done = this.sat > 0;
    e.walkControls(dt, done);
    // thunder: a flash, a 2 s warning, then heavy rain for a while
    this.thunderT -= dt;
    if (this.thunderT <= 0) {
      this.thunderT = TUNING.thunderDelay + TUNING.thunderLen + 13 + Math.random() * 5;
      this.thunderAge = 0;
      e.flash();
      e.addTrauma(0.25);
      e.toast('Sấm! Mưa to sắp đổ, vào mái hiên hoặc nắm tay đi chung dù', 2.4);
    }
    if (this.thunderAge >= 0) this.thunderAge += dt;
    e.intensity = lerp(e.intensity, done ? 0.6 : thunderMul(this.thunderAge), damp(1.5, dt));
    if (!this.hintedCrate && !done && !this.items[1].got && Math.max(W.P.x, W.S.x) > this.crates[0][0] - 3) {
      this.hintedCrate = true;
      e.say([['', this.crateHint(e), 4.4]]);
    }
    e.trafficUpd(dt, (W.P.x + W.S.x) / 2, [1.2, 3.4], !done);
    if (!done) e.wetness(dt);
    for (const it of this.items) {
      if (it.got) continue;
      it.m.rotation.y += dt * 1.6;
      it.m.position.y = it.y + Math.sin(performance.now() / 400 + it.x) * 0.08;
      for (const c of [W.P, W.S])
        if (Math.hypot(c.x - it.x, c.z - it.z) < 0.8 && Math.abs(c.y + 0.5 - it.y) < 0.9) {
          it.got = true;
          it.m.visible = false;
          e.splashAt(it.x, it.y, it.z, 14, 0xffe08a, 0.8);
          e.hearts(it.x, it.y + 0.3, it.z, 4);
          e.toast(`Nhặt được ${it.name} · ${this.items.filter((i) => i.got).length}/2`);
          if (it.k === 'ga') e.say([['Su', 'Gà rán! Hôm nay may ghê.', 2.4]]);
          break;
        }
    }
    if (!done && W.P.x > this.goal - 2.6 && W.S.x > this.goal - 2.6 && W.P.z < -1.6 && W.S.z < -1.6) {
      this.sat = 0.01;
      W.hold = false;
      e.say([
        ['Su', 'Bánh tráng với gà rán. Hợp ghê.', 3],
        ['Phú', 'Mai mưa nữa thì anh lại đưa em về.', 3.2],
      ]);
    }
    if (done) {
      this.sat += dt;
      const [s1, s2] = this.stools;
      (
        [
          [W.S, s1],
          [W.P, s2],
        ] as const
      ).forEach(([c, s]) => {
        c.x = lerp(c.x, s[0], damp(3, dt));
        c.z = lerp(c.z, s[1], damp(3, dt));
        c.face = Math.PI;
        c.vx = c.vz = 0;
        c.y = lerp(c.y, 0.38, damp(4, dt));
      });
      if (this.sat > 1.5 && !this.snapped) {
        this.snapped = true;
        e.snapNext = true;
      }
      if (this.sat > 4.2) e.finish();
    }
    e.hud.counter = `Bánh tráng & gà rán ${this.items.filter((i) => i.got).length}/2`;
  }

  /** Only Su can double jump, and holding hands switches it off: say how to reach the gà rán on the crates. */
  private crateHint(e: Engine) {
    if (e.opts.twoPlayer) return 'Hộp gà rán nằm trên thùng: Su nhảy hai lần liền mới với tới (phím / ).';
    return e.coarse
      ? 'Hộp gà rán nằm trên thùng: bấm “Đổi người” sang Su, buông tay, rồi “Nhảy” hai lần.'
      : 'Hộp gà rán nằm trên thùng: phím Q đổi sang Su, buông tay (R), rồi Space hai lần.';
  }

  render(e: Engine, dt: number) {
    e.walkRender(dt);
    e.walkCamera(dt, { close: this.sat > 0 ? Math.min(1, this.sat / 1.5) * 0.55 : 0 });
    const cx = (e.W.P.x + e.W.S.x) / 2;
    e.updRain(dt, e.camRig.look.x, e.camRig.look.z);
    e.poolLamps(cx, -1);
    e.moonFollow(cx, -1);
  }

  stamps(e: Engine) {
    const W = e.W,
      avg = (W.P.wet + W.S.wet) / 2;
    return [
      { label: 'Dù vàng (ướt dưới 30%)', earned: avg < TUNING.goldUmbrellaBelow },
      { label: 'Bánh tráng & gà rán', earned: this.items.every((i) => i.got) },
      { label: 'Nắm tay', earned: W.stats.hold >= TUNING.holdStampSec },
      { label: 'Khoác áo cho Su (như tối 20/09)', earned: W.jacket },
    ];
  }
}
