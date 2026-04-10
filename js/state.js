// === Voidborn — Game State Management ===

import { STAT_DEFAULTS, CLASSES, xpForLevel, HERO_INVENTORY_SIZE, BASE_STASH_SIZE, MAX_ENERGY, GEAR_SLOTS,
  SECURE_CONTAINER_BASE, SECURE_PER_VAULT, SECURE_CONTAINER_MAX,
  RECRUIT_BASE_COST, RECRUIT_POOL_BASE, RECRUIT_REFRESH_MS, HERO_NAMES, STARTING_STAT_POINTS } from './config.js';
import { uid, deepClone, pick, randInt } from './utils.js';

const SAVE_KEY = 'voidborn_save';
const SAVE_VERSION = 1;

// Create a new hero
export function createHero(name, classId, stats) {
  const cls = CLASSES[classId];
  const hero = {
    id: uid(),
    name,
    classId,
    level: 1,
    xp: 0,
    stats: { ...STAT_DEFAULTS, ...stats },
    statPoints: 0,
    hp: cls.hpBase + Math.floor((stats.CON - 10) / 2) * 2,
    maxHp: cls.hpBase + Math.floor((stats.CON - 10) / 2) * 2,
    mp: cls.mpBase + Math.floor((stats.INT - 10) / 2) * 2,
    maxMp: cls.mpBase + Math.floor((stats.INT - 10) / 2) * 2,
    gear: Object.fromEntries(GEAR_SLOTS.map(s => [s, null])),
    inventory: [], // items carried, each has a .size
    inventoryCapacity: HERO_INVENTORY_SIZE,
    abilityCooldowns: {},
    buffs: [],
    debuffs: [],
    dots: [],
    isMain: false,
    alive: true,
    autoBattle: null, // null = manual, 'aggressive', 'defensive', 'supportive'
  };
  return hero;
}

// Recalculate derived stats for a hero
export function recalcHero(hero) {
  const cls = CLASSES[hero.classId];
  const conMod = Math.floor((hero.stats.CON - 10) / 2);
  const intMod = Math.floor((hero.stats.INT - 10) / 2);
  hero.maxHp = cls.hpBase + cls.hpPerLevel * (hero.level - 1) + conMod * 2;
  hero.maxMp = cls.mpBase + cls.mpPerLevel * (hero.level - 1) + intMod * 2;
  hero.hp = Math.min(hero.hp, hero.maxHp);
  hero.mp = Math.min(hero.mp, hero.maxMp);
}

// Add XP to a hero, handle level ups
export function addXp(hero, amount) {
  hero.xp += amount;
  let leveled = false;
  while (hero.xp >= xpForLevel(hero.level)) {
    hero.xp -= xpForLevel(hero.level);
    hero.level++;
    hero.statPoints += 2;
    recalcHero(hero);
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
    leveled = true;
  }
  return leveled;
}

// Get total used inventory space for a hero
export function usedInventory(hero) {
  let used = 0;
  for (const item of hero.inventory) used += item.size;
  for (const slot of GEAR_SLOTS) {
    if (hero.gear[slot]) used += hero.gear[slot].size;
  }
  return used;
}

// Check if hero can carry an item — no limit in town, 25u limit in raids
export function canCarry(hero, item) {
  return true; // inventory is unlimited now
}

// New game state
export function newGameState() {
  return {
    version: SAVE_VERSION,
    heroes: [],       // all heroes (main + recruited)
    raidParty: [],    // hero IDs selected for current raid
    stash: [],        // town stash items
    gold: 50,
    energy: MAX_ENERGY,
    maxEnergy: MAX_ENERGY,

    // Town
    buildings: {
      generator: 0,
      foundry: 0,
      vault: 0,
      workshop: 0,
      tavern: 0,
      shrine: 0,
    },

    // Secure container (shared, items never lost)
    secureContainer: [],

    // Recruitment
    recruitPool: [],
    lastRecruitRefresh: Date.now(),

    // Meta
    deepestFloor: {},   // per zone: { zone_id: deepest_node }
    totalRaids: 0,
    totalExtractions: 0,
    totalDeaths: 0,
    lastSave: Date.now(),
    lastOnline: Date.now(),
    totalPlayTime: 0,
    created: Date.now(),

    // Current active raid (null when in town)
    activeRaid: null,
  };
}

// The global game state
export let G = newGameState();

// Replace global state (for loading)
export function setState(newState) {
  Object.assign(G, newState);
}

// Save to localStorage
export function saveGame() {
  G.lastSave = Date.now();
  const data = { version: SAVE_VERSION, state: deepClone(G) };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

// Load from localStorage
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.state) return false;
    migrate(data);
    setState(data.state);
    return true;
  } catch (e) {
    console.warn('Load failed:', e);
    return false;
  }
}

// Migration (for future version bumps)
function migrate(data) {
  const s = data.state;
  // Add missing fields for saves from Phase 1
  if (!s.recruitPool) s.recruitPool = [];
  if (!s.lastRecruitRefresh) s.lastRecruitRefresh = Date.now();
  if (!s.secureContainer) s.secureContainer = [];
  // Add autoBattle to existing heroes + migrate class IDs
  for (const hero of (s.heroes || [])) {
    if (hero.autoBattle === undefined) hero.autoBattle = null;
    if (hero.classId === 'fighter') hero.classId = 'berserker';
    if (hero.classId === 'mage') hero.classId = 'arcanist';
  }
  data.state.version = SAVE_VERSION;
}

// Delete save
export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

// Get stash capacity based on Vault level
export function stashCapacity() {
  return BASE_STASH_SIZE + G.buildings.vault * 10;
}

// Get stash used space
export function stashUsed() {
  return G.stash.reduce((sum, item) => sum + item.size, 0);
}

// Check if stash can hold an item — unlimited now
export function canStash(item) {
  return true;
}

// Calculate offline progress
export function calcOfflineProgress() {
  const now = Date.now();
  const elapsed = now - G.lastOnline;
  const minutes = elapsed / 60000;

  const progress = { gold: 0, energy: 0, minutes: Math.floor(minutes) };

  // Foundry: gold per minute
  if (G.buildings.foundry > 0) {
    progress.gold = Math.floor(G.buildings.foundry * 2 * minutes);
    G.gold += progress.gold;
  }

  // Generator: energy regen
  const energyRate = 1 + G.buildings.generator * 0.5;
  progress.energy = Math.min(
    Math.floor(energyRate * minutes),
    G.maxEnergy - G.energy
  );
  G.energy = Math.min(G.energy + progress.energy, G.maxEnergy);

  G.lastOnline = now;
  return progress;
}

// Get a hero by ID
export function getHero(id) {
  return G.heroes.find(h => h.id === id);
}

// Get the main hero
export function getMainHero() {
  return G.heroes.find(h => h.isMain);
}

// Heal all heroes to full (when returning to town)
export function healAllHeroes() {
  for (const hero of G.heroes) {
    hero.alive = true;
    recalcHero(hero);
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
    hero.buffs = [];
    hero.debuffs = [];
    hero.dots = [];
    hero.abilityCooldowns = {};
    // If hero lost their gear, give them starter equipment
    if (!hero.gear.weapon) {
      giveStarterGear(hero);
    }
  }
}

// Give a hero class-appropriate common starter gear
export function giveStarterGear(hero) {
  const classId = hero.classId;
  const STARTER = {
    berserker: {
      weapon: { name: 'Rusty Greatsword', icon: '\u2694\uFE0F', weaponType: 'greatsword', size: 5, damageType: 'physical', twoHanded: true, dmgMin: 7, dmgMax: 12, accuracy: 10 },
      body: { name: 'Worn Chainmail', icon: '\uD83E\uDDE5', size: 4, armor: 8, magicResist: 3 },
    },
    rogue: {
      weapon: { name: 'Chipped Dagger', icon: '\uD83D\uDDE1\uFE0F', weaponType: 'dagger', size: 1, damageType: 'physical', twoHanded: false, dmgMin: 4, dmgMax: 7, accuracy: 18 },
      body: { name: 'Tattered Leather', icon: '\uD83E\uDDE5', size: 3, armor: 5, magicResist: 2 },
    },
    arcanist: {
      weapon: { name: 'Cracked Wand', icon: '\uD83E\uDE84', weaponType: 'wand', size: 1, damageType: 'magic', twoHanded: false, dmgMin: 5, dmgMax: 10, accuracy: 16 },
      body: { name: 'Faded Robes', icon: '\uD83E\uDDE5', size: 2, armor: 2, magicResist: 8 },
    },
    cleric: {
      weapon: { name: 'Wooden Staff', icon: '\uD83E\uDE84', weaponType: 'staff', size: 3, damageType: 'magic', twoHanded: true, dmgMin: 4, dmgMax: 8, accuracy: 14 },
      body: { name: 'Acolyte Robes', icon: '\uD83E\uDDE5', size: 2, armor: 4, magicResist: 6 },
    },
    paladin: {
      weapon: { name: 'Dull Sword', icon: '\u2694\uFE0F', weaponType: 'sword', size: 3, damageType: 'physical', twoHanded: false, dmgMin: 5, dmgMax: 9, accuracy: 12 },
      body: { name: 'Dented Plate', icon: '\uD83E\uDDE5', size: 6, armor: 12, magicResist: 4 },
    },
    ranger: {
      weapon: { name: 'Worn Bow', icon: '\uD83C\uDFF9', weaponType: 'bow', size: 3, damageType: 'physical', twoHanded: true, dmgMin: 4, dmgMax: 8, accuracy: 16 },
      body: { name: 'Tattered Leather', icon: '\uD83E\uDDE5', size: 3, armor: 5, magicResist: 2 },
    },
    necromancer: {
      weapon: { name: 'Bone Wand', icon: '\uD83E\uDE84', weaponType: 'wand', size: 1, damageType: 'magic', twoHanded: false, dmgMin: 4, dmgMax: 9, accuracy: 15 },
      body: { name: 'Tattered Robes', icon: '\uD83E\uDDE5', size: 2, armor: 2, magicResist: 7 },
    },
    bard: {
      weapon: { name: 'Rusty Dagger', icon: '\uD83D\uDDE1\uFE0F', weaponType: 'dagger', size: 1, damageType: 'physical', twoHanded: false, dmgMin: 3, dmgMax: 6, accuracy: 16 },
      body: { name: 'Traveler\'s Clothes', icon: '\uD83E\uDDE5', size: 2, armor: 3, magicResist: 4 },
    },
  };

  const gear = STARTER[classId] || STARTER.berserker;

  if (!hero.gear.weapon) {
    hero.gear.weapon = { id: uid(), ...gear.weapon, slot: 'weapon', rarity: 'common', statReq: {}, substats: [] };
  }
  if (!hero.gear.body) {
    hero.gear.body = { id: uid(), ...gear.body, slot: 'body', rarity: 'common', statReq: {}, substats: [] };
  }
}

// === Secure Container ===

export function secureContainerCapacity() {
  return Math.min(SECURE_CONTAINER_BASE + G.buildings.vault * SECURE_PER_VAULT, SECURE_CONTAINER_MAX);
}

export function secureContainerUsed() {
  return G.secureContainer.reduce((sum, item) => sum + item.size, 0);
}

export function canSecure(item) {
  return secureContainerUsed() + item.size <= secureContainerCapacity();
}

// === Recruitment ===

export function refreshRecruitPool() {
  const classIds = Object.keys(CLASSES);
  const poolSize = RECRUIT_POOL_BASE + G.buildings.tavern;
  const pool = [];
  const usedNames = G.heroes.map(h => h.name);

  for (let i = 0; i < poolSize; i++) {
    const classId = pick(classIds);
    const cls = CLASSES[classId];

    // Pick unused name
    let name;
    for (let tries = 0; tries < 50; tries++) {
      name = pick(HERO_NAMES);
      if (!usedNames.includes(name) && !pool.find(r => r.name === name)) break;
    }
    usedNames.push(name);

    // Generate stats with slight variance — tavern level boosts quality
    const bonus = Math.floor(G.buildings.tavern * 0.5);
    const stats = { ...STAT_DEFAULTS };
    let points = STARTING_STAT_POINTS + bonus;
    while (points > 0) {
      const stat = pick(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
      stats[stat]++;
      points--;
    }

    // Cost scales exponentially by number of heroes owned: 1st=20, 2nd=50, 3rd=120, ...up to 1000
    const owned = G.heroes.length;
    const cost = Math.min(1000, Math.floor(20 * Math.pow(2.2, owned)));

    pool.push({ name, classId, stats, cost, id: uid() });
  }

  G.recruitPool = pool;
  G.lastRecruitRefresh = Date.now();
}

export function shouldRefreshRecruits() {
  return Date.now() - G.lastRecruitRefresh >= RECRUIT_REFRESH_MS;
}

export function hireRecruit(recruitId) {
  const recruit = G.recruitPool.find(r => r.id === recruitId);
  if (!recruit) return null;
  if (G.gold < recruit.cost) return null;

  G.gold -= recruit.cost;
  const hero = createHero(recruit.name, recruit.classId, recruit.stats);
  G.heroes.push(hero);

  // Remove from pool
  G.recruitPool = G.recruitPool.filter(r => r.id !== recruitId);
  saveGame();
  return hero;
}
