/**
 * Procedural art kit for the rain chapters: toon materials with inverted-hull outlines, the
 * couple, vehicles, props and a Saigon tube-house street. Ported from the v3 design prototype so
 * the chapters keep its exact look; everything is generated, no external assets.
 */
import * as THREE from 'three';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate independent smoothing factor. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Seeded random so every chapter street is laid out the same way each time. */
let seed = 7;
export const setSeed = (s: number) => {
  seed = s;
};
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const grad = new THREE.DataTexture(new Uint8Array([70, 150, 215, 255]), 4, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;

export const toon = (c: THREE.ColorRepresentation, o: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
export const std = (c: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, envMapIntensity: 0.25, ...o });
export const glow = (c: THREE.ColorRepresentation, k = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  m.color.multiplyScalar(k);
  return m;
};
export const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x140e1c, side: THREE.BackSide });

/** Inverted-hull outline: a slightly larger back-face copy in the outline colour. */
export function ol<T extends THREE.Mesh>(mesh: T, k = 1.07): T {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.scale.setScalar(k);
  o.castShadow = false;
  mesh.add(o);
  return mesh;
}

/** Textures shared across chapters; never disposed with a chapter world. */
export const SHARED = new Set<THREE.Texture>();

export function ctex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const shared = (t: THREE.Texture) => (SHARED.add(t), t);

export const glowTex = shared(
  ctex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.3, 'rgba(255,255,255,.4)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }),
);
export const heartTex = shared(
  ctex(64, 64, (g) => {
    g.fillStyle = '#ff7aa8';
    g.beginPath();
    g.moveTo(32, 54);
    g.bezierCurveTo(4, 34, 10, 8, 32, 22);
    g.bezierCurveTo(54, 8, 60, 34, 32, 54);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.beginPath();
    g.arc(22, 24, 5, 0, 7);
    g.fill();
  }),
);
export const asphalt = shared(
  ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#1b2230';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 20 + Math.random() * 30;
      g.fillStyle = `rgba(${v},${v + 6},${v + 16},.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }),
);
asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
export const tiles = shared(
  ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#5a6070';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = 80 + Math.random() * 25;
        g.fillStyle = `rgb(${v},${v + 4},${v + 14})`;
        g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
      }
  }),
);
tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;

/** A repeat-wrapped copy of a shared texture, itself kept out of chapter disposal. */
export function tiled(t: THREE.Texture, rx: number, ry: number) {
  const c = t.clone();
  c.needsUpdate = true;
  c.repeat.set(rx, ry);
  return shared(c);
}

export function sprite(c: THREE.ColorRepresentation, o: number, s: number) {
  const m = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  m.scale.set(s, s, 1);
  return m;
}
export function signTex(txt: string, col: string, bg = '#0a0e18') {
  return ctex(512, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.font = '800 64px "Be Vietnam Pro",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = col;
    g.shadowBlur = 22;
    g.fillStyle = col;
    g.fillText(txt, w / 2, h / 2 + 4);
    g.shadowBlur = 0;
    g.globalAlpha = 0.75;
    g.fillStyle = '#fff';
    g.fillText(txt, w / 2, h / 2 + 4);
  });
}
export const streakTex = (col: string) =>
  ctex(32, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, '#000');
    gx.addColorStop(0.5, 'rgba(0,0,0,0)');
    gx.addColorStop(1, '#000');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = gx;
    g.fillRect(0, 0, w, h);
  });
const stripeTex = (a: string, b: string) => {
  const t = ctex(64, 8, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? a : b;
      g.fillRect(i * 8, 0, 8, 8);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
};
export const winTex = (lit: boolean) =>
  ctex(64, 64, (g, w, h) => {
    g.fillStyle = lit ? (rnd() < 0.6 ? '#ffcf7e' : '#bfe0ff') : '#141c2c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(31, 0, 3, h);
    g.fillRect(0, 40, w, 3);
    if (lit) {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(0, 0, w, 14);
    }
  });

/* ===================== characters ===================== */
export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  legs: THREE.Mesh[];
  arms: THREE.Mesh[];
  head: THREE.Group;
  eyes: THREE.Mesh[];
  hairBack: THREE.Group | null;
  jacket: THREE.Mesh | null;
  longJacket: THREE.Mesh | null;
  poncho: THREE.Mesh;
  hood: THREE.Mesh;
  shadow: THREE.Mesh;
  top: THREE.MeshToonMaterial;
  baseTop: THREE.Color;
  su: boolean;
  blink: number;
  sway: number;
  swayV: number;
}

/** Colours chosen in the studio, so the chapters show the same outfit as the café. */
export interface Look {
  top: string;
  bottom?: string;
  hair: string;
  bow?: boolean;
}

function limb(r: number, len: number, mat: THREE.Material) {
  const g = new THREE.CapsuleGeometry(r, len, 4, 10);
  g.translate(0, -len / 2 - r * 0.6, 0);
  return ol(new THREE.Mesh(g, mat), 1.09);
}

export function makeChar(kind: 'phu' | 'su', look: Look): Rig {
  const su = kind === 'su';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = toon(0xf6d0b0),
    hairM = toon(look.hair),
    eyeM = new THREE.MeshBasicMaterial({ color: 0x1b1220 }),
    whiteM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const top = toon(look.top),
    bottom = toon(su ? look.top : (look.bottom ?? 0x23252e)),
    shoeM = toon(su ? 0xffffff : 0x2a2a30);
  const legs = [-1, 1].map((s) => {
    const l = limb(0.075, 0.3, su ? skin : bottom);
    l.position.set(s * 0.1, 0.58, 0);
    const sh = ol(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), shoeM));
    sh.scale.set(1, 0.65, 1.45);
    sh.position.set(0, -0.5, 0.04);
    l.add(sh);
    body.add(l);
    return l;
  });
  let torso: THREE.Mesh;
  if (su) {
    const pts = [
      [0, 0],
      [0.36, 0.02],
      [0.31, 0.2],
      [0.23, 0.42],
      [0.2, 0.56],
      [0.16, 0.66],
      [0, 0.68],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    torso = ol(new THREE.Mesh(new THREE.LatheGeometry(pts, 22), top), 1.05);
    torso.position.y = 0.5;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 18), toon(0xffffff));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.17;
    body.add(collar);
  } else {
    torso = ol(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.32, 4, 14), top), 1.06);
    torso.position.y = 0.92;
    torso.scale.set(1, 1, 0.82);
    const hip = ol(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.18, 14), bottom));
    hip.position.y = 0.66;
    body.add(hip);
  }
  body.add(torso);
  const arms = [-1, 1].map((s) => {
    const a = limb(0.06, 0.3, su ? skin : top);
    a.position.set(s * (su ? 0.2 : 0.27), 1.14, 0);
    a.rotation.z = s * 0.12;
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), skin);
    h.position.y = -0.47;
    a.add(h);
    body.add(a);
    return a;
  });
  const head = new THREE.Group();
  head.position.y = su ? 1.5 : 1.55;
  body.add(head);
  const skull = ol(new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 22), skin), 1.04);
  skull.scale.set(1, 0.96, 0.94);
  head.add(skull);
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), eyeM);
    e.scale.set(1, 1.3, 0.5);
    e.position.set(s * 0.115, -0.01, 0.3);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.017, 6, 6), whiteM);
    hl.position.set(0.018, 0.024, 0.03);
    e.add(hl);
    head.add(e);
    return e;
  });
  const blushM = new THREE.MeshBasicMaterial({ color: 0xff9bb5, transparent: true, opacity: 0.65 });
  [-1, 1].forEach((s) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), blushM);
    b.position.set(s * 0.19, -0.1, 0.285);
    b.rotation.y = s * 0.45;
    head.add(b);
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 4, 10, Math.PI), eyeM);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.12, 0.31);
  head.add(mouth);
  const cap = ol(new THREE.Mesh(new THREE.SphereGeometry(0.365, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM), 1.03);
  cap.rotation.x = -0.25;
  cap.position.set(0, 0.03, -0.02);
  head.add(cap);
  for (let i = -2; i <= 2; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(su ? 0.1 : 0.09, 10, 8), hairM);
    f.scale.set(1, 0.7, 0.55);
    f.position.set(i * (su ? 0.1 : 0.11), 0.2 - Math.abs(i) * 0.02, 0.27);
    f.rotation.z = i * 0.2;
    head.add(f);
  }
  let hairBack: THREE.Group | null = null;
  if (su) {
    hairBack = new THREE.Group();
    hairBack.position.set(0, 0.1, -0.08);
    head.add(hairBack);
    const hb = ol(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 16), hairM), 1.03);
    hb.scale.set(1.12, 1, 0.62);
    hb.position.y = -0.36;
    hairBack.add(hb);
    // fills the gap between the top cap and the long hair, where the skull showed through as a pale arc from behind
    const nape = ol(new THREE.Mesh(new THREE.SphereGeometry(0.335, 18, 12), hairM), 1.02);
    nape.scale.set(1, 0.85, 0.85);
    nape.position.set(0, -0.12, -0.04);
    hairBack.add(nape);
    if (look.bow !== false) {
      const bowM = toon(0xe0344f);
      const bow = new THREE.Group();
      bow.position.set(0.24, 0.24, 0.14);
      bow.rotation.z = -0.4;
      head.add(bow);
      [-1, 1].forEach((s) => {
        const lobe = ol(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.13, 10), bowM));
        lobe.rotation.z = (s * Math.PI) / 2;
        lobe.position.x = s * 0.07;
        bow.add(lobe);
      });
      bow.add(ol(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bowM)));
    }
  } else {
    const nape = ol(new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 12), hairM), 1.02);
    nape.scale.set(1, 0.7, 0.8);
    nape.position.set(0, -0.05, -0.1);
    head.add(nape);
  }
  // Phú's black jacket, which he can put on Su
  let jacket: THREE.Mesh | null = null,
    longJacket: THREE.Mesh | null = null;
  if (!su) {
    jacket = ol(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.5, 16, 1, true), toon(0x2c3042, { side: THREE.DoubleSide })), 1.04);
    jacket.position.y = 0.94;
    body.add(jacket);
  } else {
    const pts = [
      [0, 0],
      [0.4, 0.0],
      [0.33, 0.3],
      [0.26, 0.58],
      [0.22, 0.74],
      [0, 0.76],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    longJacket = ol(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), toon(0x2c3042, { side: THREE.DoubleSide })), 1.04);
    longJacket.position.y = 0.42;
    longJacket.visible = false;
    body.add(longJacket);
  }
  // raincoats for 13/09: Su red (a little too long), Phú blue
  const ponchoM = toon(su ? 0xd8333f : 0x2f62c6, { side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const poncho = ol(new THREE.Mesh(new THREE.ConeGeometry(su ? 0.5 : 0.52, su ? 1.22 : 1.12, 18, 1, true), ponchoM), 1.03);
  poncho.position.y = su ? 0.92 : 0.98;
  poncho.visible = false;
  body.add(poncho);
  const hood = ol(new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), ponchoM), 1.02);
  hood.position.y = 0.06;
  hood.visible = false;
  head.add(hood);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 24),
    new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material !== OUTLINE) o.castShadow = true;
  });
  return {
    root,
    body,
    legs,
    arms,
    head,
    eyes,
    hairBack,
    jacket,
    longJacket,
    poncho,
    hood,
    shadow,
    top,
    baseTop: top.color.clone(),
    su,
    blink: 2 + Math.random() * 2,
    sway: 0,
    swayV: 0,
  };
}

export function makeUmbrella() {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(1.05, 0.42, 8, 1, true).toNonIndexed();
  const cols: number[] = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 3) {
    const ang = Math.atan2(pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2), pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2));
    const k = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8) % 2;
    const c = new THREE.Color(k ? 0xf6e27a : 0xfff6dc);
    for (let j = 0; j < 3; j++) cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const can = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
  can.position.y = 0.2;
  can.castShadow = true;
  g.add(ol(can, 1.03));
  const stickM = toon(0x3a2f2a);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 6), stickM);
  stick.position.y = -0.37;
  g.add(stick);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12, Math.PI), stickM);
  hook.position.set(0.07, -0.95, 0);
  hook.rotation.z = Math.PI;
  g.add(hook);
  return g;
}

/** Vehicles keep their spinning wheels in userData so the level can animate them. */
export type Vehicle = THREE.Group & { userData: { wheels: THREE.Mesh[] } };

const beamMat = (o: number) =>
  new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    transparent: true,
    opacity: o,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

/** `withBeam` draws the headlight cone; a parked or slow scooter in a bright scene shows it as a hard-edged triangle, so it can be left out. */
export function makeScooter(col: number, coatCol: number, withBeam = true): Vehicle {
  const g = new THREE.Group() as Vehicle;
  const wheels: THREE.Mesh[] = [];
  const m = toon(col);
  const body = ol(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 4, 10), m), 1.05);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.55;
  g.add(body);
  const front = ol(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.36), m), 1.04);
  front.position.set(-0.62, 0.82, 0);
  front.rotation.z = -0.25;
  g.add(front);
  const wM = toon(0x15161b);
  [-0.62, 0.62].forEach((x) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.085, 8, 18), wM);
    w.position.set(x, 0.3, 0);
    g.add(w);
    wheels.push(w);
  });
  const coat = ol(new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.15, 14, 1, true), toon(coatCol, { side: THREE.DoubleSide })), 1.03);
  coat.position.set(0.18, 1.3, 0);
  coat.userData.keep = true; // the rider and the beam stay when a designer scooter replaces the body
  g.add(coat);
  const helm = ol(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), toon(0xf2f2f2)));
  helm.position.set(0.12, 1.95, 0);
  helm.userData.keep = true;
  g.add(helm);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow(0xfff2c4, 4));
  lamp.position.set(-0.76, 1.05, 0);
  g.add(lamp);
  if (withBeam) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5, 20, 1, true), beamMat(0.08));
    beam.rotation.z = -Math.PI / 2;
    beam.position.set(-3.3, 0.75, 0);
    beam.userData.keep = true;
    g.add(beam);
  }
  const halo = sprite(0xfff0c0, 0.9, 1.2);
  halo.position.copy(lamp.position);
  g.add(halo);
  g.userData.wheels = wheels;
  return g;
}

export function makeTruck(): Vehicle {
  const g = new THREE.Group() as Vehicle;
  const wheels: THREE.Mesh[] = [];
  const cab = ol(new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 2.2), toon(0x2f6f9a)), 1.02);
  cab.position.set(-3.2, 1.5, 0);
  g.add(cab);
  const box = ol(new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 2.3), toon(0xd9d6cc)), 1.01);
  box.position.set(0.4, 1.8, 0);
  g.add(box);
  const wM = toon(0x111111);
  [-3.3, -0.6, 1.8].forEach((x) =>
    [-1.1, 1.1].forEach((z) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), wM);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.5, z);
      g.add(w);
      wheels.push(w);
    }),
  );
  [-0.7, 0.7].forEach((z) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow(0xfff2c4, 5));
    l.position.set(-4.12, 1.0, z);
    g.add(l);
    const h = sprite(0xfff0c0, 1, 2);
    h.position.copy(l.position);
    g.add(h);
  });
  g.userData.wheels = wheels;
  return g;
}

export function makeExciter(): Vehicle {
  const g = new THREE.Group() as Vehicle;
  const wheels: THREE.Mesh[] = [];
  const blue = toon(0x1f56c4),
    black = toon(0x16171c),
    chrome = std(0xc8ccd4, { metalness: 0.9, roughness: 0.25, envMapIntensity: 1 });
  const tank = ol(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 12), blue), 1.05);
  tank.rotation.z = Math.PI / 2 + 0.12;
  tank.position.set(-0.15, 0.86, 0);
  g.add(tank);
  const seat = ol(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.32), black));
  seat.position.set(0.45, 0.86, 0);
  seat.rotation.z = -0.06;
  g.add(seat);
  const fair = ol(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 10), blue));
  fair.rotation.z = Math.PI / 2;
  fair.position.set(-0.72, 0.98, 0);
  g.add(fair);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), chrome);
  frame.position.set(0, 0.55, 0);
  g.add(frame);
  [-0.78, 0.72].forEach((x) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 10, 22), black);
    w.position.set(x, 0.38, 0);
    g.add(w);
    wheels.push(w);
  });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glow(0xfff2c4, 5));
  lamp.position.set(-1.02, 1.0, 0);
  g.add(lamp);
  const lh = sprite(0xfff0c0, 1, 1.4);
  lh.position.copy(lamp.position);
  g.add(lh);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xff2a3a, 4));
  tail.position.set(0.92, 0.92, 0);
  g.add(tail);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 20, 1, true), beamMat(0.07));
  beam.rotation.z = -Math.PI / 2;
  beam.position.set(-4.4, 0.7, 0);
  beam.userData.keep = true; // the headlight beam stays when the designer bike replaces the body
  g.add(beam);
  g.userData.wheels = wheels;
  return g;
}

export type Person = THREE.Group & { userData: { arm: THREE.Mesh; umb?: THREE.Group } };
export function makePerson(coat: number, hasUmb: boolean): Person {
  const g = new THREE.Group() as Person;
  const skin = toon(0xe9c09e);
  const b = ol(new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 14, 1, true), toon(coat, { side: THREE.DoubleSide })));
  b.position.y = 0.75;
  g.add(b);
  const h = ol(new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), skin));
  h.position.y = 1.5;
  g.add(h);
  const hat = ol(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 16), toon(0xe8d8a0)));
  hat.position.y = 1.72;
  g.add(hat);
  const arm = limb(0.05, 0.32, toon(coat));
  arm.position.set(0.26, 1.18, 0);
  g.add(arm);
  if (hasUmb) {
    const u = makeUmbrella();
    u.scale.setScalar(0.8);
    u.position.set(-0.2, 2.0, 0);
    g.add(u);
    g.userData.umb = u;
  }
  g.userData.arm = arm;
  return g;
}

export function makeItem(kind: 'bt' | 'ga' | 'bm') {
  const g = new THREE.Group();
  if (kind === 'bt') {
    g.add(ol(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.12), toon(0xf6d58a))));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.13), toon(0xe0567f));
    band.position.y = 0.1;
    g.add(band);
  } else if (kind === 'ga') {
    g.add(ol(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.3), toon(0xd8342c))));
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.08, 0.31), toon(0xffffff));
    st.position.y = 0.07;
    g.add(st);
  } else {
    const loaf = ol(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.32, 4, 10), toon(0xe0a85a)));
    loaf.rotation.z = Math.PI / 2;
    g.add(loaf);
  }
  g.add(sprite(0xffd98a, 0.85, 1.3));
  return g;
}

export function makeTree() {
  const g = new THREE.Group();
  const tr = ol(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.8, 8), toon(0x5a3d2b)));
  tr.position.y = 0.9;
  g.add(tr);
  const lm = toon(0x3f8f5a);
  [
    [0, 2.3, 0, 0.9],
    [0.4, 2.0, 0.2, 0.6],
    [-0.35, 2.1, -0.1, 0.65],
  ].forEach(([x, y, z, r]) => {
    const s = ol(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), lm), 1.04);
    s.position.set(x, y, z);
    s.castShadow = true;
    g.add(s);
  });
  return g;
}

/* ===================== Saigon street kit ===================== */
const PASTEL = [0xe7d3b0, 0xb9d8c9, 0xe9b8a8, 0xf0dc9a, 0xa9c6e2, 0xd8c2e3, 0xeee6d6];
const SHOPS: [string, string][] = [
  ['TẠP HÓA', '#62d6ff'],
  ['CƠM TẤM', '#ffcf5a'],
  ['BÚN BÒ', '#ff7a59'],
  ['TRÀ SỮA', '#c39bff'],
  ['SỬA XE', '#7dffb0'],
  ['NHÀ THUỐC', '#5fe08f'],
  ['BÁNH MÌ', '#ffd166'],
  ['TIỆM HOA', '#ff8fc8'],
  ['CÀ PHÊ', '#ffcf5a'],
];

/** One tube house: lit shop front with a neon sign, balconies with plants, AC units, a roof tank. */
export function shophouse(
  world: THREE.Object3D,
  x: number,
  w: number,
  front: number,
  opts: { sign?: [string, string] | null; lit?: boolean; floors?: number; dim?: number } = {},
) {
  const floors = opts.floors ?? 2 + Math.floor(rnd() * 3),
    H = floors * 3.1,
    col = PASTEL[Math.floor(rnd() * PASTEL.length)];
  // `dim` < 1 darkens the walls, the balcony slabs and the lit shop windows for a scene whose camera sits close to the row
  const dim = opts.dim ?? 1;
  const fac = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, H, 6), std(new THREE.Color(col).multiplyScalar(dim), { roughness: 0.9 }));
  fac.position.set(x + w / 2, H / 2, front - 3);
  fac.receiveShadow = true;
  world.add(fac);
  const lit = opts.lit ?? rnd() < 0.7;
  const shopIn = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.82, 2.5),
    lit ? glow([0xffd9a0, 0xcfe6ff, 0xffc4dc][Math.floor(rnd() * 3)], 0.62 * dim) : std(0x56606e, { roughness: 0.6, metalness: 0.3 }),
  );
  shopIn.position.set(x + w / 2, 1.35, front + 0.02);
  world.add(shopIn);
  if (lit) {
    const gl = sprite(0xffc890, 0.13 * dim, w * 1.1);
    gl.position.set(x + w / 2, 1.4, front + 0.6);
    world.add(gl);
  }
  const [name, ncol] = opts.sign ?? SHOPS[Math.floor(rnd() * SHOPS.length)];
  const sg = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(w * 0.86, 3.2), 0.62),
    new THREE.MeshBasicMaterial({ map: signTex(name, ncol), toneMapped: false }),
  );
  sg.material.color.setScalar(1.35);
  sg.position.set(x + w / 2, 3.0, front + 0.06);
  world.add(sg);
  const st = streakTex(ncol);
  const r = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 6),
    new THREE.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  r.rotation.x = -Math.PI / 2;
  r.position.set(x + w / 2, 0.135, front + 3.2);
  world.add(r);
  for (let f = 1; f < floors; f++) {
    const y = f * 3.1;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.12, 0.9), std(new THREE.Color(0xd6d0c4).multiplyScalar(dim)));
    slab.position.set(x + w / 2, y + 0.05, front + 0.45);
    slab.castShadow = true;
    world.add(slab);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.75, 0.04), std(0x2c3340, { transparent: true, opacity: 0.75 }));
    rail.position.set(x + w / 2, y + 0.48, front + 0.88);
    world.add(rail);
    for (let k = 0; k < 2; k++) {
      const wl = rnd() < 0.55;
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.3, 1.5),
        wl
          ? new THREE.MeshBasicMaterial({ map: winTex(true), toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) })
          : std(0x1a2232, { map: winTex(false) }),
      );
      win.position.set(x + w * (0.28 + k * 0.44), y + 1.35, front + 0.02);
      world.add(win);
    }
    if (rnd() < 0.7)
      for (let k = 0; k < Math.floor(w / 1.3); k++) {
        const p = ol(new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), toon(rnd() < 0.2 ? 0xe86a8a : 0x4f9a63)), 1.05);
        p.position.set(x + 0.6 + k * 1.3, y + 0.95, front + 0.6);
        world.add(p);
      }
    if (rnd() < 0.45) {
      const ac = ol(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.3), toon(0xe9ecef)));
      ac.position.set(x + w * 0.8, y + 2.4, front + 0.15);
      world.add(ac);
    }
  }
  if (rnd() < 0.6) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 16), std(0xd9dde3, { metalness: 0.9, roughness: 0.3, envMapIntensity: 0.6 }));
    tank.rotation.z = Math.PI / 2;
    tank.position.set(x + w * 0.5, H + 0.5, front - 1.2);
    world.add(tank);
  }
}

export function streetRow(
  world: THREE.Object3D,
  x0: number,
  x1: number,
  front: number,
  opts: { skip?: [number, number][]; signs?: [number, string, string][]; dim?: number } = {},
) {
  let x = x0;
  const skip = opts.skip ?? [];
  while (x < x1) {
    const w = 3.6 + rnd() * 2.4;
    const gap = skip.find((s) => x + w > s[0] && x < s[1]);
    if (gap) {
      x = gap[1];
      continue;
    }
    const forced = (opts.signs ?? []).find((s) => s[0] >= x && s[0] < x + w);
    shophouse(world, x, w, front, { sign: forced ? [forced[1], forced[2]] : null, lit: forced ? true : undefined, dim: opts.dim });
    x += w;
  }
}

/** A street lamp; its bulb position joins the pool of real lights the runtime moves around. */
export function lamp(world: THREE.Object3D, x: number, z: number, lamps: THREE.Vector3[]) {
  const pm = std(0x3a4150, { metalness: 0.6, roughness: 0.4 });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 8), pm);
  p.position.set(x, 2.3, z);
  p.castShadow = true;
  world.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.3), pm);
  arm.position.set(x, 4.55, z + 0.6);
  world.add(arm);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.36), glow(0xffd29a, 4));
  bulb.position.set(x, 4.38, z + 1.2);
  world.add(bulb);
  const g = sprite(0xffb36b, 0.85, 2.6);
  g.position.set(x, 4.3, z + 1.2);
  world.add(g);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xffb36b,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, 0.17, z + 1.2);
  world.add(pool);
  lamps.push(new THREE.Vector3(x, 4.2, z + 1.2));
}

/** The tangle of overhead power lines every Saigon street has. */
export function wires(world: THREE.Object3D, lamps: THREE.Vector3[]) {
  const m = new THREE.LineBasicMaterial({ color: 0x07090e });
  for (let k = 0; k < lamps.length - 1; k++)
    for (let w = 0; w < 3; w++) {
      const a = lamps[k],
        b = lamps[k + 1],
        pts: THREE.Vector3[] = [];
      for (let t = 0; t <= 14; t++) {
        const u = t / 14;
        pts.push(new THREE.Vector3(lerp(a.x, b.x, u), 4.8 + w * 0.16 - Math.sin(u * Math.PI) * (0.6 + w * 0.12), a.z - 1.2 + w * 0.1));
      }
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m));
    }
}

export function awning(world: THREE.Object3D, x0: number, x1: number, front: number, c1: string, c2: string) {
  const w = x1 - x0,
    t = stripeTex(c1, c2);
  t.repeat.set(w / 1.2, 1);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 2.6), toon(0xffffff, { map: t }));
  aw.position.set(x0 + w / 2, 2.7, front + 1.25);
  aw.rotation.x = 0.2;
  aw.castShadow = true;
  world.add(ol(aw, 1.01));
  const val = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 0.05), toon(0xffffff, { map: t }));
  val.position.set(x0 + w / 2, 2.3, front + 2.52);
  world.add(val);
  [x0 + 0.1, x1 - 0.1].forEach((px) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), toon(0x2a2f3a));
    p.position.set(px, 1.2, front + 2.45);
    world.add(p);
  });
  const g = sprite(0xffc27a, 0.1, w);
  g.position.set(x0 + w / 2, 1.6, front + 1);
  world.add(g);
}
