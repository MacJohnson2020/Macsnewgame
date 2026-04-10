// === Voidborn — Game Configuration ===

// DnD Stats
export const STATS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export const STAT_DESC = {
  STR: 'Melee damage, heavy weapon reqs',
  DEX: 'Initiative, accuracy, ranged/finesse',
  CON: 'Max HP, HP regen, poison resist',
  INT: 'Magic damage, staff/wand reqs',
  WIS: 'Magic resist, perception, healing',
  CHA: 'Merchant prices, recruit cost',
};

export const STAT_DEFAULTS = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
export const STARTING_STAT_POINTS = 6;
export const STAT_POINTS_PER_LEVEL = 2;

// Classes
export const CLASSES = {
  fighter: {
    id: 'fighter',
    name: 'Fighter',
    icon: '\u2694\uFE0F',
    desc: 'Frontline melee — high STR, heavy armor, weapon mastery',
    hpBase: 40,
    hpPerLevel: 8,
    mpBase: 10,
    mpPerLevel: 2,
    abilities: [
      { id: 'power_strike', name: 'Power Strike', desc: 'Deal 150% weapon damage', mpCost: 3, level: 1, dmgMult: 1.5 },
      { id: 'shield_bash', name: 'Shield Bash', desc: 'Deal damage and stun for 1 turn', mpCost: 5, level: 3, dmgMult: 0.8, effect: 'stun' },
      { id: 'rally', name: 'Rally', desc: 'Boost party accuracy by 20% for 3 turns', mpCost: 6, level: 5, buff: { stat: 'accuracy', pct: 20, turns: 3 } },
      { id: 'cleave', name: 'Cleave', desc: 'Hit all enemies for 80% damage', mpCost: 8, level: 8, dmgMult: 0.8, aoe: true },
    ],
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    icon: '\uD83D\uDDE1\uFE0F',
    desc: 'Fast striker — high DEX, crits, evasion, finesse weapons',
    hpBase: 30,
    hpPerLevel: 5,
    mpBase: 15,
    mpPerLevel: 3,
    abilities: [
      { id: 'backstab', name: 'Backstab', desc: 'Deal 200% damage, +30% crit chance', mpCost: 4, level: 1, dmgMult: 2.0, critBonus: 30 },
      { id: 'smoke_bomb', name: 'Smoke Bomb', desc: 'Reduce all enemies accuracy by 30% for 2 turns', mpCost: 5, level: 3, debuff: { stat: 'accuracy', pct: -30, turns: 2 }, aoe: true },
      { id: 'poison_blade', name: 'Poison Blade', desc: 'Apply poison: 5 damage/turn for 3 turns', mpCost: 4, level: 5, dot: { damage: 5, turns: 3 } },
      { id: 'assassinate', name: 'Assassinate', desc: 'Deal 300% damage to targets below 25% HP', mpCost: 10, level: 8, dmgMult: 3.0, executeThreshold: 25 },
    ],
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    icon: '\uD83E\uDDD9',
    desc: 'Arcane caster — high INT, AoE spells, glass cannon',
    hpBase: 25,
    hpPerLevel: 4,
    mpBase: 30,
    mpPerLevel: 5,
    abilities: [
      { id: 'fireball', name: 'Fireball', desc: 'Deal 120% magic damage to all enemies', mpCost: 6, level: 1, dmgMult: 1.2, aoe: true, magic: true, element: 'fire' },
      { id: 'frost_bolt', name: 'Frost Bolt', desc: 'Deal 150% magic damage, slow target 1 turn', mpCost: 4, level: 3, dmgMult: 1.5, magic: true, element: 'ice', effect: 'slow' },
      { id: 'arcane_shield', name: 'Arcane Shield', desc: 'Gain +50% magic resist for 3 turns', mpCost: 5, level: 5, selfBuff: { stat: 'magicResist', pct: 50, turns: 3 } },
      { id: 'meteor', name: 'Meteor', desc: 'Deal 250% magic damage to all enemies', mpCost: 15, level: 8, dmgMult: 2.5, aoe: true, magic: true, element: 'fire' },
    ],
  },
};

// XP curve
export function xpForLevel(level) {
  return Math.floor(50 * Math.pow(level, 1.8));
}

// Equipment slots (RuneScape style)
export const GEAR_SLOTS = ['head','body','legs','weapon','offhand','hands','feet','cape','neck','ring','ammo'];

export const GEAR_SLOT_INFO = {
  head:    { name: 'Head',     icon: '\u26D1\uFE0F' },
  body:    { name: 'Body',     icon: '\uD83E\uDDE5' },
  legs:    { name: 'Legs',     icon: '\uD83D\uDC56' },
  weapon:  { name: 'Weapon',   icon: '\u2694\uFE0F' },
  offhand: { name: 'Off-hand', icon: '\uD83D\uDEE1\uFE0F' },
  hands:   { name: 'Hands',    icon: '\uD83E\uDDE4' },
  feet:    { name: 'Feet',     icon: '\uD83D\uDC62' },
  cape:    { name: 'Cape',     icon: '\uD83E\uDDE3' },
  neck:    { name: 'Neck',     icon: '\uD83D\uDCFF' },
  ring:    { name: 'Ring',     icon: '\uD83D\uDC8D' },
  ammo:    { name: 'Ammo',     icon: '\uD83C\uDFF9' },
};

// Weapon types
export const WEAPON_TYPES = {
  sword:      { name: 'Sword',      icon: '\u2694\uFE0F',      slot: 'weapon', size: 3, statReq: { STR: 10 }, damageType: 'physical', baseDmg: [8, 14],  baseAcc: 15, twoHanded: false },
  dagger:     { name: 'Dagger',     icon: '\uD83D\uDDE1\uFE0F', slot: 'weapon', size: 1, statReq: { DEX: 10 }, damageType: 'physical', baseDmg: [5, 10],  baseAcc: 25, twoHanded: false },
  greatsword: { name: 'Greatsword', icon: '\u2694\uFE0F',      slot: 'weapon', size: 5, statReq: { STR: 14 }, damageType: 'physical', baseDmg: [14, 22], baseAcc: 10, twoHanded: true },
  bow:        { name: 'Bow',        icon: '\uD83C\uDFF9',       slot: 'weapon', size: 3, statReq: { DEX: 12 }, damageType: 'physical', baseDmg: [7, 13],  baseAcc: 20, twoHanded: true, usesAmmo: true },
  staff:      { name: 'Staff',      icon: '\uD83E\uDE84',       slot: 'weapon', size: 3, statReq: { INT: 12 }, damageType: 'magic',    baseDmg: [10, 18], baseAcc: 18, twoHanded: true },
  wand:       { name: 'Wand',       icon: '\uD83E\uDE84',       slot: 'weapon', size: 1, statReq: { INT: 10 }, damageType: 'magic',    baseDmg: [6, 12],  baseAcc: 22, twoHanded: false },
  crossbow:   { name: 'Crossbow',   icon: '\uD83C\uDFF9',       slot: 'weapon', size: 3, statReq: { DEX: 11 }, damageType: 'physical', baseDmg: [9, 16],  baseAcc: 18, twoHanded: false, usesAmmo: true },
};

// Off-hand types
export const OFFHAND_TYPES = {
  shield:     { name: 'Shield',     icon: '\uD83D\uDEE1\uFE0F', slot: 'offhand', size: 3, statReq: { STR: 10 }, baseArmor: [8, 16], baseMR: [3, 6] },
  tome:       { name: 'Tome',       icon: '\uD83D\uDCD6',       slot: 'offhand', size: 2, statReq: { INT: 10 }, baseArmor: [1, 3],  baseMR: [8, 14] },
  offDagger:  { name: 'Off-dagger', icon: '\uD83D\uDDE1\uFE0F', slot: 'offhand', size: 1, statReq: { DEX: 11 }, baseDmg: [3, 7], baseAcc: 12 },
};

// Body armor types
export const BODY_TYPES = {
  leather:   { name: 'Leather Armor', icon: '\uD83E\uDDE5',      slot: 'body', size: 3, statReq: {},           baseArmor: [5, 10],  baseMR: [2, 5] },
  chainmail: { name: 'Chainmail',     icon: '\uD83E\uDDE5',      slot: 'body', size: 4, statReq: { STR: 12 }, baseArmor: [10, 18], baseMR: [3, 6] },
  plate:     { name: 'Plate Armor',   icon: '\uD83D\uDEE1\uFE0F', slot: 'body', size: 6, statReq: { STR: 15 }, baseArmor: [18, 28], baseMR: [2, 4] },
  robes:     { name: 'Mage Robes',    icon: '\uD83E\uDDE5',      slot: 'body', size: 2, statReq: { INT: 10 }, baseArmor: [2, 5],   baseMR: [10, 20] },
};

// Other gear slot types
export const SLOT_TYPES = {
  // Head
  helm:      { name: 'Helm',       icon: '\u26D1\uFE0F', slot: 'head',  size: 2, baseArmor: [4, 10],  baseMR: [1, 4] },
  hood:      { name: 'Hood',       icon: '\u26D1\uFE0F', slot: 'head',  size: 1, baseArmor: [1, 3],   baseMR: [4, 10] },
  circlet:   { name: 'Circlet',    icon: '\u26D1\uFE0F', slot: 'head',  size: 1, baseArmor: [1, 2],   baseMR: [3, 8] },
  // Legs
  greaves:   { name: 'Greaves',    icon: '\uD83D\uDC56', slot: 'legs',  size: 3, statReq: { STR: 10 }, baseArmor: [6, 14], baseMR: [1, 3] },
  leggings:  { name: 'Leggings',   icon: '\uD83D\uDC56', slot: 'legs',  size: 2, baseArmor: [3, 8],   baseMR: [2, 5] },
  robeskirt: { name: 'Robe Skirt', icon: '\uD83D\uDC56', slot: 'legs',  size: 2, baseArmor: [1, 3],   baseMR: [5, 12] },
  // Hands
  gauntlets: { name: 'Gauntlets',  icon: '\uD83E\uDDE4', slot: 'hands', size: 2, statReq: { STR: 10 }, baseArmor: [3, 7], baseMR: [0, 2] },
  gloves:    { name: 'Gloves',     icon: '\uD83E\uDDE4', slot: 'hands', size: 1, baseArmor: [1, 3],   baseMR: [1, 3] },
  bracers:   { name: 'Bracers',    icon: '\uD83E\uDDE4', slot: 'hands', size: 1, baseArmor: [2, 5],   baseMR: [1, 4] },
  // Feet
  boots:     { name: 'Boots',      icon: '\uD83D\uDC62', slot: 'feet',  size: 2, baseArmor: [3, 8],   baseMR: [1, 3] },
  sandals:   { name: 'Sandals',    icon: '\uD83D\uDC62', slot: 'feet',  size: 1, baseArmor: [0, 2],   baseMR: [3, 7] },
  // Cape
  cloak:     { name: 'Cloak',      icon: '\uD83E\uDDE3', slot: 'cape',  size: 2, baseArmor: [2, 5],   baseMR: [2, 5] },
  cape:      { name: 'Cape',       icon: '\uD83E\uDDE3', slot: 'cape',  size: 1, baseArmor: [1, 3],   baseMR: [1, 3] },
  // Neck
  amulet:    { name: 'Amulet',     icon: '\uD83D\uDCFF', slot: 'neck',  size: 1 },
  necklace:  { name: 'Necklace',   icon: '\uD83D\uDCFF', slot: 'neck',  size: 1 },
  // Ring
  ring:      { name: 'Ring',       icon: '\uD83D\uDC8D', slot: 'ring',  size: 1 },
  signet:    { name: 'Signet',     icon: '\uD83D\uDC8D', slot: 'ring',  size: 1 },
  // Ammo
  arrows:    { name: 'Arrows',     icon: '\u27B3',       slot: 'ammo',  size: 1, stackable: true },
  bolts:     { name: 'Bolts',      icon: '\u27B3',       slot: 'ammo',  size: 1, stackable: true },
  runes:     { name: 'Runes',      icon: '\uD83D\uDD2E', slot: 'ammo',  size: 1, stackable: true },
};

// Rarity config
export const RARITIES = {
  common:    { name: 'Common',    color: 'common',    statMult: 1.0, substatCount: 0, weight: 50 },
  uncommon:  { name: 'Uncommon',  color: 'uncommon',  statMult: 1.2, substatCount: 1, weight: 30 },
  rare:      { name: 'Rare',      color: 'rare',      statMult: 1.5, substatCount: 1, weight: 14 },
  epic:      { name: 'Epic',      color: 'epic',      statMult: 2.0, substatCount: 2, weight: 5 },
  legendary: { name: 'Legendary', color: 'legendary', statMult: 3.0, substatCount: 2, weight: 1 },
};

// Possible substats for gear
export const SUBSTATS = [
  { id: 'accuracy', name: 'Accuracy', range: [3, 10] },
  { id: 'armorPen', name: 'Armor Pen', range: [3, 12], suffix: '%' },
  { id: 'magicPen', name: 'Magic Pen', range: [3, 12], suffix: '%' },
  { id: 'critChance', name: 'Crit Chance', range: [2, 8], suffix: '%' },
  { id: 'maxHp', name: 'Max HP', range: [5, 25] },
  { id: 'maxMp', name: 'Max MP', range: [3, 15] },
];

// Consumables
export const CONSUMABLES = {
  health_potion:  { name: 'Health Potion',  icon: '\u2764\uFE0F', size: 1, effect: 'heal',   value: 30, desc: 'Restore 30 HP' },
  mana_potion:    { name: 'Mana Potion',    icon: '\uD83D\uDCA7', size: 1, effect: 'mana',   value: 15, desc: 'Restore 15 MP' },
  revival_scroll: { name: 'Revival Scroll',  icon: '\uD83D\uDCDC', size: 2, effect: 'revive', value: 50, desc: 'Revive a dead hero with 50% HP (very rare)' },
  antidote:       { name: 'Antidote',        icon: '\uD83C\uDF3F', size: 1, effect: 'cure',   value: 0,  desc: 'Remove poison and DoT effects' },
};

// Enemy types by zone
export const ENEMIES = {
  // Rust Crypts
  crypt_rat:    { name: 'Crypt Rat',     icon: '\uD83D\uDC00', hp: 10,  armor: 1,  mr: 1,  acc: 8,  dmg: [2, 4],   speed: 12, xp: 10, tier: 1 },
  skeleton:     { name: 'Skeleton',      icon: '\uD83D\uDC80', hp: 16,  armor: 3,  mr: 2,  acc: 10, dmg: [3, 6],   speed: 8,  xp: 18, tier: 2 },
  ghoul:        { name: 'Ghoul',         icon: '\uD83E\uDDDF', hp: 24,  armor: 4,  mr: 3,  acc: 12, dmg: [4, 8],   speed: 10, xp: 25, tier: 3 },
  crypt_guard:  { name: 'Crypt Guard',   icon: '\uD83D\uDC82', hp: 40,  armor: 10, mr: 5,  acc: 14, dmg: [7, 12],  speed: 6,  xp: 45, elite: true, tier: 4 },

  // Neon Depths
  void_spider:  { name: 'Void Spider',   icon: '\uD83D\uDD77\uFE0F', hp: 30,  armor: 5,  mr: 10, acc: 20, dmg: [6, 11],  speed: 15, xp: 20, tier: 1 },
  corrupted:    { name: 'Corrupted One',  icon: '\uD83D\uDE08', hp: 45,  armor: 12, mr: 12, acc: 18, dmg: [9, 15],  speed: 10, xp: 30, tier: 2 },
  neon_wraith:  { name: 'Neon Wraith',   icon: '\uD83D\uDC7B', hp: 35,  armor: 3,  mr: 22, acc: 22, dmg: [12, 18], speed: 14, xp: 35, magic: true, tier: 3 },
  tech_golem:   { name: 'Tech Golem',    icon: '\uD83E\uDD16', hp: 80,  armor: 25, mr: 15, acc: 14, dmg: [14, 22], speed: 4,  xp: 55, elite: true, tier: 4 },

  // Void Marshes
  marsh_lurker: { name: 'Marsh Lurker',  icon: '\uD83D\uDC0D', hp: 45,  armor: 10, mr: 8,  acc: 20, dmg: [10, 16], speed: 11, xp: 35, tier: 1 },
  bog_witch:    { name: 'Bog Witch',     icon: '\uD83E\uDDD9', hp: 40,  armor: 4,  mr: 25, acc: 24, dmg: [14, 20], speed: 9,  xp: 45, magic: true, tier: 2 },
  void_beast:   { name: 'Void Beast',    icon: '\uD83D\uDC32', hp: 100, armor: 20, mr: 18, acc: 22, dmg: [18, 28], speed: 8,  xp: 80, elite: true, tier: 4 },
};

// Zones
export const ZONES = [
  {
    id: 'rust_crypts',
    name: 'Rust Crypts',
    icon: '\uD83C\uDFDA\uFE0F',
    desc: 'Ancient tombs corrupted by void energy. Good for beginners.',
    levelRange: [1, 15],
    nodes: [10, 12],
    forkChance: 0.25,
    enemies: ['crypt_rat', 'skeleton', 'ghoul'],
    elites: ['crypt_guard'],
    corruptionRate: 1.0,
    lootLevel: 1,
    energyCost: 5,
  },
  {
    id: 'neon_depths',
    name: 'Neon Depths',
    icon: '\uD83C\uDF03',
    desc: 'Ruined undercity pulsing with corrupted tech. Beware of traps.',
    levelRange: [10, 30],
    nodes: [12, 16],
    forkChance: 0.35,
    enemies: ['void_spider', 'corrupted', 'neon_wraith'],
    elites: ['tech_golem'],
    corruptionRate: 1.3,
    lootLevel: 2,
    energyCost: 10,
  },
  {
    id: 'void_marshes',
    name: 'Void Marshes',
    icon: '\uD83C\uDF3F',
    desc: 'Toxic swampland saturated with void corruption. Environmental hazards.',
    levelRange: [25, 50],
    nodes: [14, 18],
    forkChance: 0.4,
    enemies: ['marsh_lurker', 'bog_witch'],
    elites: ['void_beast'],
    corruptionRate: 1.5,
    lootLevel: 3,
    energyCost: 15,
  },
];

// Corruption thresholds (steps)
export const CORRUPTION_LEVELS = [
  { threshold: 0,  name: 'Clear',    extraSpawns: 0, desc: 'No corruption effects' },
  { threshold: 15, name: 'Tainted',  extraSpawns: 1, desc: 'Enemies grow stronger' },
  { threshold: 25, name: 'Corrupt',  extraSpawns: 2, desc: 'Darkness spreads, danger rises' },
  { threshold: 35, name: 'Void Storm', extraSpawns: 3, desc: 'A Void Stalker hunts you...' },
];

// Encounter types and their weights per zone
export const ENCOUNTER_WEIGHTS = {
  enemy:     40,
  chest:     20,
  trap:      10,
  shrine:    8,
  merchant:  5,
  event:     7,
  empty:     10,
};

// Buildings
export const BUILDINGS = {
  generator: { name: 'Generator',  icon: '\u26A1', desc: 'Energy regeneration',          maxLevel: 10, baseCost: 50,  costMult: 1.8, effect: 'energy_regen' },
  foundry:   { name: 'Foundry',    icon: '\uD83D\uDD25', desc: 'Passive gold generation', maxLevel: 10, baseCost: 100, costMult: 2.0, effect: 'gold_per_min' },
  vault:     { name: 'Vault',      icon: '\uD83C\uDFE6', desc: 'Stash capacity + secure container', maxLevel: 10, baseCost: 150, costMult: 2.2, effect: 'stash_size' },
  workshop:  { name: 'Workshop',   icon: '\uD83D\uDD27', desc: 'Crafting speed + training slots', maxLevel: 10, baseCost: 120, costMult: 2.0, effect: 'crafting' },
  tavern:    { name: 'Tavern',     icon: '\uD83C\uDF7A', desc: 'Hero recruitment pool',   maxLevel: 10, baseCost: 200, costMult: 2.5, effect: 'recruitment' },
  shrine:    { name: 'Shrine',     icon: '\u26EA', desc: 'Insurance discount + XP bonus', maxLevel: 10, baseCost: 180, costMult: 2.3, effect: 'insurance' },
};

// Inventory
export const HERO_INVENTORY_SIZE = 25;
export const BASE_STASH_SIZE = 30;
export const STASH_PER_VAULT_LEVEL = 10;
export const SECURE_CONTAINER_BASE = 2;
export const SECURE_PER_VAULT = 1;
export const SECURE_CONTAINER_MAX = 6;

// Energy
export const MAX_ENERGY = 100;
export const ENERGY_REGEN_BASE = 1; // per minute

// Recruitment
export const RECRUIT_BASE_COST = 100;
export const RECRUIT_POOL_BASE = 2;
export const RECRUIT_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

export const HERO_NAMES = [
  'Aldric', 'Brynn', 'Caelum', 'Dara', 'Elric', 'Fynn', 'Gwen', 'Hilda',
  'Ivar', 'Jorin', 'Kael', 'Lyra', 'Morven', 'Nyx', 'Orin', 'Petra',
  'Riven', 'Sable', 'Thane', 'Una', 'Vex', 'Wren', 'Xara', 'Yara', 'Zev',
  'Ashwin', 'Bron', 'Corrin', 'Dusk', 'Ember', 'Flint', 'Gareth', 'Hex',
];
