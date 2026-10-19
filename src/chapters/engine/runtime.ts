/**
 * The rain-chapter runtime: its own renderer and loop (the café hub is unmounted while a chapter
 * plays), action-based input, the walking couple with umbrella / hand-holding / jacket / jumps,
 * wetness, scooter traffic, pooled effects, rain, the trauma camera, and the postcard snapshot.
 * Levels (one file per chapter) plug in through the `Level` interface.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TUNING, afterSneeze, scooterHit, shouldWarn, speedFactor, wetStep, type Stamp } from '../tuning';
import { clampMarker } from './marker-clamp';
import { FIT, swapDesigner } from './designer';
import { OUTLINE, SHARED, clamp, damp, heartTex, lerp, makeChar, makeScooter, makeUmbrella, type Look, type Rig, type Vehicle } from './kit';

export type Mode = 'walk' | 'ride';
export type Line = [who: string, text: string, sec?: number];

/** One chapter. `e` is the running engine; levels keep their own state on `this`. */
export interface Level {
  id: string;
  date: string;
  title: string;
  memo: string;
  mode: Mode;
  postText: string;
  spawnZ: number;
  build(e: Engine): void;
  start(e: Engine): void;
  update(e: Engine, dt: number): void;
  render(e: Engine, dt: number): void;
  stamps(e: Engine): Stamp[];
  /** Walk-mode world queries. */
  clampXZ(c: Walker, x: number, z: number): [number, number];
  groundAt(c: Walker, x: number, z: number): number;
  solid(c: Walker, x: number, z: number): boolean;
  puddle(x: number, z: number): boolean;
  puddleNear(x: number, laneZ: number): boolean;
  shelter(c: Walker): boolean;
  checkpoint(c: Walker): number | null;
  /** Where the current objective is in the world (the HUD points an arrow at it), or null when there is nothing to point at. */
  target(e: Engine): THREE.Vector3 | null;
  /** A choice button was pressed (25·07's confession). */
  answer?(e: Engine, i: number): void;
}

/** The objective marker in CSS pixels of the canvas: a ring on the target, or an arrow on the screen edge when it is off-screen. */
export interface Marker {
  on: boolean;
  edge: boolean;
  x: number;
  y: number;
  /** Arrow direction in radians (0 = pointing right, clockwise on screen). */
  rot: number;
}

/** Per-chapter look knobs the runtime applies every frame (set in `Level.build`). */
export interface Look3d {
  /** Bloom strength. */
  bloom: number;
  /** Intensity of the pooled street-lamp lights. */
  lamp: number;
  /** Cool back light that keeps dark outfits readable against a dark ground; 0 = off. */
  rim: number;
  /** Tone-mapping exposure. */
  exposure: number;
  /** Moonlight intensity; the lit side of a pastel shop front is what washes out first. */
  moon: number;
}

const DEFAULT_LOOK: Look3d = { bloom: 0.55, lamp: 8, rim: 0, exposure: 1.08, moon: 1.1 };

export interface Walker {
  rig: Rig;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  kx: number;
  kz: number;
  wet: number;
  face: number;
  phase: number;
  ground: boolean;
  jumps: number;
  dbl: boolean;
  speed: number;
  sneeze: number;
  land: number;
  blocked: boolean;
}

/** What the React HUD renders; refreshed at 10 Hz plus on every event. */
export interface HudState {
  mode: Mode;
  wetP: number;
  wetS: number;
  umb: 'p' | 's' | null;
  jacket: boolean;
  hold: boolean;
  shield: boolean;
  objective: string;
  objectiveSub: string;
  counter: string;
  toast: string;
  talk: { who: string; text: string } | null;
  card: { date: string; title: string; memo: string } | null;
  warnL: boolean;
  warnR: boolean;
  flash: number;
  wetFx: number;
  choice: { prompt: string; options: string[] } | null;
  actLabel: string;
}

export interface Postcard {
  id: string;
  date: string;
  title: string;
  text: string;
  img: string | null;
  stamps: Stamp[];
}

export interface EngineOptions {
  twoPlayer: boolean;
  phu: Look;
  su: Look;
  onHud: (h: HudState) => void;
  onFinish: (p: Postcard) => void;
}

/** Keyboard → actions, same bindings as the design. 'a' is Phú (WASD), 'b' is Su (arrows). */
const KEYMAP: Record<string, string> = {
  KeyW: 'a.up',
  KeyS: 'a.down',
  KeyA: 'a.left',
  KeyD: 'a.right',
  Space: 'a.jump',
  KeyE: 'a.pass',
  KeyR: 'a.hold',
  KeyC: 'a.jacket',
  KeyF: 'a.act',
  KeyQ: 'swap',
  ArrowUp: 'b.up',
  ArrowDown: 'b.down',
  ArrowLeft: 'b.left',
  ArrowRight: 'b.right',
  Slash: 'b.jump',
  Period: 'b.pass',
  Comma: 'b.hold',
  KeyL: 'b.act',
};

const NIGHT = new THREE.Color(0x0b1424);
export const SKY = { NIGHT, EVENING: new THREE.Color(0x24203a), WARM: new THREE.Color(0x3a2618) };

export class Engine {
  readonly R: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 260);
  readonly coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  readonly reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private pmrem: THREE.PMREMGenerator;
  private moon: THREE.DirectionalLight;
  /** Only built for a level that asks for it (`look.rim`), so the other chapters do not pay for a third light. */
  private rim: THREE.DirectionalLight | null = null;
  private lampLights: THREE.PointLight[] = [];
  private raf = 0;
  private last = 0;
  private disposed = false;
  private ro: ResizeObserver;

  world = new THREE.Group();
  lamps: THREE.Vector3[] = [];
  intensity = 1;
  groundFn: (x: number, z: number) => number = () => 0;
  level!: Level;
  running = false;
  /** While true the level is frozen (no update, no HUD timers) but still rendered: the how-to card uses this. */
  paused = false;
  /** Objective marker, refreshed every frame; the React HUD reads it from its own rAF so it follows the camera smoothly. */
  readonly marker: Marker = { on: false, edge: false, x: 0, y: 0, rot: 0 };
  look: Look3d = { ...DEFAULT_LOOK };
  hitStop = 0;
  /** Game-time multiplier; only end-to-end tests on slow software renderers change it. */
  timeScale = 1;
  snapNext = false;
  private snap: string | null = null;

  /* input */
  private held = new Set<string>();
  private hits = new Set<string>();
  joy = { x: 0, y: 0 };

  /* walking couple */
  W = {
    P: null as unknown as Walker,
    S: null as unknown as Walker,
    lead: null as unknown as Walker,
    umb: 'p' as 'p' | 's',
    hold: false,
    jacket: false,
    chk: 0,
    umbrella: null as unknown as THREE.Group,
    umbOpen: true,
    stats: { pass: 0, hold: 0, sneeze: 0, cold: false, saidHold: false },
  };
  traffic: { g: Vehicle; x: number; z: number; v: number; on: boolean; cd: number; warned: boolean }[] = [];

  /* effects */
  private fx = {
    ripples: [] as { m: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; t: number }[],
    splash: [] as { m: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>; v: THREE.Vector3; t: number }[],
    hearts: [] as { m: THREE.Sprite; v: THREE.Vector3; t: number }[],
  };
  private rain!: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private rainPos!: Float32Array;
  private rainVel!: Float32Array;
  private readonly nRain: number;

  /* camera rig */
  camRig = { pos: new THREE.Vector3(0, 6, 10), look: new THREE.Vector3(), trauma: 0, t: 0, fov: 40, roll: 0 };

  /* HUD */
  hud: HudState = {
    mode: 'walk',
    wetP: 0,
    wetS: 0,
    umb: 'p',
    jacket: false,
    hold: false,
    shield: false,
    objective: '',
    objectiveSub: '',
    counter: '',
    toast: '',
    talk: null,
    card: null,
    warnL: false,
    warnR: false,
    flash: 0,
    wetFx: 0,
    choice: null,
    actLabel: 'Chụp hình',
  };
  private toastT = 0;
  private talkQ: Line[] = [];
  private talkT = 0;
  private cardT = 0;
  private hudT = 0;
  private vw = 1;
  private vh = 1;
  private readonly tv = new THREE.Vector3();
  private readonly tc = new THREE.Vector3();

  constructor(
    private canvas: HTMLCanvasElement,
    readonly opts: EngineOptions,
  ) {
    this.nRain = this.coarse || this.reduce ? 900 : 2200;
    const R = (this.R = new THREE.WebGLRenderer({ canvas, antialias: !this.coarse, powerPreference: 'high-performance' }));
    R.setPixelRatio(Math.min(devicePixelRatio, this.coarse ? 1.4 : 1.8));
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.08;
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = (this.pmrem = new THREE.PMREMGenerator(R));
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    this.scene.background = NIGHT.clone();
    this.scene.fog = new THREE.FogExp2(0x0b1424, 0.028);
    this.composer = new EffectComposer(R);
    this.composer.addPass(new RenderPass(this.scene, this.cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.88);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.scene.add(new THREE.HemisphereLight(0x8098c8, 0x1a1c26, 0.9));
    const moon = (this.moon = new THREE.DirectionalLight(0xa9c2ff, 1.1));
    moon.castShadow = true;
    moon.shadow.mapSize.set(this.coarse ? 1024 : 2048, this.coarse ? 1024 : 2048);
    Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.03;
    this.scene.add(moon, moon.target);
    // a small pool of real lights follows the nearest street lamps (cheap on phones)
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffb66e, 0, 12, 1.6);
      this.scene.add(l);
      this.lampLights.push(l);
    }
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    addEventListener('keydown', this.onKey);
    addEventListener('keyup', this.onKeyUp);
    addEventListener('blur', this.onBlur);
  }

  /* ===================== lifecycle ===================== */
  play(level: Level) {
    this.talkQ = [];
    this.talkT = 0;
    Object.assign(this.hud, { talk: null, warnL: false, warnR: false, choice: null, counter: '', toast: '', actLabel: 'Chụp hình' });
    this.level = level;
    this.snap = null;
    this.look = { ...DEFAULT_LOOK };
    level.build(this);
    if (this.rim) {
      this.scene.remove(this.rim, this.rim.target);
      this.rim.dispose();
      this.rim = null;
    }
    if (this.look.rim > 0) {
      this.rim = new THREE.DirectionalLight(0xb7cdff, 0);
      this.scene.add(this.rim, this.rim.target);
    }
    this.hud.mode = level.mode;
    this.resize();
    const p = level.mode === 'ride' ? new THREE.Vector3(-8, 4, 2) : new THREE.Vector3(this.W.P.x, 7, 10);
    this.camRig.pos.copy(p);
    this.camRig.look.set(p.x + 4, 1, 0);
    this.card(level.date, level.title, level.memo);
    level.start(this);
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKey);
    removeEventListener('keyup', this.onKeyUp);
    removeEventListener('blur', this.onBlur);
    this.ro.disconnect();
    this.disposeWorld();
    this.scene.environment?.dispose();
    this.pmrem.dispose();
    this.moon.dispose();
    this.moon.shadow.map?.dispose();
    this.rim?.dispose();
    this.lampLights.forEach((l) => l.dispose());
    this.composer.passes.forEach((p) => p.dispose?.());
    this.composer.dispose();
    this.R.dispose();
    // the canvas is thrown away by the caller, so the GPU context can be released right away
    this.R.forceContextLoss();
  }

  private resize() {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.vw = w;
    this.vh = h;
    this.R.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  /** True while `world` is still the live world of a running engine: a late model load checks this before it adds anything. */
  isCurrent(world: THREE.Object3D) {
    return !this.disposed && this.world === world;
  }

  private disposeWorld() {
    this.scene.remove(this.world);
    this.world.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const ms = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      ms.forEach((mat) => {
        if (mat === OUTLINE) return;
        const map = (mat as THREE.MeshBasicMaterial).map;
        if (map && !SHARED.has(map)) map.dispose();
        mat.dispose();
      });
    });
  }

  /** Fresh empty world for a chapter, with its effect pools and rain. */
  newWorld() {
    this.disposeWorld();
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.lamps = [];
    this.makeFx();
    this.makeRain();
  }

  /* ===================== input ===================== */
  private onKey = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (!k || !this.running || this.paused || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = document.activeElement as HTMLElement | null;
    if (t?.tagName === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter')) return;
    e.preventDefault();
    if (!this.held.has(k)) this.hits.add(k);
    this.held.add(k);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (k) this.held.delete(k);
  };
  private onBlur = () => this.releaseInput();
  /** Forgets every held key and the stick (lost focus, or a card opened over the game). */
  releaseInput() {
    this.held.clear();
    this.hits.clear();
    this.joy.x = this.joy.y = 0;
  }
  /** Freezes or resumes the level; the picture keeps rendering either way. */
  pause(on: boolean) {
    this.paused = on;
    if (on) this.releaseInput();
  }
  /** Touch buttons: press = down, release = up. Actions are prefixed 't.'. */
  touch(action: string, down: boolean) {
    const k = 't.' + action;
    if (down) {
      if (this.paused) return;
      if (!this.held.has(k)) this.hits.add(k);
      this.held.add(k);
    } else this.held.delete(k);
  }
  H = (k: string) => this.held.has(k);
  take = (...ks: string[]) => {
    let r = false;
    for (const k of ks)
      if (this.hits.has(k)) {
        this.hits.delete(k);
        r = true;
      }
    return r;
  };
  private axis(p: string): [number, number] {
    return [(this.H(p + '.right') ? 1 : 0) - (this.H(p + '.left') ? 1 : 0), (this.H(p + '.down') ? 1 : 0) - (this.H(p + '.up') ? 1 : 0)];
  }

  /* ===================== HUD helpers ===================== */
  /** "Bấm “Nắm tay” (phím R)" on a keyboard, just the button name on a touch screen. */
  keyHint(label: string, key: string) {
    return this.coarse ? `Bấm “${label}”` : `Bấm “${label}” (phím ${key})`;
  }
  toast(m: string, s = 2.6) {
    this.hud.toast = m;
    this.toastT = s;
    this.pushHud();
  }
  say(lines: Line[]) {
    this.talkQ.push(...lines);
    if (this.talkT <= 0) this.nextTalk();
  }
  /** Drops whatever is still queued or on screen, then says these lines (a new beat replaces the old chatter). */
  sayNow(lines: Line[]) {
    this.talkQ = [];
    this.talkT = 0;
    this.hud.talk = null;
    this.say(lines);
  }
  private nextTalk() {
    const l = this.talkQ.shift();
    if (!l) {
      this.hud.talk = null;
      this.talkT = 0;
    } else {
      this.hud.talk = { who: l[0], text: l[1] };
      this.talkT = l[2] ?? 3.2;
    }
    this.pushHud();
  }
  card(date: string, title: string, memo: string) {
    this.hud.card = { date, title, memo };
    this.cardT = 2.6;
    this.pushHud();
  }
  setObj(t: string, sub = '') {
    this.hud.objective = t;
    this.hud.objectiveSub = sub;
    this.pushHud();
  }
  flash(s = 0.4) {
    if (!this.reduce) this.hud.flash = s;
  }
  choice(prompt: string, options: string[]) {
    this.hud.choice = { prompt, options };
    this.pushHud();
  }
  /** Called by the HUD when a choice button is pressed. */
  answer(i: number) {
    this.hud.choice = null;
    this.level.answer?.(this, i);
    this.pushHud();
  }
  private pushHud() {
    this.opts.onHud({ ...this.hud });
  }

  /* ===================== effects ===================== */
  private makeFx() {
    const fx = (this.fx = { ripples: [], splash: [], hearts: [] } as typeof this.fx);
    const rg = new THREE.RingGeometry(0.05, 0.09, 24);
    for (let k = 0; k < 50; k++) {
      const r = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xcfe2f8, transparent: true, opacity: 0, depthWrite: false }));
      r.rotation.x = -Math.PI / 2;
      this.world.add(r);
      fx.ripples.push({ m: r, t: 1 });
    }
    const sg = new THREE.SphereGeometry(0.05, 6, 4);
    for (let k = 0; k < 140; k++) {
      const s = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xcfe2f8, transparent: true, opacity: 0.9 }));
      s.visible = false;
      this.world.add(s);
      fx.splash.push({ m: s, v: new THREE.Vector3(), t: 0 });
    }
    for (let k = 0; k < 30; k++) {
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, toneMapped: false }));
      h.visible = false;
      this.world.add(h);
      fx.hearts.push({ m: h, v: new THREE.Vector3(), t: 0 });
    }
  }
  private ripple(x: number, y: number, z: number) {
    const r = this.fx.ripples.find((r) => r.t >= 1);
    if (!r) return;
    r.m.position.set(x, y, z);
    r.t = 0;
  }
  splashAt(x: number, y: number, z: number, n: number, col: number = 0xcfe2f8, pow = 1) {
    for (let k = 0; k < n; k++) {
      const s = this.fx.splash.find((s) => !s.m.visible);
      if (!s) return;
      s.m.visible = true;
      s.m.material.color.set(col);
      s.m.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
      s.v.set((Math.random() - 0.5) * 3 * pow, (2 + Math.random() * 3) * pow, (Math.random() - 0.5) * 3 * pow);
      s.t = 0.9;
    }
  }
  hearts(x: number, y: number, z: number, n: number) {
    for (let k = 0; k < n; k++) {
      const h = this.fx.hearts.find((h) => !h.m.visible);
      if (!h) return;
      h.m.visible = true;
      h.m.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.6);
      h.v.set((Math.random() - 0.5) * 0.5, 1 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
      h.t = 1.6 + Math.random() * 0.6;
      h.m.scale.setScalar(0.01);
    }
  }
  private updFx(dt: number) {
    this.fx.ripples.forEach((r) => {
      if (r.t < 1) {
        r.t += dt * 1.7;
        r.m.scale.setScalar(1 + r.t * 3.5);
        r.m.material.opacity = (1 - r.t) * 0.2;
      }
    });
    this.fx.splash.forEach((s) => {
      if (!s.m.visible) return;
      s.t -= dt;
      s.v.y -= 12 * dt;
      s.m.position.addScaledVector(s.v, dt);
      if (s.t <= 0 || s.m.position.y < 0) s.m.visible = false;
    });
    this.fx.hearts.forEach((h) => {
      if (!h.m.visible) return;
      h.t -= dt;
      h.m.position.addScaledVector(h.v, dt);
      const k = Math.min(1, (2.2 - h.t) * 4);
      const sc = 0.35 * (k < 1 ? 1 - Math.pow(1 - k, 3) * 1.2 + Math.sin(k * Math.PI) * 0.25 : 1);
      h.m.scale.setScalar(Math.max(0.01, sc));
      h.m.material.opacity = Math.min(1, h.t * 1.5);
      if (h.t <= 0) h.m.visible = false;
    });
  }

  /* ===================== rain ===================== */
  private makeRain() {
    const n = this.nRain;
    const geo = new THREE.BufferGeometry();
    this.rainPos = new Float32Array(n * 6);
    this.rainVel = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      this.rainVel[k] = 18 + Math.random() * 8;
      const x = Math.random() * 48 - 24,
        y = Math.random() * 16,
        z = Math.random() * 24 - 12;
      this.rainPos.set([x, y, z, x, y + 0.6, z], k * 6);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xb4cdee, transparent: true, opacity: 0.36, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.world.add(this.rain);
  }
  updRain(dt: number, cx: number, cz: number, wind = 0) {
    const inten = this.intensity;
    const n = Math.round(this.nRain * clamp((inten / 2.2) * 1.5, 0, 1));
    this.rain.geometry.setDrawRange(0, n * 2);
    this.rain.visible = n > 0;
    if (!n) return;
    const sp = this.reduce ? 0.45 : 1,
      sl = 0.05 + wind * 0.35,
      P = this.rainPos,
      V = this.rainVel;
    for (let k = 0; k < n; k++) {
      const o = k * 6;
      let y = P[o + 1] - V[k] * dt * sp,
        x = P[o] + wind * V[k] * dt * 0.2 * sp,
        z = P[o + 2];
      if (y < 0) {
        if (Math.random() < 0.14) this.ripple(x, this.groundFn(x, z) + 0.01, z);
        y += 16;
        x = cx - 24 + Math.random() * 48;
        z = cz - 12 + Math.random() * 24;
      }
      if (x < cx - 24) x += 48;
      else if (x > cx + 24) x -= 48;
      P[o] = x;
      P[o + 1] = y;
      P[o + 2] = z;
      P[o + 3] = x + sl;
      P[o + 4] = y + 0.6;
      P[o + 5] = z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    this.rain.material.opacity = 0.22 + 0.16 * Math.min(1, inten);
  }
  poolLamps(cx: number, cz: number) {
    const s = this.lamps.map((p) => [p, (p.x - cx) ** 2 + (p.z - cz) ** 2] as const).sort((a, b) => a[1] - b[1]);
    this.lampLights.forEach((l, i) => {
      const e = s[i];
      if (e) {
        l.position.copy(e[0]);
        l.intensity = this.look.lamp;
      } else l.intensity = 0;
    });
  }
  moonFollow(x: number, z: number) {
    this.moon.position.set(x - 8, 16, z + 10);
    this.moon.target.position.set(x, 0, z);
    this.moon.intensity = this.look.moon;
    if (this.rim) {
      this.rim.intensity = this.look.rim;
      this.rim.position.set(x + 4, 7, z - 9);
      this.rim.target.position.set(x, 0.9, z);
    }
  }

  /* ===================== camera ===================== */
  addTrauma(a: number) {
    if (!this.reduce) this.camRig.trauma = clamp(this.camRig.trauma + a, 0, 1);
  }
  camUpdate(dt: number, wantPos: THREE.Vector3, wantLook: THREE.Vector3, rate = 4, fov = 40, roll = 0) {
    const c = this.camRig,
      cam = this.cam;
    c.pos.lerp(wantPos, damp(rate, dt));
    c.look.lerp(wantLook, damp(rate * 1.2, dt));
    c.fov = lerp(c.fov, fov, damp(3, dt));
    c.roll = lerp(c.roll, roll, damp(4, dt));
    c.trauma = Math.max(0, c.trauma - 1.3 * dt);
    c.t += dt;
    const s = c.trauma * c.trauma;
    cam.position.copy(c.pos).add(new THREE.Vector3(Math.sin(c.t * 37) * 0.35 * s, Math.sin(c.t * 29 + 1) * 0.25 * s, 0));
    cam.lookAt(c.look);
    cam.rotateZ(c.roll + Math.sin(c.t * 23) * 0.03 * s);
    // portrait phones get a wider lens so both people stay in frame
    const f = cam.aspect < 1 ? c.fov + 12 : cam.aspect < 1.4 ? c.fov + 5 : c.fov;
    if (Math.abs(cam.fov - f) > 0.01) {
      cam.fov = f;
      cam.updateProjectionMatrix();
    }
  }

  /* ===================== walking couple ===================== */
  private mkWalker(rig: Rig, x: number, z: number, speed: number, dbl: boolean): Walker {
    return {
      rig,
      x,
      z,
      y: 0.14,
      vx: 0,
      vz: 0,
      vy: 0,
      kx: 0,
      kz: 0,
      wet: 0,
      face: Math.PI / 2,
      phase: 0,
      ground: true,
      jumps: 0,
      dbl,
      speed,
      sneeze: 0,
      land: 0,
      blocked: false,
    };
  }
  walkInit(x: number, z: number, o: { suLook?: Partial<Look> } = {}) {
    const pr = makeChar('phu', this.opts.phu),
      sr = makeChar('su', { ...this.opts.su, ...o.suLook });
    [pr, sr].forEach((r) => {
      this.world.add(r.root);
      this.world.add(r.shadow);
    });
    const W = this.W;
    W.P = this.mkWalker(pr, x + 0.7, z, 3.6, false);
    W.S = this.mkWalker(sr, x, z + 0.4, 3.9, true);
    W.lead = W.P;
    W.umb = 'p';
    W.hold = false;
    W.jacket = false;
    W.chk = x;
    W.stats = { pass: 0, hold: 0, sneeze: 0, cold: false, saidHold: false };
    W.umbrella = makeUmbrella();
    this.world.add(W.umbrella);
    void swapDesigner(this, W.umbrella, 'tm-umbrella-open', FIT.umbrella);
    W.umbOpen = true;
  }
  other = (c: Walker) => (c === this.W.P ? this.W.S : this.W.P);
  holder = () => (this.W.umb === 'p' ? this.W.P : this.W.S);
  dist = () => Math.hypot(this.W.P.x - this.W.S.x, this.W.P.z - this.W.S.z);
  covered(c: Walker) {
    if (this.level.shelter(c)) return true;
    const h = this.holder();
    if (!this.W.umbOpen) return false;
    if (c === h || this.W.hold) return true;
    return Math.hypot(c.x - h.x, c.z - h.z) < 0.95;
  }
  private physics(c: Walker, dt: number) {
    const L = this.level;
    let nx = c.x + (c.vx + c.kx) * dt,
      nz = c.z + (c.vz + c.kz) * dt;
    c.kx *= Math.pow(0.02, dt);
    c.kz *= Math.pow(0.02, dt);
    [nx, nz] = L.clampXZ(c, nx, nz);
    c.blocked = false;
    if (L.solid(c, nx, c.z)) {
      nx = c.x;
      c.blocked = true;
    }
    if (L.solid(c, nx, nz)) {
      nz = c.z;
      c.blocked = true;
    }
    c.x = nx;
    c.z = nz;
    c.vy -= TUNING.gravity * dt;
    c.y += c.vy * dt;
    const g = L.groundAt(c, c.x, c.z);
    if (c.y <= g) {
      if (!c.ground) {
        c.land = 0.18;
        if (c.vy < -4 && L.puddle(c.x, c.z)) this.splashAt(c.x, g + 0.05, c.z, 10);
      }
      c.y = g;
      c.vy = 0;
      c.ground = true;
      c.jumps = 0;
    } else if (c.y > g + 0.03) c.ground = false;
    const sp = Math.hypot(c.vx, c.vz);
    if (sp > 0.2) c.face = Math.atan2(c.vx, c.vz);
    c.phase += sp * dt * 3;
  }
  moveW(c: Walker, ix: number, iz: number, dt: number) {
    const m = Math.hypot(ix, iz);
    if (m > 1) {
      ix /= m;
      iz /= m;
    }
    const W = this.W;
    const sp =
      (W.hold ? TUNING.holdSpeed : c.speed) * speedFactor({ holding: W.hold, distance: this.dist(), inPuddle: c.ground && this.level.puddle(c.x, c.z) });
    const acc = c.ground ? 14 : 6;
    c.vx += (ix * sp - c.vx) * Math.min(1, acc * dt);
    c.vz += (iz * sp - c.vz) * Math.min(1, acc * dt);
    this.physics(c, dt);
  }
  jump(c: Walker) {
    if (c.ground) {
      c.vy = TUNING.jumpV;
      c.ground = false;
      c.jumps = 1;
      c.land = -0.12;
    } else if (c.dbl && c.jumps === 1 && !this.W.hold) {
      c.vy = TUNING.doubleJumpV;
      c.jumps = 2;
      this.splashAt(c.x, c.y + 0.2, c.z, 6, 0xffe7f0, 0.5);
    }
  }
  walkControls(dt: number, locked: boolean) {
    const W = this.W,
      joy = this.joy,
      two = this.opts.twoPlayer;
    const [ax, az] = this.axis('a'),
      [bx, bz] = this.axis('b');
    if (locked) {
      this.moveW(W.P, 0, 0, dt);
      this.moveW(W.S, 0, 0, dt);
      return;
    }
    if (this.take('swap', 't.swap') && !two) {
      W.lead = this.other(W.lead);
      this.toast('Đang điều khiển ' + (W.lead === W.P ? 'Phú' : 'Su'));
    }
    if (this.take('a.pass', 'b.pass', 't.pass')) this.passUmb();
    if (this.take('a.hold', 'b.hold', 't.hold')) this.toggleHold();
    if (this.take('a.jacket', 't.jacket')) this.giveJacket();
    if (W.hold) {
      this.moveW(W.lead, ax + bx + joy.x, az + bz + joy.y, dt);
      const f = this.other(W.lead),
        side = W.lead === W.P ? -0.62 : 0.62;
      f.x += (W.lead.x + side - f.x) * Math.min(1, dt * 10);
      f.z += (W.lead.z + 0.05 - f.z) * Math.min(1, dt * 10);
      [f.x, f.z] = this.level.clampXZ(f, f.x, f.z);
      f.vx = W.lead.vx;
      f.vz = W.lead.vz;
      f.y = W.lead.y;
      f.vy = W.lead.vy;
      f.ground = W.lead.ground;
      f.face = W.lead.face;
      f.phase = W.lead.phase + Math.PI;
      if (this.take('a.jump', 'b.jump', 't.jump')) {
        this.jump(W.lead);
        f.vy = W.lead.vy;
      }
    } else if (two) {
      this.moveW(W.P, ax + (W.lead === W.P ? joy.x : 0), az + (W.lead === W.P ? joy.y : 0), dt);
      this.moveW(W.S, bx + (W.lead === W.S ? joy.x : 0), bz + (W.lead === W.S ? joy.y : 0), dt);
      if (this.take('a.jump')) this.jump(W.P);
      if (this.take('b.jump')) this.jump(W.S);
      if (this.take('t.jump')) this.jump(W.lead);
    } else {
      this.moveW(W.lead, ax + bx + joy.x, az + bz + joy.y, dt);
      if (this.take('a.jump', 'b.jump', 't.jump')) this.jump(W.lead);
      // the other one follows a step behind and hops over what blocks them
      const f = this.other(W.lead),
        tx = W.lead.x - Math.sin(W.lead.face) * 1.05,
        tz = W.lead.z - Math.cos(W.lead.face) * 1.05 + (f === W.S ? 0.35 : -0.35),
        dx = tx - f.x,
        dz = tz - f.z,
        d = Math.hypot(dx, dz),
        far = Math.hypot(W.lead.x - f.x, W.lead.z - f.z);
      if (d > 0.35 && !(W.lead.y > 1 && far < 2.5)) {
        this.moveW(f, dx / d, dz / d, dt);
        if (f.blocked && f.ground) this.jump(f);
      } else this.moveW(f, 0, 0, dt);
    }
    if (W.hold) W.stats.hold += dt;
  }
  private passUmb() {
    const W = this.W;
    if (this.dist() < TUNING.holdRange) {
      W.umb = W.umb === 'p' ? 's' : 'p';
      W.stats.pass++;
      this.toast((W.umb === 'p' ? 'Phú' : 'Su') + ' cầm dù');
      if (W.stats.pass === 3) this.say([['Su', 'Nhường qua nhường lại hoài à.', 2.4]]);
    } else this.toast('Lại gần nhau hơn để đưa dù');
  }
  private toggleHold() {
    const W = this.W;
    if (W.hold) {
      W.hold = false;
      this.toast('Buông tay. Đi riêng thì Su nhảy đôi được.');
      return;
    }
    if (this.dist() < TUNING.holdRange && Math.abs(W.P.y - W.S.y) < 0.4) {
      W.hold = true;
      this.hearts((W.P.x + W.S.x) / 2, 1.9, (W.P.z + W.S.z) / 2, 3);
      this.toast('Nắm tay: đi chung dù mà không chậm');
      if (!W.stats.saidHold) {
        W.stats.saidHold = true;
        this.say([['Phú', 'Nắm tay cho khỏi lạc nè.', 2.4]]);
      }
    } else this.toast('Đứng sát nhau mới nắm tay được');
  }
  private giveJacket() {
    const W = this.W;
    if (W.jacket) return this.toast('Su đang mặc áo của Phú rồi');
    if (this.dist() > 1.7) return this.toast('Lại gần Su để khoác áo');
    W.jacket = true;
    if (W.P.rig.jacket) W.P.rig.jacket.visible = false;
    if (W.S.rig.longJacket) W.S.rig.longJacket.visible = true;
    this.hearts(W.S.x, 1.9, W.S.z, 5);
    this.say([['Su', 'Áo anh dài quá nè… mà ấm.', 2.8]]);
  }
  /** Wetness for both, the sneeze reset at 100 %, and the cold hint for the jacket. */
  wetness(dt: number) {
    const W = this.W,
      L = this.level;
    [W.P, W.S].forEach((c) => {
      const cov = this.covered(c);
      c.wet = wetStep(c.wet, dt, { covered: cov, intensity: this.intensity, jacket: c === W.S && W.jacket });
      const a = L.checkpoint(c);
      if (a != null) W.chk = a;
      if (!cov && this.intensity > 0.2 && Math.random() < (dt * c.wet) / 16) this.splashAt(c.x + (Math.random() - 0.5) * 0.4, c.y + 1.3, c.z, 1, 0xcfe2f8, 0.3);
    });
    if (W.P.wet >= 100 || W.S.wet >= 100) {
      const who = W.P.wet >= 100 ? 'Phú' : 'Su';
      W.stats.sneeze++;
      this.toast(who + ' hắt xì! Về mái hiên gần nhất nhé.', 3);
      [W.P, W.S].forEach((c, k) => {
        c.x = W.chk + (k ? -0.5 : 0.5);
        c.z = L.spawnZ;
        c.y = 0.14;
        c.vx = c.vz = c.vy = c.kx = c.kz = 0;
        c.wet = afterSneeze(c.wet);
        c.sneeze = 1.2;
      });
      W.hold = false;
    }
    if (!W.stats.cold && W.S.wet > 55 && !W.jacket) {
      W.stats.cold = true;
      this.say([
        ['Su', 'Hơi lạnh…', 2],
        ['', `${this.keyHint('Áo khoác', 'C')} để Phú khoác áo cho Su.`, 3.2],
      ]);
    }
  }
  poseChar(c: Walker, dt: number, o: { umb?: boolean; holdL?: boolean; holdR?: boolean; hug?: number; look?: number } = {}) {
    const r = c.rig;
    r.root.position.set(c.x, c.y, c.z);
    let d = c.face - r.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    r.root.rotation.y += d * Math.min(1, dt * 12);
    const sp = Math.min(1, Math.hypot(c.vx, c.vz) / 3.6),
      sw = Math.sin(c.phase * 2.1) * 0.75 * sp;
    r.legs[0].rotation.x = sw;
    r.legs[1].rotation.x = -sw;
    let la = -sw * 0.8,
      ra = sw * 0.8,
      lz = -0.12,
      rz = 0.12;
    if (!c.ground) {
      la = ra = -0.6;
      r.legs[0].rotation.x = 0.5;
      r.legs[1].rotation.x = -0.3;
    }
    if (o.umb) ra = -2.5;
    if (o.holdL) {
      la = -0.35;
      lz = -0.45;
    }
    if (o.holdR) {
      ra = -0.35;
      rz = 0.45;
    }
    if (o.hug) {
      const k = o.hug;
      la = lerp(la, -1.45, k);
      ra = lerp(ra, -1.45, k);
      lz = lerp(lz, 0.65, k);
      rz = lerp(rz, -0.65, k);
    }
    r.arms[0].rotation.x += (la - r.arms[0].rotation.x) * Math.min(1, dt * 12);
    r.arms[1].rotation.x += (ra - r.arms[1].rotation.x) * Math.min(1, dt * 12);
    r.arms[0].rotation.z += (lz - r.arms[0].rotation.z) * Math.min(1, dt * 10);
    r.arms[1].rotation.z += (rz - r.arms[1].rotation.z) * Math.min(1, dt * 10);
    // squash on landing, stretch on take-off, breathing when idle
    if (c.land > 0) c.land -= dt;
    else if (c.land < 0) c.land = Math.min(0, c.land + dt);
    const sq = c.land > 0 ? Math.sin((c.land / 0.18) * Math.PI) * 0.16 : c.land < 0 ? -0.08 : Math.sin(performance.now() / 600) * 0.012 * (1 - sp);
    r.body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    r.root.position.y += Math.abs(Math.sin(c.phase * 2.1)) * 0.05 * sp;
    // follow-through hair and blinking
    if (r.hairBack) {
      const tgt = -sp * 0.35 + c.vy * -0.03;
      r.swayV += (tgt - r.sway) * 40 * dt;
      r.swayV *= Math.pow(0.02, dt);
      r.sway += r.swayV * dt;
      r.hairBack.rotation.x = r.sway;
    }
    r.blink -= dt;
    const bl = r.blink < 0.12 ? 0.15 : 1;
    if (r.blink < 0) r.blink = 2 + Math.random() * 3;
    r.eyes.forEach((e) => (e.scale.y = 1.3 * bl));
    if (c.sneeze > 0) {
      c.sneeze -= dt;
      r.head.rotation.x = Math.sin(c.sneeze * 20) * 0.25;
    } else r.head.rotation.x = lerp(r.head.rotation.x, o.look ?? 0, Math.min(1, dt * 6));
    // clothes darken as they soak
    r.top.color.copy(r.baseTop).multiplyScalar(1 - c.wet * 0.0042);
    const g = this.level.groundAt(c, c.x, c.z);
    r.shadow.position.set(c.x, g + 0.015, c.z);
    r.shadow.scale.setScalar(1 / (1 + (c.y - g) * 0.8));
  }
  walkRender(dt: number, extra: { hug?: number; hugP?: number; hugS?: number; lookUp?: number } = {}) {
    const W = this.W,
      h = this.holder(),
      hugging = (extra.hug ?? 0) > 0;
    this.poseChar(W.P, dt, { umb: h === W.P && W.umbOpen && !hugging, holdL: W.hold && W.lead === W.P, holdR: W.hold && W.lead !== W.P, hug: extra.hugP });
    this.poseChar(W.S, dt, {
      umb: h === W.S && W.umbOpen && !hugging,
      holdR: W.hold && W.lead === W.P,
      holdL: W.hold && W.lead !== W.P,
      hug: extra.hugS,
      look: extra.lookUp,
    });
    const u = W.umbrella;
    u.visible = W.umbOpen && !((extra.hug ?? 0) > 0.5);
    if (u.visible) {
      const o = this.other(h);
      let ux = h.x,
        uz = h.z;
      if (W.hold || Math.hypot(o.x - h.x, o.z - h.z) < 1.2) {
        ux = (h.x + o.x) / 2;
        uz = (h.z + o.z) / 2;
      }
      u.position.x += (ux - u.position.x) * Math.min(1, dt * 14);
      u.position.z += (uz - u.position.z) * Math.min(1, dt * 14);
      u.position.y = h.y + 2.1;
      u.rotation.set(Math.sin(performance.now() / 700) * 0.04, u.rotation.y + dt * 0.3, (ux - h.x) * -0.25);
      const s = W.hold ? 1.12 : 1;
      u.scale.lerp(new THREE.Vector3(s, s, s), Math.min(1, dt * 8));
    }
  }
  walkCamera(dt: number, o: { close?: number; upMul?: number } = {}) {
    const W = this.W,
      close = o.close ?? 0;
    const mx = (W.P.x + W.S.x) / 2,
      mz = (W.P.z + W.S.z) / 2,
      sep = this.dist();
    const ahead = clamp(W.lead.vx * 0.6, -2.5, 2.5);
    let back = 9 + Math.min(6, sep * 0.55),
      up = 5.4 + Math.min(4, sep * 0.3);
    if (close) {
      back = lerp(back, 4.2, close);
      up = lerp(up, 2.2, close);
    }
    up *= o.upMul ?? 1;
    if (this.cam.aspect < 1) {
      back *= 0.95;
      up *= 0.62;
    }
    const look = new THREE.Vector3(mx + ahead, close ? lerp(0.9, 1.3, close) : 0.9, Math.min(mz, 1.5) - 0.6);
    this.camUpdate(dt, new THREE.Vector3(look.x - 1.2 * close, look.y + up, look.z + back), look, close ? 2.2 : 3.6, close ? 34 : 40);
  }

  /* ===================== scooter traffic (walk chapters) ===================== */
  trafficInit(n: number) {
    const cols = [0xd8342c, 0x2f63a0, 0x2e8a57, 0xe0a92b],
      coats = [0x3f7d5c, 0x4a6fd1, 0xd9a33a, 0xb04a7a];
    this.traffic = [];
    for (let k = 0; k < n; k++) {
      const b = makeScooter(cols[k % cols.length], coats[(k + 1) % coats.length]);
      b.visible = false;
      this.world.add(b);
      void swapDesigner(this, b, 'tm-scooter', FIT.scooter);
      this.traffic.push({ g: b, x: 0, z: 0, v: 0, on: false, cd: 2.5 + k * 4, warned: false });
    }
  }
  /**
   * A scooter crossing the middle of the screen in front of the couple is closer to the camera than they are and hides
   * them. While it is there it turns see-through (outline hulls hidden), then solid again; its lane and timing are untouched.
   */
  private fadeInFront(g: Vehicle, dt: number) {
    let f = this.fades.get(g);
    if (!f) {
      const mats: { m: THREE.Material; o: number }[] = [],
        hulls: THREE.Mesh[] = [];
      g.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.material === OUTLINE) hulls.push(mesh);
        else if (!Array.isArray(mesh.material)) {
          const m = mesh.material;
          mats.push({ m, o: m.opacity });
          // an opaque material is compiled without alpha, so it has to be transparent from the start to fade at all
          m.transparent = true;
          m.needsUpdate = true;
        }
      });
      f = { mats, hulls, k: 1 };
      this.fades.set(g, f);
    }
    this.tv.set(g.position.x, 1.1, g.position.z).project(this.cam);
    const inFront = g.position.z > Math.min(this.W.P.z, this.W.S.z) + 1 && Math.abs(this.tv.x) < 0.45 && this.tv.y < 0.25;
    f.k = lerp(f.k, inFront ? 0.22 : 1, damp(8, dt));
    const solid = f.k > 0.97;
    f.mats.forEach(({ m, o }) => (m.opacity = o * f.k));
    f.hulls.forEach((h) => (h.visible = solid));
  }
  private readonly fades = new WeakMap<Vehicle, { mats: { m: THREE.Material; o: number }[]; hulls: THREE.Mesh[]; k: number }>();
  trafficUpd(dt: number, cx: number, lanes: number[], canHit: boolean) {
    const W = this.W;
    this.traffic.forEach((b) => {
      if (!b.on) {
        b.cd -= dt;
        if (b.cd <= 0) {
          b.on = true;
          b.warned = false;
          b.g.visible = true;
          b.x = cx + TUNING.scooterSpawnDist;
          b.z = lanes[Math.floor(Math.random() * lanes.length)];
          b.v = TUNING.scooterSpeedMin + Math.random() * (TUNING.scooterSpeedMax - TUNING.scooterSpeedMin);
          b.g.position.set(b.x, 0, b.z);
        }
        return;
      }
      const ox = b.x;
      b.x -= b.v * dt;
      b.g.position.x = b.x;
      b.g.userData.wheels.forEach((w) => (w.rotation.z += b.v * dt * 3.5));
      // warn warnSec before it reaches the couple, and only while it is still coming
      if (!b.warned && shouldWarn(b.x - cx, b.v)) b.warned = true;
      if (canHit)
        [W.P, W.S].forEach((c) => {
          if (ox > c.x && b.x <= c.x) {
            const hit = scooterHit({
              dz: Math.abs(c.z - b.z),
              airborne: c.y >= 1,
              covered: this.covered(c),
              sheltered: this.level.shelter(c),
              puddleNear: this.level.puddleNear(c.x, b.z),
            });
            if (hit.kind === 'blocked') {
              this.splashAt(c.x, 0.5, c.z, 12, 0xf6e27a);
              this.toast('Dù đỡ được nước tạt rồi!');
            } else if (hit.kind === 'soaked') {
              c.wet = Math.min(100, c.wet + hit.wet);
              c.kz -= 4;
              this.splashAt(c.x, 0.4, c.z, 22, 0xcfe2f8, 1.3);
              this.addTrauma(0.45);
              this.hitStop = 0.07;
              this.toast('Xe tạt nước vào ' + (c === W.P ? 'Phú' : 'Su') + '!');
            } else if (hit.kind === 'puddle') {
              c.wet = Math.min(100, c.wet + hit.wet);
              this.splashAt(c.x, 0.3, c.z, 10);
              this.addTrauma(0.2);
            }
          }
        });
      this.fadeInFront(b.g, dt);
      if (b.x < cx - 28) {
        b.on = false;
        b.g.visible = false;
        b.cd = 3 + Math.random() * 4;
      }
    });
    this.hud.warnR = canHit && this.traffic.some((b) => b.on && b.warned && b.x > cx - 1);
  }

  /* ===================== flow ===================== */
  /** Ends the chapter: hands the snapshot and stamps to the HUD for the postcard. */
  finish() {
    if (!this.running) return;
    this.running = false;
    Object.assign(this.hud, { warnL: false, warnR: false, talk: null });
    const L = this.level;
    this.opts.onFinish({ id: L.id, date: L.date, title: L.title, text: L.postText, img: this.snap, stamps: L.stamps(this) });
  }
  /** Small JPEG of the frame just rendered (read back in the same task, so no preserveDrawingBuffer). Null if it came out blank. */
  private capture() {
    try {
      const src = this.R.domElement;
      const c = document.createElement('canvas');
      c.width = 480;
      c.height = 300;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      const r = Math.max(480 / src.width, 300 / src.height),
        w = src.width * r,
        h = src.height * r;
      g.drawImage(src, (480 - w) / 2, (300 - h) / 2, w, h);
      const px = g.getImageData(0, 0, 480, 300).data;
      let lit = false;
      for (let i = 0; i < px.length && !lit; i += 4 * 37) lit = px[i] + px[i + 1] + px[i + 2] > 0;
      this.snap = lit ? c.toDataURL('image/jpeg', 0.8) : null;
    } catch {
      this.snap = null;
    }
  }

  /**
   * Renders the postcard shot: a landscape frame whatever the screen shape (phones in portrait would
   * crop the couple to two faces), with softer bloom and exposure so lamps and awnings do not blow out.
   */
  private snapshot() {
    const R = this.R,
      cam = this.cam;
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    const wide = w / h >= 1.5;
    const prevFov = cam.fov;
    const prevBloom = this.bloom.strength,
      prevExp = R.toneMappingExposure;
    if (!wide) {
      R.setSize(960, 600, false);
      this.composer.setSize(960, 600);
      cam.aspect = 1.6;
      cam.fov = this.camRig.fov;
      cam.updateProjectionMatrix();
    }
    this.bloom.strength = 0.15;
    R.toneMappingExposure = 0.72;
    this.composer.render();
    this.capture();
    this.bloom.strength = prevBloom;
    R.toneMappingExposure = prevExp;
    if (!wide) {
      cam.fov = prevFov;
      this.resize();
    }
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)) * this.timeScale;
    this.last = now;
    if (document.hidden) return;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.12;
    }
    if (this.running && !this.paused) {
      // fast-forward (timeScale > 1) steps the simulation in real-time-sized slices so physics cannot tunnel
      for (let left = dt; left > 1e-6; left -= 0.05) this.level.update(this, Math.min(0.05, left));
    }
    this.level.render(this, dt);
    this.updFx(dt);
    // paused: toasts, dialogue and the title card wait too, so nothing is missed behind the how-to card
    this.updUi(this.paused ? 0 : dt);
    this.updMarker();
    this.hits.clear();
    this.bloom.strength = this.look.bloom;
    this.R.toneMappingExposure = this.look.exposure;
    if (this.snapNext) {
      this.snapNext = false;
      this.snapshot();
    }
    this.composer.render();
  };

  /**
   * Projects the level's objective onto the canvas. On-screen it is a point (the HUD draws a ring and a bobbing arrow);
   * off-screen or behind the camera it is clamped to the inside edge of the screen with the direction to turn.
   */
  private updMarker() {
    const m = this.marker;
    const t = this.running && !this.paused && !this.hud.choice ? this.level.target(this) : null;
    if (!t) {
      m.on = false;
      return;
    }
    const cam = this.cam,
      w = this.vw,
      h = this.vh;
    cam.updateMatrixWorld();
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const behind = this.tc.copy(t).applyMatrix4(cam.matrixWorldInverse).z > -0.05;
    this.tv.copy(t).project(cam);
    let px = (this.tv.x * 0.5 + 0.5) * w,
      py = (-this.tv.y * 0.5 + 0.5) * h;
    if (behind) {
      px = w - px;
      py = h - py;
    }
    m.on = true;
    Object.assign(m, clampMarker(px, py, behind, w, h, this.coarse));
  }

  private updUi(dt: number) {
    let dirty = false;
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) {
        this.hud.toast = '';
        dirty = true;
      }
    }
    if (this.talkT > 0) {
      this.talkT -= dt;
      if (this.talkT <= 0) this.nextTalk();
    }
    if (this.cardT > 0) {
      this.cardT -= dt;
      if (this.cardT <= 0) {
        this.hud.card = null;
        dirty = true;
      }
    }
    if (this.hud.flash > 0) this.hud.flash = Math.max(0, this.hud.flash - dt);
    if (this.hud.wetFx > 0) this.hud.wetFx = Math.max(0, this.hud.wetFx - dt);
    this.hudT -= dt;
    if (this.hudT <= 0 || dirty) {
      this.hudT = 0.1;
      const W = this.W;
      if (this.level.mode === 'walk' && W.P)
        Object.assign(this.hud, { wetP: W.P.wet, wetS: W.S.wet, umb: W.umbOpen ? W.umb : null, jacket: W.jacket, hold: W.hold });
      this.pushHud();
    }
  }
}
