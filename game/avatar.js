// Blocky R6-style characters, accessories and pets.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { plastic, canvasTex, textSprite, chatBubble } from './engine.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const HEAD = new RoundedBoxGeometry(1, 1, 1, 3, .16);
function part(geo, mat, [x, y, z], [w, h, d], parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(w, h, d); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

const faceTex = canvasTex(256, 256, (x) => {
  x.fillStyle = '#1b1b1b';
  for (const cx of [86, 170]) { x.beginPath(); x.ellipse(cx, 104, 16, 26, 0, 0, 7); x.fill(); }
  x.fillStyle = '#fff'; for (const cx of [92, 176]) { x.beginPath(); x.arc(cx, 94, 6, 0, 7); x.fill(); }
  x.strokeStyle = '#1b1b1b'; x.lineWidth = 12; x.lineCap = 'round';
  x.beginPath(); x.arc(128, 142, 46, .2 * Math.PI, .8 * Math.PI); x.stroke();
});
const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true });

export const SKINS = ['#f5cd30', '#f8d5b8', '#d69a6c', '#8a5a3c'];
export const HAIR_COLORS = ['#2b2220', '#6b3f22', '#f2c94c', '#d8662c', '#ff7ec1', '#1e9bf0'];
export const HAIRS = ['none', 'short', 'spiky', 'long', 'buns', 'ponytail'];

function hair(head, p) {
  const m = plastic(p.hairColor || '#2b2220', .7), s = p.hair;
  if (!s || s === 'none') return;
  if (s === 'cap') {
    const c = plastic(p.capColor || '#4cc13a', .6);
    part(BOX, plastic(p.hairColor, .7), [0, .1, -.08], [1.14, .6, 1.02], head);
    part(BOX, c, [0, .58, 0], [1.16, .3, 1.16], head);
    part(BOX, c, [0, .46, .7], [.9, .08, .5], head);
    return;
  }
  part(BOX, m, [0, .56, -.02], [1.16, .22, 1.16], head);
  part(BOX, m, [0, .2, -.52], [1.16, .8, .16], head);
  if (s === 'short') part(BOX, m, [0, .42, .55], [1.1, .16, .12], head);
  if (s === 'spiky') for (let i = 0; i < 6; i++) {
    const c = part(new THREE.ConeGeometry(.5, 1, 4), m, [-.4 + (i % 3) * .4, .8, i < 3 ? .2 : -.25], [.4, .5, .4], head);
    c.rotation.set(i < 3 ? .3 : -.3, Math.PI / 4, (i % 3 - 1) * .3);
  }
  if (s === 'long') { part(BOX, m, [0, -.2, -.5], [1.16, 1.3, .2], head); for (const x of [-1, 1]) part(BOX, m, [x * .56, -.05, -.05], [.12, 1, .9], head); }
  if (s === 'buns') for (const x of [-1, 1]) part(HEAD, m, [x * .42, .82, -.05], [.5, .5, .5], head);
  if (s === 'ponytail') { part(BOX, m, [0, .1, -.72], [.36, .8, .3], head); part(BOX, plastic('#ffd60a'), [0, .5, -.64], [.4, .12, .12], head); }
}

// Accessories bought in the shop.
export const ITEMS = [
  { id: 'party', slot: 'hat', name: 'Party hat', price: 10, icon: '🥳' },
  { id: 'cap', slot: 'hat', name: 'Red cap', price: 15, icon: '🧢' },
  { id: 'tophat', slot: 'hat', name: 'Top hat', price: 25, icon: '🎩' },
  { id: 'crown', slot: 'hat', name: 'Crown', price: 60, icon: '👑' },
  { id: 'halo', slot: 'hat', name: 'Halo', price: 40, icon: '😇' },
  { id: 'wings', slot: 'back', name: 'Wings', price: 50, icon: '🪽' },
  { id: 'cape', slot: 'back', name: 'Super cape', price: 30, icon: '🦸' },
  { id: 'dog', slot: 'pet', name: 'Puppy', price: 45, icon: '🐶' },
  { id: 'cat', slot: 'pet', name: 'Kitty', price: 45, icon: '🐱' },
  { id: 'dragon', slot: 'pet', name: 'Dragon', price: 90, icon: '🐲' },
];
function hat(head, id) {
  if (id === 'party') {
    const c = part(new THREE.ConeGeometry(.5, 1, 16), plastic('#ff5c8a'), [.1, 1.05, 0], [.8, 1, .8], head); c.rotation.z = -.15;
    part(new THREE.SphereGeometry(.5, 12, 8), plastic('#ffd60a'), [.18, 1.58, 0], [.25, .25, .25], head);
  }
  if (id === 'cap') { part(BOX, plastic('#e8262b'), [0, .66, 0], [1.2, .3, 1.2], head); part(BOX, plastic('#e8262b'), [0, .55, .75], [1, .08, .55], head); }
  if (id === 'tophat') { part(new THREE.CylinderGeometry(.5, .5, 1, 24), plastic('#1d1d24', .4), [0, 1.15, 0], [1, .9, 1], head); part(new THREE.CylinderGeometry(.5, .5, 1, 24), plastic('#1d1d24', .4), [0, .7, 0], [1.6, .08, 1.6], head); part(new THREE.CylinderGeometry(.5, .5, 1, 24), plastic('#e8262b'), [0, .82, 0], [1.02, .15, 1.02], head); }
  if (id === 'crown') {
    const g = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: .8, roughness: .25 });
    part(new THREE.CylinderGeometry(.5, .5, 1, 8, 1, true), g, [0, .82, 0], [1.1, .35, 1.1], head);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part(new THREE.ConeGeometry(.5, 1, 4), g, [Math.cos(a) * .52, 1.08, Math.sin(a) * .52], [.2, .3, .2], head); }
    part(new THREE.SphereGeometry(.5, 12, 8), plastic('#e8262b', .2), [0, .85, .55], [.18, .18, .1], head);
  }
  if (id === 'halo') {
    const h = new THREE.Mesh(new THREE.TorusGeometry(.5, .08, 10, 32), new THREE.MeshStandardMaterial({ color: '#fff3a0', emissive: '#ffe066', emissiveIntensity: 1.2 }));
    h.rotation.x = Math.PI / 2; h.position.y = 1.05; head.add(h); h.userData.spin = true;
  }
}
function back(torso, id) {
  if (id === 'wings') {
    const m = plastic('#ffffff', .4), wings = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(s * .25, .3, -.45); torso.add(piv);
      const w = part(BOX, m, [s * .9, .2, 0], [1.8, 1.1, .1], piv); w.rotation.z = s * .25;
      part(BOX, plastic('#bfe6ff'), [s * 1.5, -.1, 0], [.8, .8, .12], piv);
      piv.userData.side = s; wings.push(piv);
    }
    torso.userData.wings = wings;
  }
  if (id === 'cape') {
    const c = part(BOX, plastic('#e8262b', .7), [0, -.35, -.48], [1.5, 2.1, .08], torso); c.rotation.x = .12;
    torso.userData.cape = c;
  }
}

// p: { skin, shirt, pants, hair, hairColor, capColor, dress, stripes, glasses, hat, back, name }
export function makeBlocky(p) {
  const g = new THREE.Group();
  const skin = plastic(p.skin), shirt = plastic(p.shirt), pants = plastic(p.dress ? p.skin : p.pants);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * .4, 1.6, 0); g.add(piv);
    part(BOX, pants, [0, -.8, 0], [.78, 1.6, .8], piv);
    part(BOX, plastic('#2a2a30'), [0, -1.5, .06], [.8, .22, .9], piv);
    legs.push(piv);
  }
  const torso = new THREE.Group(); torso.position.y = 2.4; g.add(torso);
  part(BOX, shirt, [0, 0, 0], [1.6, 1.6, .8], torso);
  if (p.dress) part(BOX, shirt, [0, -.95, 0], [1.9, .6, 1.05], torso);
  if (p.stripes) for (const y of [-.35, .2]) part(BOX, plastic(p.stripes), [0, y, 0], [1.62, .22, .82], torso);
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 1.2, .7, 0); torso.add(piv);
    part(BOX, shirt, [0, -.3, 0], [.78, .62, .8], piv);
    part(BOX, skin, [0, -1.05, 0], [.76, .9, .78], piv);
    arms.push(piv);
  }
  const head = new THREE.Group(); head.position.y = 1.4; torso.add(head);
  part(HEAD, skin, [0, 0, 0], [1.1, 1.1, 1.1], head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.95, .95), faceMat); face.position.z = .56; head.add(face);
  if (p.glasses) {
    const f = plastic(p.glasses, .3);
    for (const s of [-1, 1]) {
      part(BOX, f, [s * .25, .16, .57], [.34, .06, .04], head); part(BOX, f, [s * .25, -.08, .57], [.34, .06, .04], head);
      part(BOX, f, [s * .41, .04, .57], [.06, .3, .04], head); part(BOX, f, [s * .09, .04, .57], [.06, .3, .04], head);
    }
  }
  hair(head, p);
  if (p.hat) hat(head, p.hat);
  if (p.back) back(torso, p.back);

  const tag = textSprite(p.name || '', { size: 60, height: .9 }); tag.position.y = 5.6; g.add(tag);
  const bubble = chatBubble(); bubble.position.y = 7; g.add(bubble);
  g.userData = { legs, arms, torso, head, tag, bubble, wave: 0, tWave: 0, cheer: 0, phase: Math.random() * 6, p };
  return g;
}

// speed01: 0 idle .. 1 running; air: in the air.
export function animateBlocky(g, dt, t, speed01 = 0, air = false) {
  const u = g.userData;
  u.wave += (u.tWave - u.wave) * (1 - Math.exp(-dt * 10));
  u.cheer = Math.max(0, u.cheer - dt);
  const sw = air ? .6 : Math.sin(t * 11 + u.phase) * .9 * speed01;
  u.legs[0].rotation.x = air ? -.5 : sw; u.legs[1].rotation.x = air ? .3 : -sw;
  const idle = Math.sin(t * 2 + u.phase) * .05;
  u.arms[0].rotation.set(air ? -2.6 : -sw + idle, 0, u.cheer > 0 ? -2.6 : 0);
  u.arms[1].rotation.set(air ? -2.6 : sw - idle, 0, 0);
  if (u.wave > .01) u.arms[1].rotation.set(0, 0, u.wave * (2.6 + Math.sin(t * 14) * .35));
  if (u.cheer > 0) u.arms[1].rotation.set(0, 0, 2.6);
  u.torso.position.y = 2.4 + Math.abs(Math.sin(t * 11)) * .08 * speed01;
  u.head.rotation.y = Math.sin(t * .7 + u.phase) * .1 * (1 - speed01);
  u.head.traverse(o => { if (o.userData.spin) o.rotation.z += dt * 2; });
  if (u.torso.userData.wings) u.torso.userData.wings.forEach(w => { w.rotation.y = w.userData.side * (.3 + Math.sin(t * (air ? 18 : 3)) * (air ? .5 : .12)); });
  if (u.torso.userData.cape) u.torso.userData.cape.rotation.x = .12 + speed01 * .5 + (air ? .5 : 0) + Math.sin(t * 8) * .05 * speed01;
}

export function say(g, text, ms = 3000) {
  const b = g.userData.bubble;
  b.userData.set(text);
  clearTimeout(b.userData.timer);
  b.userData.timer = setTimeout(() => { b.visible = false; }, ms);
}

// Pets follow the player around.
export function makePet(id) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  if (id === 'dog' || id === 'cat') {
    const c = plastic(id === 'dog' ? '#c88a4a' : '#9aa0aa');
    part(HEAD, c, [0, .7, 0], [1, .8, 1.4], body);
    part(HEAD, c, [0, 1.35, .7], [.95, .85, .85], body);
    for (const [x, z] of [[-.3, .45], [.3, .45], [-.3, -.45], [.3, -.45]]) part(BOX, c, [x, .2, z], [.25, .45, .25], body);
    if (id === 'dog') for (const s of [-1, 1]) part(BOX, plastic('#7a4a22'), [s * .5, 1.3, .7], [.18, .6, .35], body);
    else for (const s of [-1, 1]) part(new THREE.ConeGeometry(.5, 1, 4), c, [s * .28, 1.9, .65], [.3, .35, .2], body);
    const tail = part(BOX, c, [0, 1, -.8], [.15, .15, .6], body); tail.rotation.x = -.6;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.75, .75), faceMat); f.position.set(0, 1.35, 1.13); body.add(f);
  } else {
    const c = plastic('#4cc13a');
    part(HEAD, c, [0, .9, 0], [.9, .9, 1.3], body);
    part(HEAD, c, [0, 1.5, .75], [.8, .7, .8], body);
    for (const s of [-1, 1]) { const w = part(BOX, plastic('#ff8a1c'), [s * .9, 1.2, 0], [1.1, .08, .7], body); w.userData.side = s; body.userData.wings = [...(body.userData.wings || []), w]; }
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.65, .65), faceMat); f.position.set(0, 1.5, 1.16); body.add(f);
  }
  g.userData = { body, id, fly: id === 'dragon' };
  return g;
}
export function animatePet(pet, target, facing, dt, t) {
  const u = pet.userData;
  const want = new THREE.Vector3(Math.sin(facing + 2.4) * 3.2, 0, Math.cos(facing + 2.4) * 3.2).add(target);
  const d = want.distanceTo(pet.position);
  pet.position.lerp(want, 1 - Math.exp(-dt * 4));
  pet.position.y = target.y + (u.fly ? 3 + Math.sin(t * 3) * .4 : Math.abs(Math.sin(t * 10)) * .3 * Math.min(1, d));
  pet.rotation.y = facing;
  u.body.userData.wings?.forEach(w => { w.rotation.z = w.userData.side * Math.sin(t * 12) * .5; });
}

// The four friends from the book, blocky.
export const NPCS = {
  chen: { name: 'Chen', skin: '#f8d5b8', shirt: '#ff8a1c', stripes: '#e8262b', pants: '#3e8e3e', hair: 'cap', hairColor: '#2b2220', capColor: '#4cc13a', voice: .9, line: "Hello! I'm Chen." },
  ella: { name: 'Ella', skin: '#d69a6c', shirt: '#7fd6a8', dress: true, hair: 'ponytail', hairColor: '#2b2220', voice: 1.35, line: 'Hi! My name is Ella.' },
  mark: { name: 'Mark', skin: '#f8d5b8', shirt: '#1e62c8', pants: '#8fd14f', hair: 'spiky', hairColor: '#f2c94c', voice: 1, line: 'Hi! I am Mark.' },
  asha: { name: 'Asha', skin: '#8a5a3c', shirt: '#ff8fb1', pants: '#4a7fd4', hair: 'buns', hairColor: '#2b2220', glasses: '#ffffff', voice: 1.3, line: 'Hello! My name is Asha.' },
};
