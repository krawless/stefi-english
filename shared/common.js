// Shared toolkit for every lesson: helpers, colours, sound, speech, UI bubble, stars, 3D stage, tweens, confetti.
import * as THREE from 'three';

// ---------- helpers ----------
export const $ = s => document.querySelector(s);
export const rand = Math.random;
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const cap = s => s[0].toUpperCase() + s.slice(1);
export const pick = a => a[Math.floor(rand() * a.length)];
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const easeOutBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
export const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOutBounce = t => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
  return n * (t -= 2.625 / d) * t + .984375;
};

// ---------- colours (Lesson 4 palette, reused everywhere) ----------
export const COLOURS = [
  { id: 'black', css: '#2d2a32' }, { id: 'orange', css: '#ff8a1c' }, { id: 'blue', css: '#1e9bf0' },
  { id: 'brown', css: '#8b4513' }, { id: 'yellow', css: '#ffd60a', text: '#efb300' }, { id: 'purple', css: '#7b3fb5' },
  { id: 'red', css: '#e8262b' }, { id: 'green', css: '#4cc13a' }, { id: 'pink', css: '#ff7ec1' },
];
export const WHITE = { id: 'white', css: '#ffffff', text: '#98a2ad' };
export const ALL_COLOURS = [...COLOURS, WHITE];
ALL_COLOURS.forEach(c => { c.hex = parseInt(c.css.slice(1), 16); c.text ||= c.css; });
export const byId = Object.fromEntries(ALL_COLOURS.map(c => [c.id, c]));
export const RAINBOW = COLOURS.map(c => c.hex).filter(h => h !== byId.black.hex);

// ---------- sound ----------
let ac;
export const actx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
function tone(freq, t0, dur, type = 'sine', vol = .18) {
  const a = actx(), t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
}
function noise(dur, from, to, vol) {
  const a = actx(), t = a.currentTime, len = a.sampleRate * dur, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start(t);
}
export const sfx = {
  pop() {
    const a = actx(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(950, t + .08);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + .2);
  },
  splat() { noise(.3, 1800, 300, .5); },
  bang() { noise(.18, 6000, 800, .9); },
  thud() { tone(140, 0, .12, 'sine', .3); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .3, 'triangle', .16)); },
  nope() { tone(330, 0, .18, 'sine', .15); tone(247, .15, .3, 'sine', .15); },
  fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * .13, i === 5 ? .7 : .22, 'triangle', .16)); },
};

// ---------- speech ----------
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /en[-_]GB/i.test(v.lang) && /female|serena|kate|martha|stephanie|google uk english female/i.test(v.name))
    || vs.find(v => /en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
speechSynthesis.onvoiceschanged = pickVoice; pickVoice();
export function say(text, rate = .85, pitch = 1.1) {
  return new Promise(res => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-GB'; u.rate = rate; u.pitch = pitch;
    u.onend = u.onerror = res;
    speechSynthesis.speak(u);
    setTimeout(res, 2500 + text.length * 90);
  });
}

export const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) document.body.classList.add('sr');
export function listen(lang = 'en-GB') {
  return new Promise(res => {
    const r = new SR();
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 5;
    r.onresult = e => res([...e.results[0]].map(a => a.transcript.toLowerCase()));
    r.onerror = r.onend = () => res([]);
    r.start();
  });
}

// ---------- ui ----------
export const ui = { lastPrompt: '' };
export function showBubble(html) { const b = $('#bubble'); b.innerHTML = html; b.classList.remove('hidden'); }
export function hideBubble() { $('#bubble').classList.add('hidden'); }
export function ask(text, html) { ui.lastPrompt = text; showBubble(html || text.toUpperCase()); return say(text); }
export function tint(css) { const t = $('#tint'); if (t) t.style.backgroundColor = css || 'transparent'; }

// Stars are shared across all lessons.
export let stars = +(localStorage.getItem('stefi-stars') || 0);
export function renderStars(bump) {
  const el = $('#stars'); if (!el) return;
  el.innerHTML = `⭐ <b>${stars}</b>`;
  if (bump) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
}
export function addStar(n = 1) { stars += n; localStorage.setItem('stefi-stars', stars); renderStars(true); }
renderStars();

// ---------- 3D stage ----------
export const CAM_Z = 10;
export function createStage() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const tintEl = $('#tint');
  document.body.insertBefore(renderer.domElement, tintEl ? tintEl.nextSibling : document.body.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 100);
  camera.position.set(0, 0, CAM_Z);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfd8ff, 1.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(3, 6, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  sun.shadow.bias = -.002;
  scene.add(sun);

  const stage = {
    renderer, scene, camera, hemi, sun, onResize: null,
    dims() {
      const h = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return { h, w: h * camera.aspect, px: h / innerHeight };
    },
    loop(update) {
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), .05);
        updateTweens(dt);
        update(dt, clock.elapsedTime);
        renderer.render(scene, camera);
      });
    },
  };
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    stage.onResize?.();
  });
  return stage;
}

export const SPH = new THREE.SphereGeometry(1, 32, 24);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 24);
export const CONE = new THREE.ConeGeometry(1, 1, 20);
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const mat = (c, rough = .45) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
export function M(geo, material, p = [0, 0, 0], s = [1, 1, 1], parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...p); m.scale.set(...s); m.castShadow = true;
  parent?.add(m); return m;
}
export const WHITE_M = mat(0xffffff, .3), INK_M = mat(0x1d1d24, .3);

// Pointer in normalised device coords + helper to find the tapped "thing" (ancestor carrying userData[key]).
export const pointer = new THREE.Vector2();
export function setPointer(e) { pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }
addEventListener('pointermove', setPointer);
const ray = new THREE.Raycaster();
const tmpV = new THREE.Vector3();
// World position -> CSS pixels, for HTML labels that follow 3D objects.
export function toScreen(camera, v) {
  tmpV.copy(v).project(camera);
  return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight };
}
export function hitTest(camera, objects, key) {
  ray.setFromCamera(pointer, camera);
  for (const hit of ray.intersectObjects(objects, true)) {
    let o = hit.object;
    while (o && !o.userData[key]) o = o.parent;
    if (o && o.visible) return o;
  }
  return null;
}

// ---------- tweens ----------
const tweens = new Set();
export function tween(ms, fn, ease = t => t) { return new Promise(res => tweens.add({ t: 0, d: ms / 1000, fn, ease, res })); }
export function updateTweens(dt) {
  for (const tw of tweens) {
    tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(tw.ease(k));
    if (k >= 1) { tweens.delete(tw); tw.res(); }
  }
}

// ---------- confetti ----------
export function createConfetti(scene, N = 400, size = 1) {
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.16 * size, .1 * size), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .6 }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const parts = Array.from({ length: N }, (_, i) => {
    mesh.setColorAt(i, new THREE.Color(0xffffff));
    return { life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), rv: new THREE.Vector3() };
  });
  scene.add(mesh);
  let next = 0;
  const c = new THREE.Color(), dummy = new THREE.Object3D();
  return {
    burst(pos, colours, n = 80, power = 1) {
      for (let i = 0; i < n; i++) {
        const q = parts[next];
        q.life = 1.6 + rand() * 1.2; q.p.copy(pos);
        q.v.set((rand() - .5) * 7, rand() * 6 + 2.5, (rand() - .2) * 4).multiplyScalar(power);
        q.r.set(rand() * 6, rand() * 6, rand() * 6); q.rv.set((rand() - .5) * 14, (rand() - .5) * 14, (rand() - .5) * 14);
        mesh.setColorAt(next, c.setHex(colours[i % colours.length]));
        next = (next + 1) % N;
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        const q = parts[i];
        if (q.life > 0) {
          q.life -= dt; q.v.y -= 9 * dt; q.v.multiplyScalar(1 - 1.2 * dt);
          q.p.addScaledVector(q.v, dt);
          q.r.x += q.rv.x * dt; q.r.y += q.rv.y * dt; q.r.z += q.rv.z * dt;
        }
        dummy.position.copy(q.p); dummy.rotation.copy(q.r);
        dummy.scale.setScalar(q.life > 0 ? Math.min(1, q.life * 2) : 0);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
