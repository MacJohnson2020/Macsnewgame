// === Voidborn — Game State Management ===

import { STAT_DEFAULTS, CLASSES, xpForLevel, HERO_INVENTORY_SIZE, BASE_STASH_SIZE, MAX_ENERGY, GEAR_SLOTS,
  SECURE_CONTAINER_BASE, SECURE_PER_VAULT, SECURE_CONTAINER_MAX,
  RECRUIT_BASE_COST, RECRUIT_POOL_BASE, RECRUIT_REFRESH_MS, HERO_NAMES, STARTING_STAT_POINTS,
  SKILLS, SKILL_MAX_LEVEL, SKILL_AFK_MAX, SKILL_TIERS, skillXpForLevel,
  MATERIALS, getGatherableAt, getRareDropsAt, ACHIEVEMENTS } from './config.js';
import { uid, deepClone, pick, randInt } from './utils.js';

const SAVE_KEY_PREFIX = 'voidborn_save';
const SLOT_KEY = 'voidborn_active_slot';
const SAVE_VERSION = 1;
const MAX_SLOTS = 3;

// Get active save slot (defaults to 0)
export function getActiveSlot() {
  const s = localStorage.getItem(SLOT_KEY);
  return s ? parseInt(s, 10) : 0;
}

export function setActiveSlot(slot) {
  localStorage.setItem(SLOT_KEY, String(slot));
}

function saveKey(slot = getActiveSlot()) {
  return slot === 0 ? SAVE_KEY_PREFIX : `${SAVE_KEY_PREFIX}_${slot}`;
}

// Get list of all slots with basic info (for slot picker)
export function listSaveSlots() {
  const slots = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const key = i === 0 ? SAVE_KEY_PREFIX : `${SAVE_KEY_PREFIX}_${i}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      slots.push({ slot: i, empty: true });
      continue;
    }
    try {
      const data = JSON.parse(raw);
      const state = data.state;
      const mainHero = (state.heroes || []).find(h => h.isMain);
      slots.push({
        slot: i,
        empty: false,
        heroName: mainHero?.name || 'Unknown',
        level: mainHero?.level || 1,
        heroCount: (state.heroes || []).length,
        gold: state.gold || 0,
        raids: state.totalRaids || 0,
        lastSave: state.lastSave,
        className: mainHero?.classId || 'unknown',
      });
    } catch (e) {
      slots.push({ slot: i, empty: true });
    }
  }
  return slots;
}

export const MAX_SAVE_SLOTS = MAX_SLOTS;

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

// Recalculate derived stats for a hero (includes gear substat + skill bonuses)
export function recalcHero(hero) {
  const cls = CLASSES[hero.classId];
  // Apply skill stat bonuses
  const skillBonuses = getSkillStatBonuses();
  const effectiveCON = hero.stats.CON + (skillBonuses.CON || 0);
  const effectiveINT = hero.stats.INT + (skillBonuses.INT || 0);
  const conMod = Math.floor((effectiveCON - 10) / 2);
  const intMod = Math.floor((effectiveINT - 10) / 2);

  // Base + level + stat bonuses
  let maxHp = cls.hpBase + cls.hpPerLevel * (hero.level - 1) + conMod * 2;
  let maxMp = cls.mpBase + cls.mpPerLevel * (hero.level - 1) + intMod * 2;

  // Add gear substat bonuses (maxHp, maxMp)
  if (hero.gear) {
    for (const slot of GEAR_SLOTS) {
      const item = hero.gear[slot];
      if (item && item.substats) {
        for (const sub of item.substats) {
          if (sub.id === 'maxHp') maxHp += sub.value;
          if (sub.id === 'maxMp') maxMp += sub.value;
        }
      }
    }
  }

  hero.maxHp = maxHp;
  hero.maxMp = maxMp;
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

    // Skills (all 12, each has xp + level)
    skills: Object.fromEntries(Object.keys(SKILLS).map(id => [id, { xp: 0, level: 1 }])),
    materials: {}, // { material_id: count }
    trainingQueues: [], // [{heroId, skillId, startTime, actionsLeft}]

    // Insurance — hero IDs whose gear is paid up for the next raid
    pendingInsurance: null,

    // Factions & Bounties
    factionRep: {
      delvers_guild: 0,
      iron_covenant: 0,
      shadow_market: 0,
      holy_order: 0,
      void_seekers: 0,
    },
    activeBounties: [],  // [{id, factionId, type, desc, target, count, progress, rep, gold}]
    completedBounties: 0,

    // Achievements — array of unlocked achievement IDs
    achievements: [],
    // Contextual tips seen (won't show again)
    seenTips: [],

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
    localStorage.setItem(saveKey(), JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

// Load from localStorage
export function loadGame() {
  try {
    const raw = localStorage.getItem(saveKey());
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
  if (!s.skills) s.skills = Object.fromEntries(Object.keys(SKILLS).map(id => [id, { xp: 0, level: 1 }]));
  if (!s.materials) s.materials = {};
  if (!s.trainingQueues) s.trainingQueues = [];
  if (s.pendingInsurance === undefined) s.pendingInsurance = null;
  if (!s.factionRep) s.factionRep = { delvers_guild: 0, iron_covenant: 0, shadow_market: 0, holy_order: 0, void_seekers: 0 };
  if (!s.activeBounties) s.activeBounties = [];
  if (s.completedBounties === undefined) s.completedBounties = 0;
  if (!s.achievements) s.achievements = [];
  if (!s.seenTips) s.seenTips = [];
  // Active raid combat: ensure events array exists for floating damage numbers
  if (s.activeRaid && s.activeRaid.combat && !s.activeRaid.combat.events) {
    s.activeRaid.combat.events = [];
  }
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
  localStorage.removeItem(saveKey());
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

  const progress = { gold: 0, energy: 0, minutes: Math.floor(minutes), skillActions: 0 };

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

  // Skill training — process queued actions (capped at AFK max)
  progress.skillGains = {}; // skillId: { actions, xp, levelUps }
  progress.materialGains = {}; // materialId: count
  const cappedMinutes = Math.min(minutes, SKILL_AFK_MAX);
  for (const queue of G.trainingQueues) {
    if (queue.actionsLeft <= 0) continue;
    const actionTime = 2; // 2 min per action
    const actionsDone = Math.min(queue.actionsLeft, Math.floor(cappedMinutes / actionTime));
    if (actionsDone > 0) {
      const skillId = queue.skillId;
      const startLevel = G.skills[skillId]?.level || 1;
      const startMats = { ...G.materials };

      for (let i = 0; i < actionsDone; i++) {
        processSkillAction(skillId, queue.heroId);
        queue.actionsLeft--;
        progress.skillActions++;
      }

      // Track per-skill gains
      const endLevel = G.skills[skillId]?.level || 1;
      const tier = [...SKILL_TIERS].reverse().find(t => startLevel >= t.level) || SKILL_TIERS[0];
      if (!progress.skillGains[skillId]) progress.skillGains[skillId] = { actions: 0, xp: 0, levelUps: 0 };
      progress.skillGains[skillId].actions += actionsDone;
      progress.skillGains[skillId].xp += actionsDone * tier.xp;
      progress.skillGains[skillId].levelUps += endLevel - startLevel;

      // Track material gains
      for (const [matId, count] of Object.entries(G.materials)) {
        const diff = count - (startMats[matId] || 0);
        if (diff > 0) {
          progress.materialGains[matId] = (progress.materialGains[matId] || 0) + diff;
        }
      }
    }
  }
  // Remove finished queues
  G.trainingQueues = G.trainingQueues.filter(q => q.actionsLeft > 0);

  G.lastOnline = now;
  return progress;
}

// Process a single skill action (gathering/training)
export function processSkillAction(skillId, heroId) {
  const skillDef = SKILLS[skillId];
  if (!skillDef) return;
  const skill = G.skills[skillId];
  if (!skill || skill.level >= SKILL_MAX_LEVEL) return;

  // Get tier for XP
  const tier = [...SKILL_TIERS].reverse().find(t => skill.level >= t.level) || SKILL_TIERS[0];

  // Award XP
  skill.xp += tier.xp;

  // Level up check
  while (skill.level < SKILL_MAX_LEVEL) {
    const needed = skillXpForLevel(skill.level + 1);
    if (skill.xp < needed) break;
    skill.xp -= needed;
    skill.level++;
  }

  // Gathering: produce materials
  if (skillDef.type === 'gathering') {
    const mat = getGatherableAt(skillId, skill.level);
    if (mat) {
      const [matId] = mat;
      G.materials[matId] = (G.materials[matId] || 0) + 1;
    }
    // Rare drop check
    const rares = getRareDropsAt(skillId, skill.level);
    if (rares.length > 0) {
      const [rareId, rareDef] = rares[0]; // highest tier rare
      if (Math.random() * 100 < rareDef.dropPct) {
        G.materials[rareId] = (G.materials[rareId] || 0) + 1;
      }
    }
  }
}

// Start training a skill
export function startTraining(heroId, skillId) {
  // Check workshop slots
  const maxSlots = 1 + Math.floor(G.buildings.workshop / 3);
  if (G.trainingQueues.length >= maxSlots) return false;

  // Check hero not already training
  if (G.trainingQueues.find(q => q.heroId === heroId)) return false;

  // Check hero not in active raid
  if (G.activeRaid && G.activeRaid.party.includes(heroId)) return false;

  const maxActions = Math.floor(SKILL_AFK_MAX / 2); // 30 actions max (60 min / 2 min each)
  G.trainingQueues.push({
    heroId,
    skillId,
    startTime: Date.now(),
    actionsLeft: maxActions,
  });
  return true;
}

// Stop training for a hero
export function stopTraining(heroId) {
  G.trainingQueues = G.trainingQueues.filter(q => q.heroId !== heroId);
}

// Check if hero is currently training
export function isHeroTraining(heroId) {
  return G.trainingQueues.some(q => q.heroId === heroId);
}

// Get skill stat bonuses (every 10 levels = +1)
// === Insurance ===
// Calculate insurance cost for a hero based on their gear value
export function getInsuranceCost(hero) {
  if (!hero || !hero.gear) return 0;
  const rarityValue = { common: 5, uncommon: 12, rare: 30, epic: 75, legendary: 200 };
  let cost = 0;
  for (const slot of GEAR_SLOTS) {
    const item = hero.gear[slot];
    if (item) cost += rarityValue[item.rarity || 'common'] || 5;
  }
  // Shrine reduces cost
  const shrineLevel = G.buildings.shrine || 0;
  const discount = Math.min(0.5, shrineLevel * 0.05);
  return Math.max(1, Math.floor(cost * (1 - discount)));
}

// Buy insurance for one or more heroes (pay gold, mark for next raid)
export function buyInsurance(heroIds) {
  let totalCost = 0;
  for (const id of heroIds) {
    const hero = getHero(id);
    if (hero) totalCost += getInsuranceCost(hero);
  }
  if (G.gold < totalCost) return false;
  G.gold -= totalCost;
  G.pendingInsurance = [...heroIds];
  return totalCost;
}

export function isHeroInsured(heroId) {
  return G.pendingInsurance && G.pendingInsurance.includes(heroId);
}

// === Achievements ===
// Check all achievements and unlock any that are newly met
// Returns an array of newly unlocked achievements (for popup display)
export function checkAchievements() {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (G.achievements.includes(ach.id)) continue;
    try {
      if (ach.check(G)) {
        G.achievements.push(ach.id);
        if (ach.rewardGold) G.gold += ach.rewardGold;
        newlyUnlocked.push(ach);
      }
    } catch (e) {
      // Ignore check errors (missing data etc.)
    }
  }
  if (newlyUnlocked.length > 0) saveGame();
  return newlyUnlocked;
}

export function getSkillStatBonuses() {
  const bonuses = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  for (const [skillId, skillDef] of Object.entries(SKILLS)) {
    const level = G.skills[skillId]?.level || 1;
    const stat = skillDef.statBonus;
    bonuses[stat] += Math.floor(level / 10);
  }
  return bonuses;
}

// Get workshop training slot count
export function getTrainingSlots() {
  return Math.min(4, 1 + Math.floor(G.buildings.workshop / 3));
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
      weapon: { name: 'Rusty Dagger', icon: '\uD83D\uDDE1\uFE0F', weaponType: 'dagger', size: 1, damageType: 'physical', twoHanded: false, dmgMin: 4, dmgMax: 7, accuracy: 18 },
      body: { name: 'Traveler\'s Clothes', icon: '\uD83E\uDDE5', size: 2, armor: 4, magicResist: 5 },
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
