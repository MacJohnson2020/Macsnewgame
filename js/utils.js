// === Voidborn — Utility Functions ===

// Seeded RNG (xoshiro128**)
let _seed = [Date.now(), Date.now() ^ 0xdeadbeef, Date.now() ^ 0xcafebabe, Date.now() ^ 0x12345678];

export function seedRng(s) {
  _seed = [s, s ^ 0xdeadbeef, s ^ 0xcafebabe, s ^ 0x12345678];
}

export function rand() {
  let [a, b, c, d] = _seed;
  const t = b << 9;
  let r = a * 5;
  r = ((r << 7) | (r >>> 25)) * 9;
  c ^= a; d ^= b; b ^= c; a ^= d;
  c ^= t;
  d = (d << 11) | (d >>> 21);
  _seed = [a, b, c, d];
  return (r >>> 0) / 4294967296;
}

// Random integer [min, max] inclusive
export function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// Random float [min, max)
export function randFloat(min, max) {
  return rand() * (max - min) + min;
}

// Pick random element
export function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// Weighted random pick: items = [{...item, weight}]
export function weightedPick(items) {
  const total = items.reduce((s, i) => s + (i.weight || 1), 0);
  let r = rand() * total;
  for (const item of items) {
    r -= (item.weight || 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// Roll a percentage check
export function rollChance(percent) {
  return rand() * 100 < percent;
}

// Clamp value
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Linear interpolation
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Format number with commas
export function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString();
}

// Generate unique ID
let _idCounter = 0;
export function uid() {
  return `vb_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
}

// Stat modifier (DnD-style: stat of 10 = 0 mod, each 2 above = +1)
export function statMod(stat) {
  return Math.floor((stat - 10) / 2);
}

// Calculate hit chance: accuracy vs defense (armor or magic resist)
// After penetration is applied
export function calcHitChance(accuracy, defense, penetration = 0) {
  const effectiveDef = defense * (1 - clamp(penetration, 0, 100) / 100);
  if (accuracy + effectiveDef === 0) return 50;
  const chance = (accuracy / (accuracy + effectiveDef)) * 100;
  return clamp(Math.round(chance), 5, 95); // always 5-95% range
}

// Calculate damage with variance
export function calcDamage(base, statBonus, variance = 0.15) {
  const raw = base + statBonus;
  const mult = 1 + randFloat(-variance, variance);
  return Math.max(1, Math.round(raw * mult));
}

// Deep clone (for state)
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Simple element creation helper
export function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') elem.className = val;
    else if (key === 'text') elem.textContent = val;
    else if (key === 'html') elem.innerHTML = val;
    else if (key.startsWith('on')) elem.addEventListener(key.slice(2), val);
    else if (key.startsWith('data-')) elem.setAttribute(key, val);
    else elem[key] = val;
  }
  for (const child of children) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}
