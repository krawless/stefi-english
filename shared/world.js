// 3D characters (the kids from the book + Stefi's own avatar) and the little island they live on.
import * as THREE from 'three';
import { SPH, CYL, CONE, BOX, mat, M, WHITE_M, INK_M, rand, say, toScreen } from './common.js';

// ---------- kids ----------
export const SKIN = { light: '#f8d5b8', tan: '#d69a6c', dark: '#8a5a3c' };
export const HAIR = { black: '#2b2220', brown: '#6b3f22', yellow: '#f2c94c', orange: '#d8662c' };
export const FRIENDS = {
  chen: { name: 'Chen', skin: SKIN.light, hair: HAIR.black, style: 'cap', hat: '#4cc13a', shirt: '#ff8a1c', stripes: '#e8262b', pants: '#3e8e3e', shoes: '#8b4513', voice: .9, line: "Hello! I'm Chen." },
  ella: { name: 'Ella', skin: SKIN.tan, hair: HAIR.black, style: 'ponytail', shirt: '#7fd6a8', dress: true, pants: '#7fd6a8', shoes: '#ffffff', voice: 1.35, line: 'Hi! My name is Ella.' },
  mark: { name: 'Mark', skin: SKIN.light, hair: HAIR.yellow, style: 'spiky', shirt: '#1e62c8', pants: '#8fd14f', shoes: '#ff8a1c', voice: 1, line: 'Hi! I am Mark.' },
  asha: { name: 'Asha', skin: SKIN.dark, hair: HAIR.black, style: 'buns', band: '#ffd60a', glasses: true, shirt: '#ff8fb1', pants: '#4a7fd4', shoes: '#b05cd6', voice: 1.3, line: 'Hello! My name is Asha.' },
};
export const HAIR_STYLES = ['short', 'spiky', 'ponytail', 'pigtails', 'buns', 'long'];

// Stefi's avatar is made in Lesson 1 and reused everywhere.
export function loadAvatar() {
  const name = localStorage.getItem('stefi-name') || 'STEFI';
  const nice = name[0] + name.slice(1).toLowerCase();
  const saved = JSON.parse(localStorage.getItem('stefi-avatar') || 'null');
  return { skin: SKIN.light, hair: HAIR.brown, style: 'long', shirt: '#ff7ec1', pants: '#4a7fd4', shoes: '#ffffff', voice: 1.25, ...saved, name: nice, me: true };
}
export function saveAvatar(p) {
  const { skin, hair, style, shirt, glasses } = p;
  localStorage.setItem('stefi-avatar', JSON.stringify({ skin, hair, style, shirt, glasses }));
}

const capsCache = {};
const CAPS = (r, len) => (capsCache[r + ':' + len] ||= new THREE.CapsuleGeometry(r, len, 6, 16));
const HAIR_CAP = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * .5);
const SKIRT = new THREE.CylinderGeometry(.3, .5, .5, 24);
const up = new THREE.Vector3(0, 1, 0);

function addHair(head, p, hair) {
  const cap = M(HAIR_CAP, hair, [0, .03, -.02], [.53, .52, .5], head);
  cap.rotation.x = -.45;
  const s = p.style;
  if (s === 'short') [-.16, 0, .16].forEach(x => M(SPH, hair, [x, .3, .33], [.16, .1, .1], head));
  if (s === 'spiky') {
    for (let i = 0; i < 9; i++) {
      const th = (i / 9) * Math.PI * 2, ph = .35 + (i % 3) * .18;
      const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th) - .25).normalize();
      const c = M(CONE, hair, [n.x * .48, n.y * .48 + .03, n.z * .48], [.11, .3, .11], head);
      c.quaternion.setFromUnitVectors(up, n);
    }
  }
  if (s === 'ponytail') {
    M(SPH, hair, [0, .3, -.48], [.17, .17, .17], head);
    M(CAPS(.13, .35), hair, [0, -.05, -.58], [1, 1, 1], head).rotation.x = .25;
    M(SPH, mat('#ffd60a', .4), [.12, .38, .36], [.06, .06, .03], head);
  }
  if (s === 'pigtails') for (const x of [-1, 1]) {
    M(SPH, hair, [x * .55, -.05, -.12], [.17, .24, .17], head);
    M(SPH, mat('#ff5c8a', .4), [x * .47, .12, -.1], [.06, .06, .06], head);
  }
  if (s === 'buns') {
    for (const x of [-1, 1]) M(SPH, hair, [x * .4, .42, -.05], [.27, .27, .27], head);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.52, .04, 8, 24, Math.PI), mat(p.band || '#ffd60a', .4));
    band.position.set(0, 0, .05); band.rotation.x = -.3; head.add(band);
  }
  if (s === 'long') {
    M(CAPS(.42, .35), hair, [0, -.28, -.2], [1.05, 1, .55], head);
    for (const x of [-1, 1]) M(CAPS(.1, .45), hair, [x * .44, -.22, .05], [1, 1, 1], head);
  }
  if (s === 'cap') {
    const hat = mat(p.hat || '#4cc13a', .5);
    M(HAIR_CAP, hat, [0, .06, -.02], [.55, .5, .53], head).rotation.x = -.25;
    const brim = M(CYL, hat, [0, .26, .45], [.3, .03, .22], head); brim.rotation.x = .2;
  }
}

export function makeKid(p) {
  const g = new THREE.Group();
  const skin = mat(p.skin, .55), shirt = mat(p.shirt, .6), pants = mat(p.pants, .6), shoes = mat(p.shoes, .5), hair = mat(p.hair, .6);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * .14, .62, 0); g.add(leg);
    M(CAPS(.12, .36), p.dress ? skin : pants, [0, -.28, 0], [1, 1, 1], leg);
    M(SPH, shoes, [0, -.56, .06], [.15, .09, .2], leg);
    legs.push(leg);
  }
  const body = new THREE.Group(); body.position.y = .72; g.add(body);
  M(CAPS(.3, .36), shirt, [0, .36, 0], [1, 1, .82], body);
  if (p.dress) M(SKIRT, shirt, [0, .02, 0], [1, 1, .85], body);
  if (p.stripes) for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(.305, .035, 8, 28), mat(p.stripes, .6));
    r.rotation.x = Math.PI / 2; r.scale.y = .82; r.position.y = .22 + i * .17; body.add(r);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * .34, .62, 0); body.add(piv);
    M(CAPS(.085, .36), shirt, [0, -.22, 0], [1, 1, 1], piv);
    M(SPH, skin, [0, -.48, 0], [.1, .1, .1], piv);
    arms.push(piv);
  }
  const head = new THREE.Group(); head.position.y = 1.28; body.add(head);
  M(SPH, skin, [0, 0, 0], [.5, .47, .46], head);
  const eyes = new THREE.Group(); eyes.position.y = .02; head.add(eyes);
  for (const s of [-1, 1]) {
    M(SPH, skin, [s * .48, -.02, 0], [.09, .12, .07], head);
    M(SPH, WHITE_M, [s * .17, 0, .37], [.1, .12, .07], eyes);
    M(SPH, INK_M, [s * .17, -.01, .43], [.065, .08, .04], eyes);
    M(SPH, WHITE_M, [s * .17 + .025, .03, .465], [.02, .02, .01], eyes);
    M(SPH, mat(0xff8fa3, .6), [s * .3, -.14, .35], [.07, .045, .03], head);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.08, .02, 8, 16, Math.PI), INK_M);
  smile.position.set(0, -.16, .43); smile.rotation.z = Math.PI; head.add(smile);
  const mouth = M(SPH, mat(0x8a2a3a, .5), [0, -.19, .42], [.08, .01, .03], head);
  if (p.glasses) {
    const fr = mat('#ffffff', .3);
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.13, .022, 8, 24), fr);
      ring.position.set(s * .17, .01, .46); head.add(ring);
    }
    M(BOX, fr, [0, .04, .47], [.1, .025, .02], head);
  }
  addHair(head, p, hair);

  g.userData = { kid: true, p, arms, legs, body, head, eyes, mouth, smile,
    pos: new THREE.Vector3(), tPos: new THREE.Vector3(), speed: 1.6, look: 0, wave: 0, tWave: 0, both: 0, tBoth: 0, talking: false, sleep: false, shy: 0,
    jump: { y: 0, v: 0 }, phase: rand() * 6, blinkAt: 1 + rand() * 3, blinkEnd: 0, face: 0 };
  return g;
}

// Resolves when the kid has walked to its target (or after `ms` as a safety net).
export async function arrive(k, ms = 6000) {
  const end = performance.now() + ms;
  while (k.userData.pos.distanceTo(k.userData.tPos) > .05 && performance.now() < end) await new Promise(r => setTimeout(r, 100));
}

export function placeKid(k, x, y, z) { k.userData.pos.set(x, y, z); k.userData.tPos.set(x, y, z); k.position.set(x, y, z); }

export function updateKid(k, dt, t) {
  const u = k.userData;
  const before = u.pos.clone();
  const step = Math.min(1, dt * u.speed / Math.max(.001, u.pos.distanceTo(u.tPos)));
  u.pos.lerp(u.tPos, step);
  const moving = u.pos.distanceTo(before) / Math.max(dt, 1e-4) > .2;
  u.jump.v -= 22 * dt; u.jump.y += u.jump.v * dt;
  if (u.jump.y < 0) { u.jump.y = 0; u.jump.v = 0; }
  const bounce = moving ? Math.abs(Math.sin(t * 12)) * .06 : 0;
  k.position.set(u.pos.x, u.pos.y + u.jump.y + bounce, u.pos.z);
  const faceTarget = moving ? Math.atan2(u.tPos.x - u.pos.x, u.tPos.z - u.pos.z) : u.look;
  u.face += (faceTarget - u.face) * (1 - Math.exp(-dt * 8));
  k.rotation.y = u.face;
  u.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 12 + i * Math.PI) * .5 : 0; });

  u.wave += (u.tWave - u.wave) * (1 - Math.exp(-dt * 8));
  u.both += (u.tBoth - u.both) * (1 - Math.exp(-dt * 4));
  const [left, right] = u.arms;
  const swing = moving ? Math.sin(t * 12) * .4 : 0;
  right.rotation.set(-swing, 0, .12 + u.wave * (2.3 + Math.sin(t * 12) * .35) + u.both * 2.6);
  left.rotation.set(swing, 0, -.12 - Math.sin(t * 1.5 + u.phase) * .03 - u.both * 2.6);
  u.body.scale.y = 1 + Math.sin(t * 2 + u.phase) * .012;
  u.head.rotation.z = Math.sin(t * 1.1 + u.phase) * .05 + u.shy * Math.sin(t * 14) * .25 + (u.sleep ? .25 : 0);
  u.shy = Math.max(0, u.shy - dt * 1.2);

  if (t > u.blinkAt) { u.blinkEnd = t + .13; u.blinkAt = t + 2 + rand() * 3; }
  u.eyes.scale.y = u.sleep || t < u.blinkEnd ? .12 : 1;
  const open = u.talking ? .015 + Math.abs(Math.sin(t * 16)) * .06 : .005;
  u.mouth.scale.y += (open - u.mouth.scale.y) * .5;
  u.smile.visible = !u.talking;
}

// Kid speaks a line: mouth moves, arm waves, a speech bubble follows the head.
export async function kidSay(k, text, { wave = true, bubble } = {}) {
  const u = k.userData;
  u.talking = true; if (wave) u.tWave = 1;
  if (bubble) bubble.show(k, text);
  await say(text, .85, u.p.voice || 1.1);
  u.talking = false; u.tWave = 0;
  if (bubble) bubble.hideLater(k, 900);
}

// HTML speech bubble anchored above a kid's head.
export function createSpeech(camera) {
  const el = document.createElement('div');
  el.className = 'speech hidden';
  document.body.appendChild(el);
  let owner = null, timer = 0;
  const v = new THREE.Vector3();
  return {
    el,
    show(k, text) { clearTimeout(timer); owner = k; el.textContent = text.toUpperCase(); el.classList.remove('hidden'); },
    hide() { owner = null; el.classList.add('hidden'); },
    hideLater(k, ms) { clearTimeout(timer); timer = setTimeout(() => { if (owner === k) this.hide(); }, ms); },
    update() {
      if (!owner) return;
      owner.updateWorldMatrix(true, false);
      v.set(0, 2.75, 0).applyMatrix4(owner.matrixWorld);
      const p = toScreen(camera, v);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    },
  };
}

// ---------- the island ----------
export function makeIsland() {
  const g = new THREE.Group();
  const grass = M(CYL, mat('#7ccf5a', .85), [0, -.15, 0], [6.2, .3, 3.2], g); grass.receiveShadow = true;
  M(CYL, mat('#b07a4a', .9), [0, -.6, 0], [6, .6, 3.05], g);
  M(CONE, mat('#9a6a40', .9), [0, -1.5, 0], [5.6, 1.2, 2.8], g).rotation.x = Math.PI;
  const path = M(CYL, mat('#f3dca3', .9), [.6, .005, .8], [.7, .02, 1.6], g); path.receiveShadow = true; path.rotation.y = .3;

  const house = new THREE.Group(); house.position.set(1.4, 0, -1.7); g.add(house);
  M(BOX, mat('#fff1d6', .8), [0, .6, 0], [1.8, 1.2, 1.2], house).receiveShadow = true;
  M(CONE, mat('#d0643f', .7), [0, 1.55, 0], [1.55, .8, 1.05], house).rotation.y = Math.PI / 4;
  M(BOX, mat('#c0583a', .8), [.5, 1.7, -.1], [.2, .5, .2], house);
  M(BOX, mat('#8b4513', .7), [0, .32, .61], [.34, .62, .03], house);
  const windows = [-.55, .55].map(x => {
    const w = M(BOX, new THREE.MeshStandardMaterial({ color: '#bfe9ff', roughness: .3, emissive: '#ffd66b', emissiveIntensity: 0 }), [x, .72, .61], [.32, .3, .03], house);
    return w;
  });

  const trunk = mat('#8b5a2b', .8), leaves = mat('#3fb44a', .7);
  [[-4.3, -1.1, 1], [4.6, -.6, .9], [-2.9, -2.2, 1.2], [3.6, -2.1, .8]].forEach(([x, z, s]) => {
    M(CYL, trunk, [x, .35 * s, z], [.12 * s, .7 * s, .12 * s], g);
    M(SPH, leaves, [x, .95 * s, z], [.55 * s, .6 * s, .55 * s], g);
  });
  const pond = M(CYL, mat('#6cc6f0', .2), [-3.4, .01, 1.3], [1, .02, .55], g); pond.receiveShadow = true;
  const petal = [mat('#ff7ec1', .6), mat('#ffd60a', .6), mat('#ffffff', .6)];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, r = 2 + rand() * 3.6, x = Math.cos(a) * r, z = Math.sin(a) * r * .5;
    if (Math.abs(x) < 3.8 && z > 0) continue;
    M(SPH, petal[i % 3], [x, .08, z], [.08, .08, .08], g);
  }
  return { group: g, windows };
}

export function makeSun() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ffd60a', emissive: '#ffb300', emissiveIntensity: .5, roughness: .5 });
  M(SPH, m, [0, 0, 0], [.6, .6, .35], g);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    M(CONE, m, [Math.cos(a) * .8, Math.sin(a) * .8, 0], [.13, .3, .08], g).rotation.z = a - Math.PI / 2;
  }
  for (const s of [-1, 1]) M(SPH, INK_M, [s * .18, .08, .2], [.05, .07, .03], g);
  const sm = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 8, 16, Math.PI), INK_M);
  sm.position.set(0, -.08, .2); sm.rotation.z = Math.PI; g.add(sm);
  return g;
}
export function makeMoon() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffe066', emissiveIntensity: .6, roughness: .5 });
  const c = new THREE.Mesh(new THREE.TorusGeometry(.45, .2, 16, 40, Math.PI * 1.1), m);
  c.rotation.z = -Math.PI * .55; g.add(c);
  return g;
}
export function makeStars(n = 14) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? .07 : .17, a = i / 10 * Math.PI * 2 + Math.PI / 2;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: false });
  const m = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffe066', emissiveIntensity: .9 });
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(geo, m);
    s.position.set((rand() - .5) * 14, 1 + rand() * 3, -3 - rand() * 2);
    s.scale.setScalar(.6 + rand() * .8); s.userData.phase = rand() * 6;
    g.add(s);
  }
  return g;
}
export function makeCloud() {
  const g = new THREE.Group(), m = mat('#ffffff', .9);
  [[0, 0, .5], [.5, .1, .4], [-.5, .05, .38], [.2, .3, .38]].forEach(([x, y, r]) => M(SPH, m, [x, y, 0], [r, r * .85, r * .7], g));
  return g;
}
