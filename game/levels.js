// The lobby and the four lesson obbies. Each level builds its world and runs its challenges through G (game services from main.js).
import * as THREE from 'three';
import { block, trigger, boxAt, tick, W, player, plastic, canvasTex, textSprite, roundRect, FONT, removeSolid } from './engine.js';
import { makeBlocky, animateBlocky, NPCS } from './avatar.js';
import { COLOURS, WHITE, byId, shuffle, pick, wait, cap } from '../shared/common.js';

const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const up2 = new THREE.Vector3(0, 2, 0), tmpv = new THREE.Vector3();

// ---------- textures ----------
function cardTex(draw, border = '#3cc3c8') {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#fff'; roundRect(x, 8, 8, 240, 240, 40); x.fill();
    x.lineWidth = 12; x.strokeStyle = border; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    draw(x);
  });
}
const emojiTex = (e, { gray = false, label = '', border } = {}) => cardTex(x => {
  if (gray) x.filter = 'grayscale(1) brightness(1.15)';
  x.font = `${label ? 140 : 170}px ${EMOJI}`; x.fillText(e, 128, label ? 112 : 136);
  x.filter = 'none';
  if (label) { x.font = `700 38px ${FONT}`; x.fillStyle = '#1b2733'; x.fillText(label.toUpperCase(), 128, 214, 220); }
}, border);
const letterTex = (L, color = '#1e9bf0') => cardTex(x => { x.font = `700 190px ${FONT}`; x.fillStyle = color; x.fillText(L, 128, 142); }, color);
const greetTex = (icon, text) => cardTex(x => {
  x.font = `110px ${EMOJI}`; x.fillText(icon, 128, 96);
  x.font = `700 36px ${FONT}`; x.fillStyle = '#1b2733';
  const words = text.toUpperCase().split(' ');
  if (words.length > 1) { x.fillText(words[0], 128, 180); x.fillText(words.slice(1).join(' '), 128, 218); } else x.fillText(words[0], 128, 196);
});
const blockTex = (L, bg) => canvasTex(256, 256, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(0,0,0,.15)'; x.lineWidth = 16; x.strokeRect(0, 0, 256, 256);
  x.font = `700 200px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 14; x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeText(L, 128, 142);
  x.fillStyle = '#fff'; x.fillText(L, 128, 142);
});

// ---------- world pieces ----------
function water() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: '#3aa7e8', roughness: .15, metalness: .1, transparent: true, opacity: .9 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -14; W.root.add(m);
}
function island(x, z, w, d, color = '#6cc24a', top = 0) {
  block(x, top, z, w, 1.6, d, color);
  block(x, top - 1.6, z, w - 1.2, 7, d - 1.2, '#9a6a3c', { studs: false });
}
function tree(x, top, z, s = 1) {
  block(x, top + 3 * s, z, .9 * s, 3 * s, .9 * s, '#8b5a2b', { studs: false });
  block(x, top + 6 * s, z, 4 * s, 3 * s, 4 * s, '#3fb44a');
  block(x, top + 7.5 * s, z, 2.6 * s, 1.5 * s, 2.6 * s, '#56d15f');
}
function cloud(x, y, z, s = 1) {
  block(x, y, z, 10 * s, 2.5 * s, 6 * s, '#ffffff', { studs: false, solid: false, rough: .9 });
  block(x + 2 * s, y + 1.5 * s, z, 5 * s, 1.8 * s, 4 * s, '#ffffff', { studs: false, solid: false, rough: .9 });
}
function sprite(tex, x, y, z, s) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false }));
  sp.position.set(x, y, z); sp.scale.set(s, s, 1); W.root.add(sp); return sp;
}
function sign(text, x, y, z, bg = '#ff3b5c', h = 2.4) {
  const s = textSprite(text, { size: 80, height: h, bg, stroke: null }); s.position.set(x, y, z); W.root.add(s); return s;
}

const COIN_GEO = new THREE.CylinderGeometry(.9, .9, .25, 24);
const COIN_MAT = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: .7, roughness: .25, emissive: '#7a5200', emissiveIntensity: .45 });
function coin(G, x, top, z) {
  const piv = new THREE.Group(); piv.position.set(x, top + 1.8, z); W.root.add(piv);
  const m = new THREE.Mesh(COIN_GEO, COIN_MAT); m.rotation.x = Math.PI / 2; m.castShadow = true; piv.add(m);
  const fn = tick((dt, t) => {
    piv.rotation.y += dt * 3; piv.position.y = top + 1.8 + Math.sin(t * 3 + x + z) * .2;
    if (piv.position.distanceTo(tmpv.copy(player.pos).add(up2)) < 2.6) {
      W.root.remove(piv); W.tickers.splice(W.tickers.indexOf(fn), 1); G.coin(1);
    }
  });
}
// Stepping stones (with coins) from (x, z1) to (x, z2); tops go from t1 to t2.
function stones(G, x, z1, z2, n, t1 = 0, t2 = t1, color = '#ffffff') {
  for (let i = 1; i <= n; i++) {
    const f = i / (n + 1), z = z1 + (z2 - z1) * f, top = t1 + (t2 - t1) * f;
    block(x, top, z, 4.6, 1.2, 4.6, color);
    coin(G, x, top, z);
  }
}
function checkpoint(G, x, top, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 7, 10), plastic('#dddddd'));
  pole.position.set(x + 5, top + 3.5, z); pole.castShadow = true; W.root.add(pole);
  const flagMat = new THREE.MeshStandardMaterial({ color: '#ff3b5c', roughness: .6 });
  const flag = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, .1), flagMat); flag.position.set(x + 6.3, top + 6.1, z); W.root.add(flag);
  let on = false;
  trigger(boxAt(x, top, z, 30, 6, 6), () => {
    player.spawn.set(x, top, z); player.spawnYaw = 0;
    if (!on) { on = true; flagMat.color.set('#4cc13a'); G.checkpoint(); }
  });
  tick((dt, t) => { flag.rotation.y = Math.sin(t * 3) * .2; });
}
function gate(x, top, z, w = 16) {
  const s = block(x, top + 8, z, w, 8, 1, '#ff3b5c', { studs: false });
  s.mesh.material = new THREE.MeshStandardMaterial({ color: '#ff3b5c', transparent: true, opacity: .5, emissive: '#ff3b5c', emissiveIntensity: .7 });
  const lock = textSprite('🔒', { size: 120, height: 3, stroke: null }); lock.position.set(x, top + 10, z); W.root.add(lock);
  return {
    open() {
      removeSolid(s); lock.visible = false;
      const fn = tick(dt => { s.mesh.scale.y = Math.max(.01, s.mesh.scale.y - dt * 2.5); s.mesh.position.y = top + 4 * s.mesh.scale.y; if (s.mesh.scale.y <= .01) { s.mesh.visible = false; W.tickers.splice(W.tickers.indexOf(fn), 1); } });
    },
  };
}
function trophy(G, x, top, z) {
  const g = new THREE.Group(); g.position.set(x, top, z); g.visible = false; W.root.add(g);
  block(x, top + 1.2, z, 4, 1.2, 4, '#ffffff');
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: .85, roughness: .2, emissive: '#6a4500', emissiveIntensity: .3 });
  const cup = new THREE.Group(); cup.position.y = 1.2; g.add(cup);
  const add = (geo, p, r) => { const m = new THREE.Mesh(geo, gold); m.position.set(...p); if (r) m.rotation.set(...r); m.castShadow = true; cup.add(m); };
  add(new THREE.CylinderGeometry(1.4, .6, 2, 24, 1, true), [0, 2.6, 0]);
  add(new THREE.CylinderGeometry(.25, .25, 1.2, 12), [0, 1.2, 0]);
  add(new THREE.CylinderGeometry(1, 1, .4, 24), [0, .4, 0]);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(.55, .14, 8, 16), [s * 1.45, 2.6, 0], [0, 0, 0]);
  let got = false;
  tick((dt, t) => { cup.rotation.y += dt * 1.5; cup.position.y = 1.2 + Math.sin(t * 2) * .25; });
  const tr = trigger(boxAt(x, top, z, 5, 6, 5), () => { if (!got && g.visible) { got = true; G.complete(); } });
  return { reveal() { g.visible = true; G.sparkle(new THREE.Vector3(x, top + 4, z)); } };
}

// A row/grid of answer pads. set.round({...}) resolves when the right pad is stepped on.
function padSet(G, n, { x, z, top = 0, size = 6, gap = 1.6, cols = n }) {
  const pads = [];
  let handler = null;
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
    const px = x + (c - (inRow - 1) / 2) * (size + gap), pz = z + (r - (rows - 1) / 2) * (size + gap);
    const s = block(px, top + .6, pz, size, 1.4, size, '#ffffff', { studs: false });
    const topMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5, emissive: '#000000' });
    const sideMat = new THREE.MeshStandardMaterial({ color: '#d7e3ea', roughness: .6 });
    s.mesh.material = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const bb = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false })); bb.position.set(px, top + 5.2, pz); bb.scale.set(3.6, 3.6, 1); bb.visible = false; W.root.add(bb);
    const pad = { i, s, topMat, sideMat, bb, px, pz, flash: 0, flashColor: new THREE.Color() };
    trigger(boxAt(px, top + .6, pz, size - .8, 2.5, size - .8), () => handler?.(i));
    pads.push(pad);
  }
  let active = false;
  const glow = new THREE.Color();
  // While a question is open the pads softly pulse, so it's obvious they are the answers.
  tick((dt, t) => pads.forEach(p => {
    p.flash = Math.max(0, p.flash - dt * 1.6);
    p.topMat.emissive.copy(p.flashColor).multiplyScalar(p.flash).add(glow.setScalar(active ? .12 + Math.sin(t * 5) * .08 : 0));
  }));
  const look = (p, { tex, color = '#ffffff' }) => {
    p.topMat.map = tex || null; p.topMat.color.set(tex ? '#ffffff' : color); p.topMat.needsUpdate = true;
    p.sideMat.color.set(color === '#ffffff' ? '#d7e3ea' : color);
    p.bb.visible = !!tex; if (tex) { p.bb.material.map = tex; p.bb.material.needsUpdate = true; }
  };
  return {
    pads,
    look,
    // opts: [{tex?, color?}], correct: index; onWrong(i) for feedback.
    round({ opts, correct, onWrong }) {
      if (opts) opts.forEach((o, i) => look(pads[i], o));
      active = true;
      return new Promise(res => {
        handler = i => {
          const p = pads[i];
          if (i === correct) { handler = null; active = false; p.flashColor.set('#4cc13a'); p.flash = 1; res(i); }
          else { p.flashColor.set('#ff3b5c'); p.flash = 1; G.bad(); onWrong?.(i); }
        };
      });
    },
  };
}

function npc(G, id, x, top, z) {
  const g = makeBlocky(NPCS[id]);
  g.position.set(x, top, z); W.root.add(g);
  const u = g.userData;
  u.id = id; u.home = new THREE.Vector3(x, top, z);
  u.trig = trigger(boxAt(x, top, z, 4, 5, 4), () => u.onTouch?.(g));
  tick((dt, t) => {
    if (!g.visible) return;
    if (u.walkTo) {
      const dx = u.walkTo.x - g.position.x, dz = u.walkTo.z - g.position.z, L = Math.hypot(dx, dz);
      if (L < .2) { g.position.x = u.walkTo.x; g.position.z = u.walkTo.z; u.walkTo = null; moveNpc(g, g.position.x, g.position.z); u.onArrive?.(); }
      else { g.position.x += dx / L * Math.min(L, dt * 7); g.position.z += dz / L * Math.min(L, dt * 7); g.rotation.y = Math.atan2(dx, dz); animateBlocky(g, dt, t, 1, false); return; }
    }
    if (u.lying) { animateBlocky(g, dt, t, 0, false); return; }
    if (u.stretch) u.cheer = .3;
    const px = player.pos.x - g.position.x, pz = player.pos.z - g.position.z;
    const want = Math.hypot(px, pz) < 18 ? Math.atan2(px, pz) : 0;
    let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * (1 - Math.exp(-dt * 6));
    animateBlocky(g, dt, t, 0, false);
  });
  return g;
}
function moveNpc(g, x, z) {
  g.position.x = x; g.position.z = z;
  g.userData.trig.box = boxAt(x, g.position.y, z, 4, 5, 4);
}
const walkTo = (g, x, z) => new Promise(res => { g.userData.walkTo = new THREE.Vector3(x, 0, z); g.userData.onArrive = res; });
// Lays an NPC down on a bed (head towards -z); name tag and chat bubble stay above.
function lieDown(g, x, top, z) {
  const u = g.userData;
  u.lying = true; g.rotation.set(-Math.PI / 2, 0, 0); g.position.set(x, top + .45, z + 2.2);
  u.tag.position.set(0, 0, 3); u.bubble.position.set(0, 0, 4.6);
}
function bed(x, top, z, blanket = '#1e9bf0') {
  block(x, top + 1, z, 3.4, 1, 6.4, '#8b5a2b', { studs: false });
  block(x, top + 1.3, z - 2.4, 3, .3, 1.4, '#ffffff', { studs: false, solid: false });
  block(x, top + 1.5, z + .9, 3.2, .5, 3.8, blanket, { studs: false, solid: false });
  block(x, top + 2.4, z - 3.1, 3.4, 2.4, .4, '#8b5a2b', { studs: false });
  return top + 1;
}
function lamp(x, top, z) {
  block(x, top + 5, z, .4, 5, .4, '#3a3a44', { studs: false });
  const l = block(x, top + 6.2, z, 1.4, 1.2, 1.4, '#fff3b0', { studs: false });
  l.mesh.material = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffcc33', emissiveIntensity: 1.3 });
}
function house(x, top, z, lit = false) {
  block(x, top + 6, z, 8, 6, 6, '#fff1d6');
  block(x, top + 8.2, z, 9, 2.2, 7, '#d0643f');
  block(x, top + 3.4, z + 3.05, 2, 3.4, .2, '#8b4513', { studs: false, solid: false });
  for (const dx of [-2.6, 2.6]) {
    const w = block(x + dx, top + 4.6, z + 3.05, 1.6, 1.4, .2, '#bfe9ff', { studs: false, solid: false });
    if (lit) w.mesh.material = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffcc33', emissiveIntensity: 1.2 });
  }
  return { door: new THREE.Vector3(x, top, z + 3.4) };
}
// Resolves with the NPC the player touches when check(g) is true; wrong touches call onWrong(g).
function touchQuiz(npcs, check, onWrong) {
  return new Promise(res => {
    npcs.forEach(g => { g.userData.onTouch = n => { if (check(n)) { npcs.forEach(o => { o.userData.onTouch = null; }); res(n); } else onWrong?.(n); }; });
  });
}
const onEnter = (b, fn) => { let done = false; trigger(b, () => { if (!done) { done = true; fn(); } }); };
function flyAway(g) {
  const fn = tick(dt => { g.position.y += dt * 8; g.scale.multiplyScalar(1 - dt * .8); if (g.scale.x < .05) { g.visible = false; W.tickers.splice(W.tickers.indexOf(fn), 1); } });
}

// ---------- LOBBY ----------
const HUB = {
  title: 'LOBBY', icon: '🏠',
  build(G) {
    water();
    island(0, 0, 150, 140, '#5dbb46');
    block(0, .3, 42, 16, .3, 16, '#ffffff');
    const title = textSprite('STEFI WORLD', { size: 130, height: 7, color: '#ffd60a', stroke: '#1b1b1b' });
    title.position.set(0, 30, -14); W.root.add(title);
    const LESSONS = [
      { n: 1, name: 'HELLO!', color: '#4cc13a', icon: '👋' }, { n: 2, name: 'GREETINGS', color: '#7b3fb5', icon: '🌅' },
      { n: 3, name: 'ABC', color: '#1e9bf0', icon: '🔤' }, { n: 4, name: 'COLOURS', color: '#ff8a1c', icon: '🎨' },
    ];
    LESSONS.forEach((L, i) => {
      const x = -39 + i * 26, z = -14, open = G.isUnlocked(L.n);
      const c = open ? L.color : '#8a8f99';
      block(x - 6, 14, z, 2.4, 14, 2.4, c); block(x + 6, 14, z, 2.4, 14, 2.4, c); block(x, 16, z, 14.4, 2.4, 2.8, c);
      block(x, .8, z, 15, .8, 6, c);
      const swirl = canvasTex(256, 256, (g) => {
        for (let r = 128; r > 0; r -= 16) { g.fillStyle = (r / 16) % 2 ? (open ? L.color : '#6b7078') : '#ffffff'; g.beginPath(); g.arc(128, 128, r, 0, 7); g.fill(); }
      });
      swirl.center.set(.5, .5);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 12.8), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, opacity: open ? .85 : .5, side: THREE.DoubleSide }));
      plane.position.set(x, 7.2, z); W.root.add(plane);
      tick(dt => { swirl.rotation += dt * (open ? 1.5 : .2); });
      sign(`${L.icon} LESSON ${L.n}`, x, 19.6, z, c, 2.2);
      sign(L.name, x, 17.4, z + 1.6, '#1b2733', 1.4);
      if (G.isDone(L.n)) { const s = textSprite('✅', { size: 120, height: 3, stroke: null }); s.position.set(x, 23, z); W.root.add(s); }
      if (!open) {
        const bar = block(x, 14, z, 9.6, 14, 1, '#8a8f99', { studs: false }); bar.mesh.visible = false;
        const lock = textSprite('🔒', { size: 140, height: 4, stroke: null }); lock.position.set(x, 7, z + 1); W.root.add(lock);
        trigger(boxAt(x, 0, z + 1.8, 10, 10, 2), () => G.toast(`🔒 Termină întâi Lesson ${L.n - 1}!`));
      } else trigger(boxAt(x, 0, z, 9, 12, 2.4), () => G.enterLevel(L.n));
    });
    // Shop and wardrobe huts.
    [[-46, '🛒 SHOP', '#ffd60a', () => G.openShop()], [46, '👕 AVATAR', '#ff7ec1', () => G.openEditor()]].forEach(([x, label, col, open]) => {
      const z = 30;
      block(x, 7, z - 4, 12, 7, 1, '#fff1d6'); block(x - 5.5, 7, z, 1, 7, 8, '#fff1d6'); block(x + 5.5, 7, z, 1, 7, 8, '#fff1d6');
      block(x, 8, z, 13, 1, 10, col);
      sign(label, x, 11, z, col === '#ffd60a' ? '#e79a00' : '#ff5c8a', 2.4);
      const pad = block(x, .35, z + 2, 8, .35, 6, col);
      trigger(boxAt(x, 0, z + 2, 7, 4, 5), open, () => G.closePanels());
    });
    // Coin ring and a small parkour tower.
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; coin(G, Math.cos(a) * 13, 0, 14 + Math.sin(a) * 13); }
    [[-28, 2, 50], [-33, 4, 45], [-38, 6, 51], [-43, 8, 46], [-48, 10, 52]].forEach(([x, top, z], i) => {
      block(x, top, z, 4.4, 1.2, 4.4, ['#ff3b5c', '#ffd60a', '#4cc13a', '#1e9bf0', '#b05cd6'][i]); coin(G, x, top, z);
    });
    block(-54, 12, 46, 8, 1.2, 8, '#ffd60a'); for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) coin(G, -54 + dx, 12, 46 + dz);
    [[-62, -50], [62, -50], [-66, 10], [66, 12], [-60, 60], [60, 60], [20, 62], [-14, 64]].forEach(([x, z]) => tree(x, 0, z, 1.2));
    [[-70, 40, -60], [30, 46, -90], [90, 38, 0], [-100, 44, 20]].forEach(([x, y, z]) => cloud(x, y, z, 1.4));
    const mark = npc(G, 'mark', 9, 0, 36);
    mark.userData.onTouch = () => { mark.userData.tWave = 1; G.npcSay(mark, "Hi! Let's play!"); setTimeout(() => { mark.userData.tWave = 0; }, 1500); };
    const next = [1, 2, 3, 4].find(n => G.isUnlocked(n) && !G.isDone(n));
    if (next) {
      G.goal(new THREE.Vector3(-39 + (next - 1) * 26, 0, -14));
      G.note(`➡️ LESSON ${next}`, `Intră în portalul Lesson ${next}! Urmează săgeata galbenă.`);
    }
    return { spawn: [0, .3, 44], yaw: 0, sky: 'day' };
  },
};

// ---------- LESSON 1: HELLO, EVERYONE! ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GO = { ro: 'Poarta s-a deschis! Urmează săgeata galbenă.' };
const TROPHY = { ro: 'Ia trofeul! 🏆' };
const L1 = {
  title: 'LESSON 1 · HELLO!', icon: '👋',
  build(G) {
    const tk = G.token, alive = () => G.token === tk;
    water();
    island(0, 0, 30, 30, '#7ccf5a');
    sign('👋 LESSON 1 · HELLO, EVERYONE!', 0, 13, -14, '#4cc13a', 1.8);
    tree(-11, 0, 8); tree(11, 0, 9, .9);
    stones(G, 0, -15, -35, 2);
    G.goal(V(0, 0, -42));
    G.note('➡️ GO!', 'Urmează săgeata galbenă. Sari pe pietre cu SPACE!');

    // Island 1: meet the four friends.
    island(0, -50, 40, 30, '#7ccf5a');
    checkpoint(G, 0, 0, -38);
    const ids = ['chen', 'ella', 'mark', 'asha'];
    const A = ids.map((id, i) => npc(G, id, -12 + i * 8, 0, -56));
    const gateA = gate(0, 0, -64.5);
    onEnter(boxAt(0, 0, -48, 38, 6, 20), () => {
      G.stage(1, 3);
      const met = new Set();
      const nextGoal = () => { const n = A.find(g => !met.has(g)); G.goal(n ? n.position.clone() : null); };
      nextGoal();
      G.ask('Say hello to your friends! Touch each friend.', '👋 TOUCH EACH FRIEND!', { ro: 'Du-te la fiecare prieten, ca să se prezinte' });
      G.progress('0 / 4');
      A.forEach(g => {
        g.userData.onTouch = async n => {
          if (met.has(n)) return;
          met.add(n); nextGoal(); n.userData.tWave = 1; G.coin(1);
          G.progress(`${met.size} / 4`);
          const doneAll = met.size === 4;
          await G.npcSay(n, n.userData.p.line);
          n.userData.tWave = 0;
          if (doneAll && alive()) { G.progress(''); G.good(); gateA.open(); G.goal(V(0, 0, -102)); G.ask('Great! Go on!', '✅ GREAT! GO ON! ➡️', GO); }
        };
      });
    });
    stones(G, 0, -65, -95, 3);

    // Island 2: where is ...?
    island(0, -110, 40, 30, '#7ccf5a');
    checkpoint(G, 0, 0, -98);
    const B = ids.map((id, i) => npc(G, id, -12 + i * 8, 0, -116));
    const gateB = gate(0, 0, -124.5);
    onEnter(boxAt(0, 0, -108, 38, 6, 20), async () => {
      G.stage(2, 3); G.goal(null);
      let last = null;
      for (let r = 0; r < 3 && alive(); r++) {
        const xs = shuffle([-12, -4, 4, 12]);
        B.forEach((g, i) => moveNpc(g, xs[i], -116));
        const target = pick(B.filter(g => g !== last)); last = target;
        const name = target.userData.p.name;
        G.progress(`${r + 1} / 3`);
        G.ask(`Where is ${name}?`, '🔍 WHERE IS…? 🔊', { ro: 'Ascultă numele și du-te la prietenul acela' });
        await touchQuiz(B, g => g === target, g => { G.bad(); G.npcSay(g, `No! I'm ${g.userData.p.name}!`); });
        if (!alive()) return;
        target.userData.cheer = 1.5; G.coin(2); G.good(target.position);
        await G.npcSay(target, `Yes! I'm ${name}!`);
      }
      if (!alive()) return;
      G.progress(''); gateB.open(); G.goal(V(0, 3, -160)); G.ask('Super! Go on!', '✅ SUPER! GO ON! ➡️', GO);
    });
    stones(G, 0, -125, -155, 3, 0, 3);

    // Island 3: say your name on the stage.
    island(0, -170, 36, 30, '#7ccf5a', 3);
    checkpoint(G, 0, 3, -158);
    block(0, 4.2, -168, 8, 1.2, 8, '#ffd60a');
    sign('🎤 SAY YOUR NAME!', 0, 11, -168, '#ff5c8a', 2.2);
    const asha = npc(G, 'asha', -8, 3, -170), chen = npc(G, 'chen', 8, 3, -170);
    const mark = npc(G, 'mark', -13, 3, -176), ella = npc(G, 'ella', 13, 3, -176);
    const cup = trophy(G, 0, 3, -181);
    onEnter(boxAt(0, 3, -160, 34, 6, 6), () => {
      G.stage(3, 3); G.goal(V(0, 4.2, -168));
      G.ask('Go on the stage!', '🎤 GO ON THE STAGE!', { ro: 'Urcă pe scena galbenă' });
    });
    onEnter(boxAt(0, 4.2, -168, 7, 4, 7), async () => {
      G.goal(null);
      await G.npcSay(asha, "Hello! What's your name?");
      if (!alive()) return;
      await G.saidIt(`Hi! My name is ${G.name}.`, `HI! MY NAME IS ${G.name.toUpperCase()}.`);
      if (!alive()) return;
      [asha, chen, mark, ella].forEach(g => { g.userData.cheer = 2; });
      G.good(); G.coin(3);
      await G.npcSay(chen, `Hello, ${G.name}!`);
      cup.reveal(); G.goal(V(0, 3, -181)); G.ask('Get the trophy!', '🏆 GET THE TROPHY!', TROPHY);
    });
    return { spawn: [0, 0, 8], yaw: 0, sky: 'day' };
  },
};

// ---------- LESSON 2: GREETINGS ----------
// Each island is a little scene; the sky (sun low/high/setting, moon) tells the time of day.
const GREET = {
  hello: { text: 'Hello!', icon: '🙋', sky: 'day', bad: ['goodbye', 'night'], hint: 'Mark says hi! What do you say?' },
  morning: { text: 'Good morning!', icon: '🌅', sky: 'morning', bad: ['evening', 'night'], hint: 'Look! It is morning. Mark wakes up. What do you say?' },
  afternoon: { text: 'Good afternoon!', icon: '☀️', sky: 'afternoon', bad: ['morning', 'night'], hint: 'Look! The sun is high. It is afternoon. What do you say?' },
  evening: { text: 'Good evening!', icon: '🌇', sky: 'evening', bad: ['morning', 'afternoon'], hint: 'Look! The sun goes down. It is evening. What do you say?' },
  night: { text: 'Good night!', icon: '🌙', sky: 'night', bad: ['morning', 'afternoon'], hint: 'Look! The moon! It is night. Mark goes to bed. What do you say?' },
  goodbye: { text: 'Goodbye!', icon: '👋', sky: 'day', bad: ['hello', 'morning'], hint: 'Mark is going home. What do you say?' },
};
const RO_TIME = {
  hello: 'Mark vine la tine. Ce îi spui? Calcă pe salutul potrivit!',
  morning: 'E dimineață: soarele răsare. Calcă pe salutul potrivit!',
  afternoon: 'E după-amiază: soarele e sus. Calcă pe salutul potrivit!',
  evening: 'E seară: soarele apune. Calcă pe salutul potrivit!',
  night: 'E noapte: luna și stelele. Calcă pe salutul potrivit!',
  goodbye: 'Mark pleacă acasă. Ce îi spui? Calcă pe salutul potrivit!',
};
const L2 = {
  title: 'LESSON 2 · GREETINGS', icon: '🌅',
  build(G) {
    const tk = G.token, alive = () => G.token === tk;
    water();
    island(0, 0, 30, 30, '#7ccf5a');
    sign('🌅 LESSON 2 · GREETINGS', 0, 13, -14, '#7b3fb5', 1.8);
    tree(-11, 0, 8);
    const order = ['hello', 'morning', 'afternoon', 'evening', 'night', 'goodbye'];
    const centers = order.map((_, k) => -50 - k * 58);
    G.goal(V(0, 0, centers[0] + 10));
    G.note('➡️ GO!', 'Urmează săgeata galbenă. La fiecare insulă, uită-te la cer!');
    let prevEdge = -15;
    order.forEach((id, k) => {
      const g = GREET[id], zc = centers[k], front = zc + 15, back = zc - 15;
      stones(G, 0, prevEdge, front, Math.round((prevEdge - front) / 7) - 1);
      prevEdge = back;
      island(0, zc, 38, 30, id === 'night' ? '#3f8f4a' : '#7ccf5a');
      trigger(boxAt(0, -20, zc + 10, 60, 60, 50), () => G.sky(g.sky));
      checkpoint(G, 0, 0, front - 3);

      // The little scene for this time of day.
      let mark;
      if (id === 'hello') { mark = npc(G, 'mark', 0, 0, zc - 12); tree(-13, 0, zc - 8); }
      if (id === 'morning') { bed(-7, 0, zc - 8, '#ff9ec0'); mark = npc(G, 'mark', -2, 0, zc - 8); mark.userData.stretch = true; }
      if (id === 'afternoon') {
        mark = npc(G, 'mark', 0, 0, zc - 8);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.9, 20, 14), plastic('#e8262b', .4)); ball.castShadow = true; W.root.add(ball);
        tick((dt, t) => ball.position.set(4, 1 + Math.abs(Math.sin(t * 3)) * 3, zc - 7));
      }
      if (id === 'evening') { house(10, 0, zc - 10, true); lamp(-8, 0, zc - 4); lamp(8, 0, zc - 4); mark = npc(G, 'mark', 0, 0, zc - 8); }
      if (id === 'night') {
        const top = bed(0, 0, zc - 9, '#1e9bf0'); mark = npc(G, 'mark', 0, 0, zc - 9); lieDown(mark, 0, top, zc - 9);
        lamp(-6, 0, zc - 6);
        const z = textSprite('Z z z', { size: 90, height: 2.2, color: '#ffffff' }); W.root.add(z);
        tick((dt, t) => z.position.set(2 + Math.sin(t) * .5, 5 + (t % 2), zc - 10));
      }
      if (id === 'goodbye') {
        const h = house(12, 0, zc - 11);
        mark = npc(G, 'mark', 2, 0, zc - 6);
        const bag = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, .6), plastic('#ff8a1c')); bag.position.set(0, 0, -.7); mark.userData.torso.add(bag);
        mark.userData.door = h.door;
      }
      const set = padSet(G, 3, { x: 0, z: zc + 4 });
      const gt = id === 'goodbye' ? null : gate(0, 0, back + .5);
      const endCup = id === 'goodbye' ? trophy(G, -8, 0, zc - 10) : null;

      onEnter(boxAt(0, 0, zc + 10, 36, 6, 10), async () => {
        G.stage(k + 1, 6); G.goal(null);
        if (id === 'hello') { await walkTo(mark, 0, zc - 1); mark.userData.tWave = 1; }
        if (id === 'goodbye') mark.userData.tWave = 1;
        if (!alive()) return;
        const opts = shuffle([id, ...g.bad]);
        G.ask('Look! What do you say to Mark?', '🤔 WHAT DO YOU SAY TO MARK?', { hint: g.hint, ro: RO_TIME[id] });
        await set.round({
          opts: opts.map(o => ({ tex: greetTex(GREET[o].icon, GREET[o].text) })), correct: opts.indexOf(id),
          onWrong: i => { G.voice(GREET[opts[i]].text, 1.25); setTimeout(() => G.npcSay(mark, 'Hmm… no!'), 900); },
        });
        if (!alive()) return;
        G.coin(3); G.good(mark.position);
        await G.voice(g.text, 1.25);
        mark.userData.tWave = 1;
        await G.npcSay(mark, g.text);
        mark.userData.tWave = 0;
        if (!alive()) return;
        if (gt) { gt.open(); G.goal(V(0, 0, centers[k + 1] + 10)); G.ask('Go on!', '✅ GO ON! ➡️', GO); }
        else {
          mark.userData.tWave = 1;
          await walkTo(mark, mark.userData.door.x, mark.userData.door.z);
          mark.visible = false;
          endCup.reveal(); G.goal(V(-8, 0, zc - 10)); G.ask('Get the trophy!', '🏆 GET THE TROPHY!', TROPHY);
        }
      });
    });
    return { spawn: [0, 0, 8], yaw: 0, sky: 'day' };
  },
};

const ABC = [
  ['A', 'apple', '🍎'], ['B', 'bee', '🐝'], ['C', 'cat', '🐱'], ['D', 'dog', '🐶'], ['E', 'elephant', '🐘'], ['F', 'flower', '🌸'],
  ['G', 'giraffe', '🦒'], ['H', 'horse', '🐴'], ['I', 'ice cream', '🍦'], ['J', 'jeans', '👖'], ['K', 'koala', '🐨'], ['L', 'lemon', '🍋'],
  ['M', 'mouse', '🐭'], ['N', 'numbers', '🔢'], ['O', 'orange', '🍊'], ['P', 'pig', '🐷'], ['Q', 'queen', '👸'], ['R', 'robot', '🤖'],
  ['S', 'sun', '☀️'], ['T', 'tree', '🌳'], ['U', 'umbrella', '☂️'], ['V', 'violin', '🎻'], ['W', 'whale', '🐳'], ['X', 'xylophone', '🎹'],
  ['Y', 'yo-yo', '🪀'], ['Z', 'zebra', '🦓'],
].map(([L, word, emoji], i) => ({ L, word, emoji, color: ['#e8262b', '#ff8a1c', '#f2b800', '#4cc13a', '#1e9bf0', '#7b3fb5', '#ff5c8a'][i % 7] }));
const byL = Object.fromEntries(ABC.map(a => [a.L, a]));
// A path of letter cubes; landing on one says "A. Apple!".
function letterPath(G, letters, z1) {
  letters.forEach((L, i) => {
    const it = byL[L], z = z1 - 4.5 - i * 6.6, x = Math.sin(i * .9) * 3;
    const tex = blockTex(L, it.color);
    const s = block(x, 0, z, 4, 4, 4, it.color, { studs: false });
    s.mesh.material = new THREE.MeshStandardMaterial({ map: tex, roughness: .5 });
    let first = true;
    trigger(boxAt(x, 0, z, 4, 1.5, 4), () => {
      G.voice(`${L}. ${cap(it.word)}!`);
      s.mesh.scale.set(1.08, .9, 1.08); setTimeout(() => s.mesh.scale.set(1, 1, 1), 150);
      if (first) { first = false; G.coin(1); }
    });
  });
  return z1 - 4.5 - (letters.length - 1) * 6.6 - 4.5;
}
const L3 = {
  title: 'LESSON 3 · ABC', icon: '🔤',
  build(G) {
    const tk = G.token, alive = () => G.token === tk;
    water();
    island(0, 0, 30, 30, '#7ccf5a');
    sign('🔤 LESSON 3 · THE ALPHABET', 0, 13, -14, '#1e9bf0', 1.8);
    let edge = letterPath(G, [...'ABCDEFGH'], -15);
    let zcB = 0, zcC = 0;
    G.goal(V(0, 0, edge - 5));
    G.note('➡️ GO!', 'Sari pe cuburi-litere (SPACE) și ascultă fiecare literă!');

    // Island A: which letter? (picture -> letter)
    let zc = edge - 15;
    island(0, zc, 38, 30, '#7ccf5a');
    checkpoint(G, 0, 0, zc + 12);
    block(0, 11, zc - 10, 11, 1, 1, '#8b5a2b', { studs: false });
    const pic = sprite(emojiTex('❓'), 0, 7, zc - 10, 8);
    const setA = padSet(G, 3, { x: 0, z: zc + 3 });
    const gateA = gate(0, 0, zc - 14.5);
    onEnter(boxAt(0, 0, zc + 8, 36, 6, 14), async () => {
      G.stage(1, 3); G.goal(null);
      let last = null;
      for (let r = 0; r < 3 && alive(); r++) {
        const it = pick(ABC.filter(a => a !== last && a.L !== 'N' && a.L !== 'X')); last = it;
        const opts = shuffle([it, ...shuffle(ABC.filter(a => a !== it)).slice(0, 2)]);
        pic.material.map = emojiTex(it.emoji); pic.material.needsUpdate = true;
        G.progress(`${r + 1} / 3`);
        G.ask('Which letter?', '🤔 WHICH LETTER?', { hint: `${cap(it.word)}! Which letter?`, ro: 'Cu ce literă începe? Calcă pe litera potrivită (🔊 = ajutor)' });
        await setA.round({ opts: opts.map(o => ({ tex: letterTex(o.L, '#1b2733') })), correct: opts.indexOf(it), onWrong: i => G.voice(`No, this is ${opts[i].L}.`) });
        if (!alive()) return;
        pic.material.map = emojiTex(it.emoji, { label: it.word, border: '#4cc13a' }); pic.material.needsUpdate = true;
        G.coin(2); G.good(pic.position);
        await G.voice(`Yes! ${it.L} for ${it.word}!`);
      }
      if (!alive()) return;
      G.progress(''); gateA.open(); G.goal(V(0, 0, zcB + 10)); G.ask('Go on!', '✅ GO ON! ➡️', GO);
    });
    edge = letterPath(G, [...'IJKLMNOP'], zc - 15);

    // Island B: find the letter.
    zc = zcB = edge - 15;
    island(0, zc, 38, 30, '#7ccf5a');
    checkpoint(G, 0, 0, zc + 12);
    const setB = padSet(G, 4, { x: 0, z: zc + 1 });
    const gateB = gate(0, 0, zc - 14.5);
    onEnter(boxAt(0, 0, zc + 8, 36, 6, 14), async () => {
      G.stage(2, 3); G.goal(null);
      let last = null;
      for (let r = 0; r < 3 && alive(); r++) {
        const it = pick(ABC.filter(a => a !== last)); last = it;
        const opts = shuffle([it, ...shuffle(ABC.filter(a => a !== it)).slice(0, 3)]);
        G.progress(`${r + 1} / 3`);
        G.ask(`Find the letter ${it.L}!`, '🔍 FIND THE LETTER… 🔊', { ro: 'Calcă pe litera pe care o auzi' });
        await setB.round({ opts: opts.map(o => ({ tex: letterTex(o.L, o.color) })), correct: opts.indexOf(it), onWrong: i => G.voice(`This is ${opts[i].L}. Find ${it.L}!`) });
        if (!alive()) return;
        G.coin(2); G.good(); await G.voice(`Yes! ${it.L}!`);
      }
      if (!alive()) return;
      G.progress(''); gateB.open(); G.goal(V(0, 0, zcC + 12)); G.ask('Go on!', '✅ GO ON! ➡️', GO);
    });
    edge = letterPath(G, [...'QRSTUVWXYZ'], zc - 15);

    // Island C: spell your name by stepping on its letters in order.
    zc = zcC = edge - 15;
    island(0, zc, 40, 34, '#7ccf5a');
    checkpoint(G, 0, 0, zc + 14);
    const name = G.name.toUpperCase(), uniq = [...new Set(name)];
    const extra = shuffle(ABC.map(a => a.L).filter(L => !uniq.includes(L))).slice(0, Math.max(2, 8 - uniq.length));
    const letters = shuffle([...uniq, ...extra]);
    const setC = padSet(G, letters.length, { x: 0, z: zc + 1, cols: 4, size: 5.4 });
    letters.forEach((L, i) => setC.look(setC.pads[i], { tex: letterTex(L, byL[L].color) }));
    sign(`✏️ ${name}`, 0, 11, zc - 12, '#7b3fb5', 3);
    const cup = trophy(G, 0, 0, zc - 12);
    onEnter(boxAt(0, 0, zc + 10, 38, 6, 12), async () => {
      G.stage(3, 3); G.goal(null);
      G.ask(`Spell your name! ${[...name].join(', ')}.`, `✏️ SPELL YOUR NAME!`, { ro: 'Calcă pe literele numelui tău, pe rând' });
      for (let k = 0; k < name.length && alive(); k++) {
        G.progress([...name].map((c, i) => i < k ? c : i === k ? `[${c}]` : '_').join(' '));
        const L = name[k];
        await setC.round({ correct: letters.indexOf(L), onWrong: i => G.voice(`This is ${letters[i]}. Find ${L}!`) });
        if (!alive()) return;
        G.voice(L); G.coin(1);
        await wait(250);
      }
      if (!alive()) return;
      G.progress(name); G.good(); G.coin(3);
      await G.voice(`Well done! ${[...name].join(', ')}! ${G.name}!`);
      cup.reveal(); G.goal(V(0, 0, zc - 12)); G.ask('Get the trophy!', '🏆 GET THE TROPHY!', TROPHY);
    });
    return { spawn: [0, 0, 8], yaw: 0, sky: 'day' };
  },
};

// ---------- LESSON 4: COLOURS ----------
const PAINT = [
  ['sun', 'yellow', '☀️'], ['strawberry', 'red', '🍓'], ['pig', 'pink', '🐷'], ['bear', 'brown', '🐻'], ['orange', 'orange', '🍊'],
  ['grapes', 'purple', '🍇'], ['clover', 'green', '🍀'], ['jeans', 'blue', '👖'], ['snowman', 'white', '⛄'],
];
const L4 = {
  title: 'LESSON 4 · COLOURS', icon: '🎨',
  build(G) {
    const tk = G.token, alive = () => G.token === tk;
    water();
    island(0, 0, 30, 30, '#7ccf5a');
    sign('🎨 LESSON 4 · COLOURS', 0, 13, -14, '#ff8a1c', 1.8);
    tree(11, 0, 8);
    stones(G, 0, -15, -35, 2, 0, 0, '#ffd60a');
    G.goal(V(0, 0, -40));
    G.note('➡️ GO!', 'Urmează săgeata galbenă!');

    // Island A: jump on RED!
    let zc = -55;
    island(0, zc, 40, 40, '#7ccf5a');
    checkpoint(G, 0, 0, zc + 17);
    const setA = padSet(G, 9, { x: 0, z: zc - 2, cols: 3, size: 6.4, gap: 1.4 });
    COLOURS.forEach((c, i) => setA.look(setA.pads[i], { color: c.css }));
    const gateA = gate(0, 0, zc - 19.5);
    onEnter(boxAt(0, 0, zc + 14, 38, 6, 10), async () => {
      G.stage(1, 3); G.goal(null);
      let last = null;
      for (let r = 0; r < 3 && alive(); r++) {
        const c = pick(COLOURS.filter(x => x !== last)); last = c;
        G.progress(`${r + 1} / 3`);
        G.ask(`Jump on ${c.id}!`, '🎨 JUMP ON… 🔊', { ro: 'Calcă pe culoarea pe care o auzi' });
        await setA.round({ correct: COLOURS.indexOf(c), onWrong: i => G.voice(`This is ${COLOURS[i].id}!`) });
        if (!alive()) return;
        G.coin(2); G.good(); await G.voice(`Yes! ${cap(c.id)}!`);
      }
      if (!alive()) return;
      G.progress(''); gateA.open(); G.goal(V(0, 0, -100)); G.ask('Go on!', '✅ GO ON! ➡️', GO);
    });
    stones(G, 0, zc - 20, zc - 40, 2, 0, 0, '#ff7ec1');

    // Island B: paint it!
    zc = -110;
    island(0, zc, 38, 30, '#7ccf5a');
    checkpoint(G, 0, 0, zc + 12);
    block(0, 13, zc - 10, 10, 1, 1, '#8b5a2b', { studs: false });
    for (const s of [-1, 1]) block(s * 4.5, 12, zc - 10, .8, 12, .8, '#8b5a2b', { studs: false });
    const pic = sprite(emojiTex('🎨'), 0, 7.6, zc - 9.4, 8.4);
    const setB = padSet(G, 3, { x: 0, z: zc + 3 });
    const gateB = gate(0, 0, zc - 14.5);
    onEnter(boxAt(0, 0, zc + 8, 36, 6, 14), async () => {
      G.stage(2, 3); G.goal(null);
      const items = shuffle(PAINT).slice(0, 3);
      for (let r = 0; r < 3 && alive(); r++) {
        const [thing, colour, emoji] = items[r];
        const opts = shuffle([colour, ...shuffle(PAINT.map(p => p[1]).filter(c => c !== colour)).slice(0, 2)]);
        pic.material.map = emojiTex(emoji, { gray: true }); pic.material.needsUpdate = true;
        G.progress(`${r + 1} / 3`);
        G.ask(`What colour is the ${thing}?`, '🖌️ WHAT COLOUR IS IT? 🔊', { ro: 'Ce culoare are? Calcă pe culoarea potrivită' });
        await setB.round({ opts: opts.map(o => ({ color: byId[o].css })), correct: opts.indexOf(colour), onWrong: i => G.voice(`A ${opts[i]} ${thing}? No, no, no!`) });
        if (!alive()) return;
        pic.material.map = emojiTex(emoji, { border: byId[colour].css }); pic.material.needsUpdate = true;
        G.coin(2); G.good(pic.position);
        await G.voice(`Yes! The ${thing} is ${colour}!`);
      }
      if (!alive()) return;
      G.progress(''); gateB.open(); G.goal(V(0, 0, -127)); G.ask('Go on!', '✅ GO ON! ➡️', GO);
    });

    // The colour bridge: walk on GREEN only, other tiles fall.
    const safe = 'green', startZ = zc - 15 - 1, rows = 8, cols = 3, tile = 4.6;
    let col = 1;
    const others = COLOURS.filter(c => c.id !== safe);
    for (let r = 0; r < rows; r++) {
      const z = startZ - 2.5 - r * 5;
      for (let c = 0; c < cols; c++) {
        const isSafe = c === col, cc = isSafe ? byId[safe] : pick(others), color = cc.css;
        const x = (c - 1) * 5;
        const s = block(x, 0, z, tile, 1.2, tile, color);
        if (!isSafe) {
          let falling = false;
          trigger(boxAt(x, 0, z, tile - .6, 1.6, tile - .6), () => {
            if (falling) return; falling = true; G.voice(`Oh no! This is ${cc.id}!`);
            setTimeout(() => {
              removeSolid(s);
              const fn = tick(dt => { s.mesh.position.y -= dt * 18; });
              setTimeout(() => { W.tickers.splice(W.tickers.indexOf(fn), 1); s.mesh.position.y = -.6; s.active = true; falling = false; }, 2500);
            }, 250);
          });
        }
      }
      col = Math.max(0, Math.min(2, col + pick([-1, 0, 1])));
    }
    const bridgeEnd = startZ - rows * 5;
    onEnter(boxAt(0, 0, startZ - 2.5, 16, 6, 5), () => { G.stage(3, 3); G.goal(V(0, 0, startZ - rows * 5 - 10)); G.ask(`Walk on ${safe} only!`, `🌉 WALK ON ${safe.toUpperCase()} ONLY! 🔊`, { ro: 'Mergi doar pe plăcile verzi, celelalte cad!' }); });
    zc = bridgeEnd - 15;
    island(0, zc, 34, 30, '#7ccf5a');
    checkpoint(G, 0, 0, zc + 12);
    const cup = trophy(G, 0, 0, zc - 4);
    onEnter(boxAt(0, 0, zc + 8, 32, 6, 12), () => { G.good(); G.coin(3); cup.reveal(); G.goal(V(0, 0, zc - 4)); G.ask('You did it! Get the trophy!', '🏆 GET THE TROPHY!', TROPHY); });
    return { spawn: [0, 0, 8], yaw: 0, sky: 'day' };
  },
};

export const LEVELS = [HUB, L1, L2, L3, L4];
