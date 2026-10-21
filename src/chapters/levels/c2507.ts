/**
 * 25·07 — Sala, hoa và Trung Nguyên, in the order it really happened: stalling for time by the
 * water while the flowers are on the way (a photo at the giant flower, then one by the river),
 * the Dalat Hasfarm bouquet arrives, the confession, a trend photo, the rain, running to
 * Trung Nguyên, and Su opening her arms to hug first. Su wears the blue dress of their first day.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning';
import { SKY, type Engine, type Level, type Walker } from '../engine/runtime';
import { CHAPTER_META } from '../catalog';
import { FIT, swapDesigner } from '../engine/designer';
import {
  awning,
  clamp,
  ctex,
  damp,
  glow,
  lamp,
  lerp,
  makeScooter,
  makeTree,
  ol,
  rnd,
  setSeed,
  signTex,
  sprite,
  std,
  streakTex,
  tiled,
  tiles,
  toon,
  winTex,
  type Vehicle,
} from '../engine/kit';

type Phase = 'stroll' | 'courier' | 'confess' | 'answered' | 'trend' | 'rain' | 'hug';
interface Spot {
  x: number;
  z: number;
  label: string;
  line: string;
  done: boolean;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  icon: THREE.Mesh;
}

export class Chapter2507 implements Level {
  id = CHAPTER_META[1].id;
  date = CHAPTER_META[1].date;
  title = CHAPTER_META[1].title;
  memo = CHAPTER_META[1].memo;
  mode = 'walk' as const;
  postText = 'Câu giờ ở bông hoa khổng lồ, bó hoa Dalat Hasfarm, một câu "dạ đồng ý", rồi mưa. Dưới mái hiên Trung Nguyên, Su dang tay ôm Phú trước.';
  /** Respawn spot after a sneeze: under the awning (shelter needs z < -1.3). */
  spawnZ = -1.8;
  private len = 72;
  private cafeX = 64;
  private phase: Phase = 'stroll';
  private t = 0;
  private hug = 0;
  private photos = 0;
  private spots: Spot[] = [];
  private river!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private cafeLight!: THREE.PointLight;
  private courier!: Vehicle;
  private bouquet!: THREE.Group;
  private gotBouquet = false;
  private gaveBouquet = false;
  private snapped = false;
  private hearted = false;
  private hinted = false;
  private trendIn = 0;
  private readonly tgt = new THREE.Vector3();

  build(e: Engine) {
    e.newWorld();
    setSeed(29);
    e.intensity = 0;
    // an evening scene with dark outfits: a cool back light keeps Phú's jacket and hair readable
    e.look.rim = 1.3;
    (e.scene.background as THREE.Color).copy(SKY.EVENING);
    (e.scene.fog as THREE.FogExp2).color.copy(SKY.EVENING);
    (e.scene.fog as THREE.FogExp2).density = 0.022;
    const w = e.world,
      len = this.len;
    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(len + 60, 0.14, 9),
      std(0xb3a99a, { map: tiled(tiles, (len + 60) / 1.4, 9 / 1.4), roughness: 0.45, envMapIntensity: 0.5 }),
    );
    plaza.position.set(len / 2, 0.07, -1.5);
    plaza.receiveShadow = true;
    w.add(plaza);
    this.river = new THREE.Mesh(new THREE.PlaneGeometry(len + 120, 60), std(0x14233a, { roughness: 0.06, metalness: 0.4, envMapIntensity: 1.1 }));
    this.river.rotation.x = -Math.PI / 2;
    this.river.position.set(len / 2, -0.6, 33);
    w.add(this.river);
    const railM = std(0x30394a, { metalness: 0.7, roughness: 0.3 });
    for (let x = -30; x < len + 30; x += 2.2) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), railM);
      p.position.set(x, 0.6, 3);
      w.add(p);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 60, 0.08, 0.08), railM);
    rail.position.set(len / 2, 1.1, 3);
    w.add(rail);
    // far bank skyline, its lights streaking on the water
    for (let k = 0; k < 22; k++) {
      const h = 6 + rnd() * 22,
        bw = 4 + rnd() * 6,
        x = -20 + k * 6.2;
      const t = winTex(true);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(Math.round(bw / 1.5), Math.round(h / 2));
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(bw, h, 4),
        new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.55, 0.55, 0.62), toneMapped: false }),
      );
      b.position.set(x, h / 2 - 0.6, 58);
      w.add(b);
      if (rnd() < 0.5) {
        const r = new THREE.Mesh(
          new THREE.PlaneGeometry(bw * 0.6, 18),
          new THREE.MeshBasicMaterial({
            map: streakTex(rnd() < 0.5 ? '#ffcf7e' : '#a9d4ff'),
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        r.rotation.x = -Math.PI / 2;
        r.position.set(x, -0.58, 45);
        w.add(r);
      }
    }
    // the mall behind the promenade
    const mall = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 10), std(0x2a2f44, { roughness: 0.6 }));
    mall.position.set(24, 7, -16);
    w.add(mall);
    for (let k = 0; k < 10; k++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), glow(0xbfe0ff, 0.9));
      p.position.set(-2 + k * 5.8, 9, -10.9);
      w.add(p);
    }
    const ms = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 1.6),
      new THREE.MeshBasicMaterial({ map: signTex('THISO MALL', '#ffffff', '#1a2238'), toneMapped: false }),
    );
    ms.position.set(24, 12.5, -10.9);
    w.add(ms);
    for (let x = 4; x < len - 12; x += 8.5) {
      const t = makeTree();
      t.position.set(x + rnd() * 2, 0.14, -5.4);
      w.add(t);
    }
    [8, 22, 36, 50, 64].forEach((x) => lamp(w, x, 1.5, e.lamps));
    // the giant flower installation (first photo), petals around a glowing core
    const fl = new THREE.Group();
    fl.position.set(16, 0.14, -2.9);
    w.add(fl);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const pet = ol(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), toon(k % 2 ? 0xffb3cf : 0xfff0f5, { emissive: k % 2 ? 0x4a1028 : 0x302028 })), 1.02);
      pet.scale.set(0.55, 1.6, 0.25);
      pet.position.set(Math.cos(a) * 1.3, 2.4 + Math.sin(a) * 1.3, 0);
      pet.rotation.z = a - Math.PI / 2;
      fl.add(pet);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 16), glow(0xffd98a, 1.8));
    core.position.y = 2.4;
    fl.add(core);
    const cg = sprite(0xffc4dc, 0.7, 6);
    cg.position.y = 2.4;
    fl.add(cg);
    const stem = ol(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 10), toon(0x3f8f5a)));
    stem.position.y = 0.7;
    fl.add(stem);
    // the designer's flower replaces the code-built petals and core; toon-skinned (the PBR bloom blew out to white under
    // the pink light), and the glow sprite moves up behind the bloom
    void swapDesigner(e, fl, 'scene-sala-flower', { scale: 2.75, toon: true, after: () => (cg.position.y = 2.9) });
    const fpl = new THREE.PointLight(0xff9fc8, 10, 10, 1.6);
    fpl.position.set(16, 2.6, -1.3);
    w.add(fpl);
    // two photo spots: the giant flower, then the riverside
    const camIcon = ctex(64, 64, (g) => {
      g.fillStyle = '#ffd98a';
      g.beginPath();
      g.roundRect(6, 16, 52, 36, 8);
      g.fill();
      g.fillStyle = '#1a1a22';
      g.beginPath();
      g.arc(32, 34, 11, 0, 7);
      g.fill();
      g.fillStyle = '#ffd98a';
      g.fillRect(22, 9, 20, 9);
    });
    this.spots = [
      { x: 16, z: -1.1, label: 'bông hoa khổng lồ', line: 'Tấm này anh chụp xinh nè.' },
      { x: 31, z: 1.6, label: 'bờ sông', line: 'Gió thổi tóc em bay hết rồi… mà nhìn vẫn được ha.' },
    ].map((s) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 40), glow(0xffd98a, 1.6));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.x, 0.16, s.z);
      w.add(ring);
      const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: camIcon, transparent: true, toneMapped: false }));
      icon.position.set(s.x, 2.4, s.z);
      w.add(icon);
      return { ...s, done: false, ring, icon };
    });
    // Trung Nguyên café at the end, warm under its awning
    const cx = this.cafeX;
    const cafe = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), std(0x5a3a26));
    cafe.position.set(cx, 3, -6.6);
    w.add(cafe);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), glow(0xffcf8a, 1.4));
    win.position.set(cx, 1.5, -3.58);
    w.add(win);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({ map: signTex('TRUNG NGUYÊN', '#ffcf5a'), toneMapped: false }));
    sg.position.set(cx, 4.2, -3.56);
    w.add(sg);
    awning(w, cx - 4, cx + 4, -3.6, '#7a3b22', '#c98a54');
    this.cafeLight = new THREE.PointLight(0xffc56b, 14, 14, 1.4);
    this.cafeLight.position.set(cx, 2.4, -1.8);
    w.add(this.cafeLight);
    const cg2 = sprite(0xffc56b, 0.45, 9);
    cg2.position.set(cx, 1.6, -2.4);
    w.add(cg2);
    // the Dalat Hasfarm courier and the bouquet
    this.courier = makeScooter(0x2e8a57, 0x3f7d5c, false);
    this.courier.visible = false;
    w.add(this.courier);
    this.bouquet = new THREE.Group();
    const wrap = ol(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 12, 1, true), toon(0xf3e6d0, { side: THREE.DoubleSide })));
    wrap.rotation.x = Math.PI;
    this.bouquet.add(wrap);
    [0xfff6f0, 0xffffff, 0xffb3cf, 0xfff0a8, 0xf6f6ff, 0xff8fb0].forEach((c, i) => {
      const f = ol(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(c)));
      const a = (i / 6) * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.11, 0.28 + (i % 2) * 0.05, Math.sin(a) * 0.11);
      this.bouquet.add(f);
    });
    this.bouquet.visible = false;
    w.add(this.bouquet);
    // the designer's wrapped bouquet: its pivot is the stem tip, which sits at the bottom of the code-built wrap
    void swapDesigner(e, this.bouquet, 'tm-bouquet-wrapped', { scale: 1.1, offset: [0, -0.25, 0], toon: true });
    void swapDesigner(e, this.courier, 'tm-scooter', FIT.scooter);
    // the blue dress of their first day, whatever was picked in the studio
    e.walkInit(3, -1.2, { suLook: { top: '#7fb3ea' } });
    e.W.umbOpen = false;
    e.trafficInit(0);
    Object.assign(this, {
      phase: 'stroll',
      t: 0,
      hug: 0,
      photos: 0,
      gotBouquet: false,
      gaveBouquet: false,
      snapped: false,
      hearted: false,
      hinted: false,
      trendIn: 0,
    });
    e.groundFn = () => 0.14;
    e.hud.actLabel = 'Chụp hình';
  }

  start(e: Engine) {
    e.say([
      ['Phú', '(Hoa chưa tới… dắt em đi dạo câu giờ đã.)', 3.4],
      ['Su', 'Gió sông mát ghê.', 2.4],
    ]);
    e.setObj('Câu giờ chờ hoa', 'chụp hình ở bông hoa khổng lồ và bờ sông');
  }

  /** The next photo spot, the courier while the flowers arrive, then Trung Nguyên's door once it rains. */
  target() {
    if (this.phase === 'stroll') {
      const s = this.spots.find((s) => !s.done);
      return s ? this.tgt.set(s.x, 1.3, s.z) : null;
    }
    if (this.phase === 'courier') return this.tgt.set(this.courier.position.x, 1.8, this.courier.position.z);
    if (this.phase === 'rain') return this.tgt.set(this.cafeX - 1.5, 1.5, -2.2);
    return null;
  }

  clampXZ(_c: Walker, nx: number, nz: number): [number, number] {
    return [clamp(nx, 1, this.len - 1), clamp(nz, -5, 2.6)];
  }
  groundAt() {
    return 0.14;
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
  /** Dry until the rain starts; afterwards only Trung Nguyên's awning shelters. */
  shelter(c: Walker) {
    return this.phase !== 'rain' && this.phase !== 'hug' ? true : c.x > this.cafeX - 4 && c.x < this.cafeX + 4 && c.z < -1.3;
  }
  /** Trung Nguyên's awning is the only shelter once the rain starts, wherever on the promenade they are. */
  shelterSpots() {
    return [this.cafeX - 2];
  }
  checkpoint() {
    return this.phase === 'rain' ? this.cafeX - 2 : null;
  }

  private both(e: Engine, x: number, z: number, r: number) {
    return Math.hypot(e.W.P.x - x, e.W.P.z - z) < r && Math.hypot(e.W.S.x - x, e.W.S.z - z) < r;
  }

  update(e: Engine, dt: number) {
    const W = e.W;
    this.t += dt;
    e.walkControls(dt, this.phase === 'courier' || this.phase === 'confess' || this.phase === 'answered' || this.phase === 'hug');
    const act = e.take('a.act', 'b.act', 't.act');
    if (this.phase === 'stroll') {
      this.spots.forEach((s) => {
        s.icon.position.y = 2.4 + Math.sin(this.t * 2 + s.x) * 0.1;
        s.icon.lookAt(e.cam.position);
      });
      // photos go in order: the giant flower first, then the river
      const s = this.spots.find((s) => !s.done);
      if (s) {
        const inside = this.both(e, s.x, s.z, 1.25);
        s.ring.material.color.setScalar(inside ? 2.4 : 1.4).multiply(new THREE.Color(0xffd98a));
        if (inside && act) {
          s.done = true;
          this.photos++;
          e.flash();
          s.ring.visible = s.icon.visible = false;
          e.hearts((W.P.x + W.S.x) / 2, 2, (W.P.z + W.S.z) / 2, 4);
          e.toast(`Chụp ở ${s.label} · ${this.photos}/2`);
          e.sayNow([['Su', s.line, 2.6]]);
          if (this.photos === 2) {
            this.phase = 'courier';
            this.courier.visible = true;
            this.courier.position.set(W.P.x + 22, 0, 1.2);
            e.say([['Phú', 'Hoa Dalat Hasfarm tới rồi!', 2.6]]);
            e.setObj('Nhận hoa');
          } else e.setObj('Câu giờ chờ hoa', 'giờ ra bờ sông chụp thêm tấm nữa');
        } else if (inside && !this.hinted) {
          this.hinted = true;
          e.toast(e.keyHint('Chụp hình', 'F'));
        } else if (act && !inside) e.toast(`Đứng cả hai vào vòng tròn vàng ở ${s.label}`);
      }
    }
    if (this.phase === 'courier') {
      const tx = W.P.x + 1.4;
      this.courier.position.x = lerp(this.courier.position.x, tx, damp(1.6, dt));
      this.courier.userData.wheels.forEach((wh) => (wh.rotation.z += dt * 6));
      if (Math.abs(this.courier.position.x - tx) < 0.3 && !this.gotBouquet) {
        this.gotBouquet = true;
        this.bouquet.visible = true;
        this.phase = 'confess';
        e.hud.actLabel = 'Tỏ tình';
        e.setObj('Tỏ tình với Su', 'đứng cạnh Su rồi nói ra');
        e.toast(`Phú nhận bó hoa. Giờ nói ra thôi. ${e.keyHint('Tỏ tình', 'F')}`, 4);
      }
    }
    if (this.gotBouquet && this.courier.visible) {
      this.courier.position.x -= dt * 9;
      if (this.courier.position.x < W.P.x - 30) this.courier.visible = false;
    }
    if (this.phase === 'confess' || this.phase === 'answered') {
      // the pair stand face to face, turned a little toward the camera so both faces read
      const [left, right] = W.P.x < W.S.x ? [W.P, W.S] : [W.S, W.P];
      left.face = Math.PI / 2 - 0.55;
      right.face = -Math.PI / 2 + 0.55;
    }
    if (this.phase === 'confess' && act && !e.hud.choice) {
      e.choice('“Su ơi… cho anh làm bạn trai đồng hành với em nha?”', ['Đồng ý', 'Đồng ý luôn']);
    }
    if (this.phase === 'answered' && (this.trendIn -= dt) <= 0) {
      this.phase = 'trend';
      // both turn back to the promenade (east): the follower walks relative to the leader's heading
      W.P.face = W.S.face = Math.PI / 2;
      e.hud.actLabel = 'Chụp hình';
      e.setObj('Chụp hình đu trend với nhau', e.keyHint('Chụp hình', 'F'));
      e.toast(e.keyHint('Chụp hình', 'F'));
    }
    if (this.phase === 'trend' && act) {
      e.flash();
      e.hearts((W.P.x + W.S.x) / 2, 2.2, (W.P.z + W.S.z) / 2, 8);
      e.toast('Chụp hình đu trend xong!');
      this.phase = 'rain';
      W.umbOpen = true;
      W.umbrella.scale.setScalar(0.2);
      e.flash(0.35);
      e.addTrauma(0.2);
      e.toast('Mưa rồi! Che dù chạy tới Trung Nguyên', 3);
      e.setObj('Trú mưa ở Trung Nguyên', 'nắm tay đứng dưới đèn vàng');
      e.hud.actLabel = 'Chụp hình';
      e.sayNow([['Phú', 'Mưa! Vô dù nè.', 2.4]]);
    }
    if (this.phase === 'rain') {
      e.intensity = lerp(e.intensity, 1.6, damp(0.8, dt));
      e.wetness(dt);
      if (W.P.x > this.cafeX - 3.5 && W.S.x > this.cafeX - 3.5 && W.P.z < -1.3 && W.S.z < -1.3) {
        if (W.hold) {
          this.phase = 'hug';
          this.hug = 0;
          W.hold = false;
          e.sayNow([['', 'Su dang hai tay ôm Phú trước.', 3.2]]);
        } else if (!e.hud.toast) e.toast(`Đứng sát nhau, nắm tay dưới đèn vàng. ${e.keyHint('Nắm tay', 'R')}`, 3.4);
      }
    }
    if (this.phase === 'hug') {
      this.hug += dt;
      e.intensity = lerp(e.intensity, 0, damp(1.2, dt));
      const mx = (W.P.x + W.S.x) / 2;
      W.P.x = lerp(W.P.x, mx + 0.32, damp(3, dt));
      W.S.x = lerp(W.S.x, mx - 0.32, damp(3, dt));
      W.S.z = lerp(W.S.z, W.P.z, damp(3, dt));
      W.P.face = -Math.PI / 2;
      W.S.face = Math.PI / 2;
      if (this.hug > 1 && !this.hearted) {
        this.hearted = true;
        e.hearts(mx, 2, W.P.z, 10);
      }
      if (this.hug > 2.6 && !this.snapped) {
        this.snapped = true;
        e.snapNext = true;
      }
      if (this.hug > 4.6) e.finish();
    }
    if (this.bouquet.visible) {
      const c = this.gaveBouquet ? W.S : W.P;
      this.bouquet.position.set(c.x + Math.sin(c.rig.root.rotation.y) * 0.34, c.y + 1.0, c.z + Math.cos(c.rig.root.rotation.y) * 0.34);
    }
    e.hud.counter = this.phase === 'stroll' ? `Ảnh ${this.photos}/2` : this.phase === 'rain' || this.phase === 'hug' ? 'Trung Nguyên ☕' : 'Hoa ✿';
  }

  answer(e: Engine) {
    this.gaveBouquet = true;
    this.phase = 'answered';
    e.flash(0.3);
    e.hearts((e.W.P.x + e.W.S.x) / 2, 3, e.W.P.z, 18);
    e.addTrauma(0.15);
    e.sayNow([
      ['Su', 'Dạ… đồng ý.', 2.6],
      ['Phú', '(Bạn trai đồng hành với em. Yay.)', 2.6],
    ]);
    this.trendIn = 5.2;
  }

  render(e: Engine, dt: number) {
    const hugK = this.phase === 'hug' ? Math.min(1, this.hug / 1.2) : 0;
    e.walkRender(dt, {
      hug: hugK,
      hugS: hugK,
      hugP: Math.max(0, Math.min(1, (this.hug - 0.4) / 1.2)),
      lookUp: this.phase === 'confess' || this.phase === 'answered' ? -0.15 : 0,
    });
    const close = this.phase === 'confess' || this.phase === 'answered' ? 0.55 : this.phase === 'hug' ? Math.min(1, this.hug / 1.8) : 0;
    // during the hug the camera drops to eye level so the awning stays above the frame
    e.walkCamera(dt, { close, upMul: this.phase === 'hug' ? 0.5 : 1 });
    // evening → rainy night → warm under the café lamp during the hug
    const k = this.phase === 'hug' ? Math.min(1, this.hug / 3) : 0;
    const bg = e.scene.background as THREE.Color;
    bg.copy(SKY.EVENING)
      .lerp(this.phase === 'rain' || this.phase === 'hug' ? SKY.NIGHT : SKY.EVENING, 0.6)
      .lerp(SKY.WARM, k * 0.6);
    (e.scene.fog as THREE.FogExp2).color.copy(bg);
    this.cafeLight.intensity = 14 + k * 20;
    e.updRain(dt, e.camRig.look.x, e.camRig.look.z);
    e.poolLamps(e.camRig.look.x, 1);
    e.moonFollow(e.camRig.look.x, 0);
    this.river.material.color.setHSL(0.6, 0.45, 0.08 + Math.sin(performance.now() / 900) * 0.005);
  }

  stamps(e: Engine) {
    const W = e.W,
      avg = (W.P.wet + W.S.wet) / 2;
    return [
      { label: 'Câu giờ thành công (2 ảnh)', earned: this.photos === 2 },
      { label: 'Dù vàng (ướt dưới 30%)', earned: avg < TUNING.goldUmbrellaBelow },
      { label: 'Nắm tay', earned: W.stats.hold >= TUNING.holdStampSec },
      { label: 'Su dang tay ôm trước', earned: true },
    ];
  }
}
