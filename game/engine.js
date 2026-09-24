// Stefi World engine: renderer, Roblox-style materials, sky, player physics, camera, triggers and world builders.
import * as THREE from 'three';

// ---------- renderer / scene ----------
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 900);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

export const hemi = new THREE.HemisphereLight('#ffffff', '#7a9a6a', 1.6);
export const sunLight = new THREE.DirectionalLight('#ffffff', 2.4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
sunLight.shadow.bias = -.0005;
scene.add(hemi, sunLight, sunLight.target);

// ---------- sky dome with day/night presets ----------
export const SKIES = {
  day: { top: '#3fa9ff', bottom: '#c9ecff', hemi: 1.6, sun: 2.4, sunColor: '#ffffff', stars: 0 },
  morning: { top: '#ff8fb3', bottom: '#ffe0b0', hemi: 1.3, sun: 1.9, sunColor: '#ffc89a', stars: 0 },
  afternoon: { top: '#1f8fff', bottom: '#aee3ff', hemi: 1.8, sun: 2.7, sunColor: '#ffffff', stars: 0 },
  evening: { top: '#3b2470', bottom: '#ff8a5a', hemi: 1, sun: 1.3, sunColor: '#ff9a5a', stars: .3 },
  night: { top: '#050d24', bottom: '#1c2f63', hemi: .55, sun: .5, sunColor: '#9fb4ff', stars: 1 },
};
const skyUniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vp; void main(){ float h = clamp(vp.y*1.4+.15,0.,1.); gl_FragColor = vec4(mix(bottom, top, h),1.); }',
}));
dome.renderOrder = -1;
scene.add(dome);
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 700; i++) {
  const v = new THREE.Vector3(Math.random() - .5, Math.random() * .9 + .1, Math.random() - .5).normalize().multiplyScalar(560);
  starPos.push(v.x, v.y, v.z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: '#fff7c2', size: 3, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
dome.add(new THREE.Points(starGeo, starMat));
scene.fog = new THREE.Fog('#c9ecff', 160, 420);

const skyNow = { top: new THREE.Color(SKIES.day.top), bottom: new THREE.Color(SKIES.day.bottom), hemi: 1.6, sun: 2.4, sunColor: new THREE.Color('#fff'), stars: 0 };
let skyTarget = SKIES.day;
export function setSky(name, instant = false) {
  skyTarget = SKIES[name];
  if (instant) {
    skyNow.top.set(skyTarget.top); skyNow.bottom.set(skyTarget.bottom); skyNow.sunColor.set(skyTarget.sunColor);
    skyNow.hemi = skyTarget.hemi; skyNow.sun = skyTarget.sun; skyNow.stars = skyTarget.stars;
  }
}
const tmpC = new THREE.Color();
function updateSky(dt) {
  const k = 1 - Math.exp(-dt * 2);
  skyNow.top.lerp(tmpC.set(skyTarget.top), k); skyNow.bottom.lerp(tmpC.set(skyTarget.bottom), k); skyNow.sunColor.lerp(tmpC.set(skyTarget.sunColor), k);
  skyNow.hemi += (skyTarget.hemi - skyNow.hemi) * k; skyNow.sun += (skyTarget.sun - skyNow.sun) * k; skyNow.stars += (skyTarget.stars - skyNow.stars) * k;
  skyUniforms.top.value.copy(skyNow.top); skyUniforms.bottom.value.copy(skyNow.bottom);
  scene.fog.color.copy(skyNow.bottom);
  hemi.intensity = skyNow.hemi; sunLight.intensity = skyNow.sun; sunLight.color.copy(skyNow.sunColor);
  starMat.opacity = skyNow.stars;
}

// ---------- Roblox-ish materials ----------
function studsTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  for (const [cx, cy] of [[32, 32], [96, 32], [32, 96], [96, 96]]) {
    x.fillStyle = 'rgba(0,0,0,.10)'; x.beginPath(); x.arc(cx + 2, cy + 3, 19, 0, 7); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, 18, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = 2; x.stroke();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(cx - 6, cy - 6, 6, 0, 7); x.fill();
  }
  x.strokeStyle = 'rgba(0,0,0,.06)'; x.lineWidth = 2; x.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const STUDS = studsTexture();
const matCache = {};
export function plastic(color, rough = .55) {
  const key = color + rough;
  return matCache[key] ||= new THREE.MeshStandardMaterial({ color, roughness: rough });
}
function studMat(color, w, d) {
  const t = STUDS.clone(); t.needsUpdate = true; t.repeat.set(w / 2.5, d / 2.5);
  return new THREE.MeshStandardMaterial({ color, roughness: .6, map: t });
}

// ---------- world container ----------
export const W = { root: new THREE.Group(), solids: [], triggers: [], tickers: [] };
scene.add(W.root);
export function clearWorld() {
  scene.remove(W.root);
  W.root = new THREE.Group(); scene.add(W.root);
  W.solids = []; W.triggers = []; W.tickers = [];
}
export const tick = fn => { W.tickers.push(fn); return fn; };

// Solid block. (x, z) center, top surface at `top`.
export function block(x, top, z, w, h, d, color, { studs = true, solid = true, parent = W.root, rough = .55 } = {}) {
  const side = plastic(color, rough);
  const mats = studs ? [side, side, studMat(color, w, d), side, side, side] : side;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(x, top - h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  const s = { mesh: m, box: new THREE.Box3(), active: solid, half: new THREE.Vector3(w / 2, h / 2, d / 2) };
  syncSolid(s);
  if (solid) W.solids.push(s);
  m.userData.solid = s;
  return s;
}
export function syncSolid(s) {
  const p = new THREE.Vector3(); s.mesh.getWorldPosition(p);
  s.box.min.copy(p).sub(s.half); s.box.max.copy(p).add(s.half);
}
export function removeSolid(s) { s.active = false; }

// Trigger volume: onEnter / onLeave called when the player's feet box overlaps.
export function trigger(box, onEnter, onLeave) {
  const t = { box, onEnter, onLeave, inside: false, enabled: true };
  W.triggers.push(t);
  return t;
}
export const boxAt = (x, y, z, w, h, d) => new THREE.Box3(new THREE.Vector3(x - w / 2, y, z - d / 2), new THREE.Vector3(x + w / 2, y + h, z + d / 2));

// ---------- canvas textures / sprites ----------
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function roundRect(x, px, py, w, h, r) { x.beginPath(); x.roundRect(px, py, w, h, r); }
export const FONT = '"Fredoka", "Baloo 2", sans-serif';

// Roblox-style name tag / text label that always faces the camera.
export function textSprite(text, { size = 64, color = '#fff', stroke = '#000', bg = null, height = 1, pad = 20 } = {}) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `700 ${size}px ${FONT}`;
  const tw = Math.ceil(probe.measureText(text).width) + pad * 2, th = size + pad * 1.4;
  const tex = canvasTex(tw, th, (x, w, h) => {
    if (bg) { x.fillStyle = bg; roundRect(x, 0, 0, w, h, h / 2.6); x.fill(); }
    x.font = `700 ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (stroke) { x.lineWidth = size / 6; x.strokeStyle = stroke; x.lineJoin = 'round'; x.strokeText(text, w / 2, h / 2 + 2); }
    x.fillStyle = color; x.fillText(text, w / 2, h / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false }));
  s.scale.set(height * tw / th, height, 1);
  s.renderOrder = 10;
  return s;
}
// Chat bubble like Roblox (white rounded box with tail). Returns sprite; call .userData.set(text).
export function chatBubble() {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, depthTest: false, fog: false, transparent: true }));
  s.renderOrder = 20; s.visible = false;
  s.userData.set = text => {
    const size = 56, pad = 34;
    const probe = document.createElement('canvas').getContext('2d'); probe.font = `700 ${size}px ${FONT}`;
    const tw = Math.min(900, Math.ceil(probe.measureText(text).width)) + pad * 2, th = size + pad * 2 + 30;
    s.material.map?.dispose();
    s.material.map = canvasTex(tw, th, (x, w, h) => {
      x.fillStyle = 'rgba(0,0,0,.18)'; roundRect(x, 4, 8, w - 8, h - 34, 34); x.fill();
      x.fillStyle = '#fff'; roundRect(x, 0, 0, w - 8, h - 38, 34); x.fill();
      x.beginPath(); x.moveTo(w / 2 - 22, h - 40); x.lineTo(w / 2, h - 6); x.lineTo(w / 2 + 22, h - 40); x.fill();
      x.font = `700 ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#1b2733';
      x.fillText(text, (w - 8) / 2, (h - 38) / 2 + 3, 880);
    });
    s.material.needsUpdate = true;
    const hgt = 1.5; s.scale.set(hgt * tw / th, hgt, 1);
    s.visible = true;
  };
  return s;
}

// ---------- input ----------
export const keys = new Set();
let jumpPressedAt = -1;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (e.code === 'Space') { jumpPressedAt = performance.now(); e.preventDefault(); }
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

export const cam = { yaw: Math.PI, pitch: .38, dist: 22, dragging: false, lastDrag: 0 };
let dragFrom = null;
renderer.domElement.addEventListener('pointerdown', e => { dragFrom = { x: e.clientX, y: e.clientY }; cam.dragging = true; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', e => {
  if (!dragFrom) return;
  cam.yaw -= (e.clientX - dragFrom.x) * .006;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - dragFrom.y) * .004, .08, 1.2);
  dragFrom = { x: e.clientX, y: e.clientY }; cam.lastDrag = performance.now();
});
renderer.domElement.addEventListener('pointerup', () => { dragFrom = null; cam.dragging = false; });
renderer.domElement.addEventListener('wheel', e => { cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * .02, 10, 45); }, { passive: true });

// ---------- player physics ----------
export const player = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), facing: 0, onGround: false, ground: null,
  spawn: new THREE.Vector3(), spawnYaw: Math.PI, half: new THREE.Vector3(.8, 2.15, .8),
  frozen: false, moving: 0, lastGround: 0, avatar: null, onFall: null,
};
const SPEED = 15, JUMP = 27, GRAV = 78;
const pbox = new THREE.Box3();
function playerBox() {
  const p = player.pos, h = player.half;
  pbox.min.set(p.x - h.x, p.y, p.z - h.z); pbox.max.set(p.x + h.x, p.y + h.y * 2, p.z + h.z);
  return pbox;
}
function resolve(axis, grounded) {
  const b = playerBox();
  for (const s of W.solids) {
    if (!s.active || !b.intersectsBox(s.box)) continue;
    // The floor under our feet is not a wall.
    if (axis !== 'y' && s.box.max.y <= player.pos.y + .05) continue;
    if (axis === 'y') {
      if (player.vel.y <= 0 && player.pos.y > s.box.max.y - 1.2) { player.pos.y = s.box.max.y; player.onGround = true; player.ground = s; }
      else if (player.vel.y > 0) player.pos.y = s.box.min.y - player.half.y * 2 - .01;
      player.vel.y = 0;
    } else {
      // Kid-friendly: small ledges are climbed automatically.
      if (s.box.max.y - player.pos.y <= 1.1 && grounded) { player.pos.y = s.box.max.y; continue; }
      const c = axis === 'x' ? 'x' : 'z', v = player.vel[c];
      if (v > 0) player.pos[c] = s.box.min[c] - player.half[c] - .001;
      else if (v < 0) player.pos[c] = s.box.max[c] + player.half[c] + .001;
    }
    playerBox();
  }
}
export function teleport(v, yaw) {
  player.pos.copy(v); player.vel.set(0, 0, 0);
  if (yaw !== undefined) { cam.yaw = yaw; player.facing = yaw + Math.PI; }
}
export function respawn() { teleport(player.spawn, player.spawnYaw); player.onFall?.(); }

const tmp = new THREE.Vector3();
function stepPlayer(dt, now) {
  let f = 0, r = 0;
  if (!player.frozen) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) r += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) r -= 1;
  }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  tmp.set(fx * f + rx * r, 0, fz * f + rz * r);
  const len = tmp.length();
  if (len > 0) tmp.multiplyScalar(SPEED / len);
  player.vel.x = tmp.x; player.vel.z = tmp.z;
  player.moving = len > 0 ? 1 : 0;
  if (len > 0) {
    const target = Math.atan2(tmp.x, tmp.z);
    let d = target - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.facing += d * (1 - Math.exp(-dt * 14));
    // Camera slowly swings behind the player so kids don't need the mouse.
    if (now - cam.lastDrag > 1200 && f >= 0) {
      let cd = (player.facing + Math.PI) - cam.yaw; cd = Math.atan2(Math.sin(cd), Math.cos(cd));
      cam.yaw += cd * (1 - Math.exp(-dt * (r !== 0 ? 1.6 : .6)));
    }
  }
  if (player.onGround) player.lastGround = now;
  if (!player.frozen && now - jumpPressedAt < 150 && now - player.lastGround < 120) {
    player.vel.y = JUMP; jumpPressedAt = -1; player.lastGround = -1; player.onJump?.();
  }
  player.vel.y = Math.max(player.vel.y - GRAV * dt, -70);
  const grounded = player.onGround;
  player.onGround = false; player.ground = null;
  player.pos.x += player.vel.x * dt; resolve('x', grounded);
  player.pos.z += player.vel.z * dt; resolve('z', grounded);
  player.pos.y += player.vel.y * dt; resolve('y');
  if (player.pos.y < -25) respawn();
}

function stepTriggers() {
  const b = playerBox();
  for (const t of [...W.triggers]) {
    if (!t.enabled) continue;
    const inside = b.intersectsBox(t.box);
    if (inside && !t.inside) { t.inside = true; t.onEnter?.(t); }
    else if (!inside && t.inside) { t.inside = false; t.onLeave?.(t); }
  }
}

const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  camTarget.lerp(tmp.copy(player.pos).add(new THREE.Vector3(0, 3.4, 0)), 1 - Math.exp(-dt * 12));
  const cp = Math.cos(cam.pitch);
  camera.position.set(camTarget.x + Math.sin(cam.yaw) * cam.dist * cp, camTarget.y + Math.sin(cam.pitch) * cam.dist, camTarget.z + Math.cos(cam.yaw) * cam.dist * cp);
  camera.lookAt(camTarget);
  dome.position.copy(camera.position);
  sunLight.position.copy(player.pos).add(new THREE.Vector3(30, 70, 25));
  sunLight.target.position.copy(player.pos);
}
export function snapCamera() { camTarget.copy(player.pos).add(new THREE.Vector3(0, 3.4, 0)); }

// ---------- main loop ----------
export function run(update) {
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime, now = performance.now();
    stepPlayer(dt, now);
    stepTriggers();
    for (const fn of [...W.tickers]) fn(dt, t);
    update(dt, t);
    updateSky(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
  });
}
