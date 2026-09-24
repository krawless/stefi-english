// Stefi World: save data, HUD, shop, avatar editor and level flow.
import * as THREE from 'three';
import { scene, player, cam, run, clearWorld, teleport, snapCamera, setSky } from './engine.js';
import { makeBlocky, animateBlocky, makePet, animatePet, ITEMS, SKINS, HAIRS, HAIR_COLORS, say as bubbleSay } from './avatar.js';
import { LEVELS } from './levels.js';
import { $, sfx, say, actx, COLOURS, WHITE, createConfetti, RAINBOW } from '../shared/common.js';

await document.fonts.load('700 40px Fredoka');

// ---------- save ----------
const SAVE_KEY = 'stefi-world';
const save = {
  coins: 0, done: [false, false, false, false], owned: [], hat: null, back: null, pet: null,
  av: { skin: '#f5cd30', shirt: '#1e62c8', pants: '#4cc13a', hair: 'short', hairColor: '#6b3f22' },
  ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'),
};
const persist = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));
const nameNow = () => { const n = localStorage.getItem('stefi-name') || 'STEFI'; return n[0] + n.slice(1).toLowerCase(); };

// ---------- player avatar & pet ----------
let me = null, pet = null;
function buildMe() {
  if (me) scene.remove(me);
  me = makeBlocky({ ...save.av, name: nameNow(), hat: save.hat, back: save.back });
  scene.add(me);
  if (pet) scene.remove(pet);
  pet = save.pet ? makePet(save.pet) : null;
  if (pet) { scene.add(pet); pet.position.copy(player.pos); }
}
const confetti = createConfetti(scene, 600, 4);
player.onJump = () => { const a = actx(), t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(700, t + .12); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .15); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .16); };
player.onFall = () => { toast('💦 OOPS!'); sfx.splat(); };
function coinSound() {
  const a = actx(), t = a.currentTime;
  [988, 1319].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.06, t + i * .07); g.gain.exponentialRampToValueAtTime(.001, t + i * .07 + .18); o.connect(g).connect(a.destination); o.start(t + i * .07); o.stop(t + i * .07 + .2); });
}

// ---------- HUD ----------
function renderCoins(bump) {
  $('#coins span').textContent = save.coins;
  if (bump) { const c = $('#coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}
let hint = '', toastTimer = 0;
function toast(text) {
  const t = $('#toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1600);
}
// English question + a small Romanian line that tells the child what to do.
function note(html, ro) {
  const el = $('#ask'); el.innerHTML = html + (ro ? `<span class="ro">${ro}</span>` : '');
  el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop');
}
function ask(text, html, { hint: h, ro } = {}) {
  hint = h || text;
  note(html || text.toUpperCase(), ro);
  return say(text);
}

// Guide: a big bouncing arrow over the goal and a small one at the player's feet pointing to it.
const arrowMat = new THREE.MeshStandardMaterial({ color: '#ffd60a', emissive: '#ffb300', emissiveIntensity: .8, roughness: .4 });
const goalArrow = new THREE.Group();
const tip = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.4, 4), arrowMat); tip.rotation.x = Math.PI; goalArrow.add(tip);
const shaft = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 1), arrowMat); shaft.position.y = 2.2; goalArrow.add(shaft);
const compass = new THREE.Group();
const chev = new THREE.Mesh(new THREE.ConeGeometry(.7, 1.8, 3), arrowMat); chev.rotation.x = Math.PI / 2; chev.scale.y = .9; compass.add(chev);
scene.add(goalArrow, compass);
let goal = null;
$('#replay').onclick = () => { if (hint) say(hint); };
$('#lobby').onclick = () => loadLevel(0);

// ---------- game services used by the levels ----------
let current = 0, saidResolve = null;
const G = {
  token: 0,
  get name() { return nameNow(); },
  ask,
  note,
  toast,
  goal(v) { goal = v ? v.clone() : null; },
  stage(k, n) { const s = $('#stage'); s.textContent = `🏝️ ${k} / ${n}`; s.classList.remove('hidden'); },
  sky: setSky,
  voice: (text, pitch = 1.1) => say(text, .85, pitch),
  npcSay(g, text) { bubbleSay(g, text, 3500); return say(text, .85, g.userData.p.voice || 1.1); },
  progress(text) { const p = $('#progress'); p.textContent = text; p.classList.toggle('hidden', !text); },
  coin(n) { save.coins += n; persist(); renderCoins(true); coinSound(); },
  good(pos) { sfx.win(); toast('✅ YES!'); confetti.burst((pos ? pos.clone() : player.pos.clone()).add(new THREE.Vector3(0, 4, 0)), RAINBOW, 70, 2.4); },
  bad() { sfx.nope(); toast('❌ TRY AGAIN!'); player.vel.y = 16; },
  sparkle(pos) { confetti.burst(pos, [0xffcc33, 0xffffff, 0xffe066], 80, 2.4); sfx.win(); },
  checkpoint() { toast('🚩 CHECKPOINT!'); sfx.pop(); },
  saidIt(line, html) {
    ask(`Now you! Say: ${line}`, `🗣️ NOW YOU!<br>${html}`, { hint: line, ro: 'Spune propoziția cu voce tare, apoi apasă ✅ (sau Enter)' });
    $('#said').classList.remove('hidden');
    return new Promise(res => { saidResolve = res; });
  },
  isUnlocked: n => n === 1 || save.done[n - 2],
  isDone: n => save.done[n - 1],
  enterLevel: n => setTimeout(() => loadLevel(n), 0),
  openShop() { closePanels(); renderShop(); $('#shop').classList.remove('hidden'); say('Shop!'); },
  openEditor() { closePanels(); renderEditor(); $('#editor').classList.remove('hidden'); say('Avatar!'); },
  closePanels,
  complete() {
    const n = current;
    save.done[n - 1] = true; save.coins += 20;
    const all = save.done.every(Boolean);
    if (all && !save.owned.includes('crown')) save.owned.push('crown');
    persist(); renderCoins(true);
    sfx.fanfare();
    for (let i = 0; i < 5; i++) setTimeout(() => confetti.burst(player.pos.clone().add(new THREE.Vector3((Math.random() - .5) * 10, 6, (Math.random() - .5) * 10)), RAINBOW, 90, 2.6), i * 220);
    player.frozen = true;
    $('#cTitle').textContent = all ? 'YOU WIN! 🎉' : 'LEVEL COMPLETE!';
    $('#cText').innerHTML = `+20 🪙` + (all ? '<br>👑 FREE CROWN!' : n < 4 ? `<br>🔓 LESSON ${n + 1}!` : '');
    setTimeout(() => $('#complete').classList.remove('hidden'), 700);
    say(all ? 'You win! Well done!' : 'Level complete! Well done!');
  },
};
function said() {
  if (!saidResolve) return;
  $('#said').classList.add('hidden'); sfx.win();
  const r = saidResolve; saidResolve = null; r();
}
$('#said').onclick = said;
addEventListener('keydown', e => { if (e.code === 'Enter' && saidResolve && e.target.tagName !== 'INPUT') said(); });
$('#cBtn').onclick = () => { $('#complete').classList.add('hidden'); player.frozen = false; loadLevel(0); };

// ---------- shop ----------
function closePanels() { $('#shop').classList.add('hidden'); $('#editor').classList.add('hidden'); }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePanels);
function renderShop() {
  const grid = $('#shopGrid'); grid.innerHTML = '';
  ITEMS.forEach(it => {
    const owned = save.owned.includes(it.id), worn = save[it.slot] === it.id;
    const d = document.createElement('div');
    d.className = 'item' + (worn ? ' worn' : '');
    d.innerHTML = `<div class="ic">${it.icon}</div><div class="nm">${it.name}</div>`;
    const b = document.createElement('button');
    if (owned) { b.textContent = worn ? 'TAKE OFF' : 'WEAR'; b.className = worn ? 'on' : 'wear'; }
    else { b.textContent = `🪙 ${it.price}`; b.disabled = save.coins < it.price; }
    b.onclick = () => {
      if (!owned) { save.coins -= it.price; save.owned.push(it.id); save[it.slot] = it.id; sfx.fanfare(); toast(`${it.icon} ${it.name.toUpperCase()}!`); renderCoins(true); }
      else { save[it.slot] = worn ? null : it.id; sfx.pop(); }
      persist(); buildMe(); renderShop();
    };
    d.appendChild(b); grid.appendChild(d);
  });
}

// ---------- avatar editor ----------
function swatches(el, list, key, speak) {
  el.innerHTML = '';
  list.forEach(({ css, label }) => {
    const b = document.createElement('button');
    b.className = 'sw' + (save.av[key] === css ? ' sel' : '');
    b.style.background = css;
    b.onclick = () => { save.av[key] = css; persist(); buildMe(); renderEditor(); sfx.pop(); if (speak && label) say(label); };
    el.appendChild(b);
  });
}
function renderEditor() {
  const colours = [...COLOURS, WHITE].map(c => ({ css: c.css, label: c.id[0].toUpperCase() + c.id.slice(1) }));
  swatches($('#eSkin'), SKINS.map(css => ({ css })), 'skin');
  swatches($('#eShirt'), colours, 'shirt', true);
  swatches($('#ePants'), colours, 'pants', true);
  swatches($('#eHairC'), HAIR_COLORS.map(css => ({ css })), 'hairColor');
  const h = $('#eHair'); h.innerHTML = '';
  HAIRS.forEach(s => {
    const b = document.createElement('button');
    b.className = 'opt' + (save.av.hair === s ? ' sel' : ''); b.textContent = s.toUpperCase();
    b.onclick = () => { save.av.hair = s; persist(); buildMe(); renderEditor(); sfx.pop(); };
    h.appendChild(b);
  });
  $('#nameIn').value = localStorage.getItem('stefi-name') || 'STEFI';
}
$('#nameIn').addEventListener('input', e => {
  const n = e.target.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
  if (n) { localStorage.setItem('stefi-name', n); buildMe(); }
});

// ---------- levels ----------
function loadLevel(i) {
  G.token++;
  closePanels(); speechSynthesis.cancel();
  $('#ask').classList.add('hidden'); $('#said').classList.add('hidden'); saidResolve = null; hint = '';
  G.progress(''); goal = null; $('#stage').classList.add('hidden');
  clearWorld();
  current = i;
  const info = LEVELS[i].build(G);
  player.spawn.set(...info.spawn); player.spawnYaw = info.yaw;
  teleport(player.spawn, info.yaw); snapCamera();
  setSky(info.sky, true);
  $('#levelName').textContent = `${LEVELS[i].icon} ${LEVELS[i].title}`;
  if (pet) pet.position.copy(player.pos);
  if (i > 0) { toast(LEVELS[i].title); say(`Lesson ${i}! Let's go!`); }
  showKeys();
}
let keysTimer = 0;
function showKeys() { const k = $('#keys'); k.style.opacity = 1; clearTimeout(keysTimer); keysTimer = setTimeout(() => { k.style.opacity = 0; }, 20000); }

buildMe();
renderCoins();
// ?level=N opens a level directly (handy for grown-ups).
loadLevel(+new URLSearchParams(location.search).get('level') || 0);
player.frozen = true;
let titleOn = true;
$('#play').onclick = () => {
  actx().resume();
  titleOn = false; player.frozen = false;
  $('#title').classList.add('hidden');
  ['#hudTL', '#hudTR', '#keys'].forEach(s => $(s).classList.remove('hidden'));
  sfx.fanfare();
  say(`Hello, ${nameNow()}! Welcome to Stefi World!`);
  cam.yaw = 0;
  showKeys();
};

run((dt, t) => {
  if (titleOn) cam.yaw += dt * .12;
  me.position.copy(player.pos);
  me.rotation.y = player.facing;
  animateBlocky(me, dt, t, player.moving, !player.onGround && Math.abs(player.vel.y) > 3);
  if (pet) animatePet(pet, player.pos, player.facing, dt, t);
  goalArrow.visible = !!goal && !titleOn;
  if (goal) {
    goalArrow.position.set(goal.x, goal.y + 9 + Math.sin(t * 3) * .8, goal.z); goalArrow.rotation.y = t * 2;
    const dx = goal.x - player.pos.x, dz = goal.z - player.pos.z, d = Math.hypot(dx, dz);
    compass.visible = d > 9 && !titleOn;
    compass.position.set(player.pos.x + dx / d * 3.2, player.pos.y + .5, player.pos.z + dz / d * 3.2);
    compass.rotation.y = Math.atan2(dx, dz);
  } else compass.visible = false;
  confetti.update(dt);
});
