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
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    icon: '\uD83E\uDE93',
    desc: 'Reckless melee — high STR/CON, massive damage, takes more hits',
    hpBase: 45,
    hpPerLevel: 9,
    mpBase: 8,
    mpPerLevel: 2,
    abilities: [
      { id: 'reckless_strike', name: 'Reckless Strike', desc: 'Deal 200% damage, apply Bleed', mpCost: 3, level: 1, dmgMult: 2.0, applyDot: 'physical' },
      { id: 'rage', name: 'Rage', desc: 'Boost own damage by 40% for 3 turns', mpCost: 4, level: 3, selfBuff: { stat: 'damage', pct: 40, turns: 3 } },
      { id: 'blood_frenzy', name: 'Blood Frenzy', desc: 'Hit all enemies, apply Bleed', mpCost: 6, level: 5, dmgMult: 1.0, aoe: true, applyDot: 'physical' },
      { id: 'defy_death', name: 'Defy Death', desc: 'Deal 250% damage, heal 30% dealt', mpCost: 10, level: 8, dmgMult: 2.5, lifesteal: 30 },
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
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    icon: '\uD83D\uDD2E',
    desc: 'Arcane scholar — high INT, AoE spells, shields and devastation',
    hpBase: 30,
    hpPerLevel: 4,
    mpBase: 35,
    mpPerLevel: 6,
    abilities: [
      { id: 'arcane_blast', name: 'Arcane Blast', desc: 'Deal 130% magic damage to all, apply Poison', mpCost: 6, level: 1, dmgMult: 1.3, aoe: true, magic: true, applyDot: 'magic' },
      { id: 'frost_bolt', name: 'Frost Bolt', desc: 'Deal 160% ice damage, apply Frostbite', mpCost: 4, level: 3, dmgMult: 1.6, element: 'ice', applyDot: 'ice' },
      { id: 'arcane_shield', name: 'Arcane Shield', desc: 'Gain +50% magic resist for 3 turns', mpCost: 5, level: 5, selfBuff: { stat: 'magicResist', pct: 50, turns: 3 } },
      { id: 'meteor', name: 'Meteor', desc: 'Deal 250% fire damage to all enemies', mpCost: 15, level: 8, dmgMult: 2.5, aoe: true, element: 'fire' },
    ],
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    icon: '\u2695\uFE0F',
    desc: 'Divine healer — high WIS, heals, buffs, smites undead',
    hpBase: 32,
    hpPerLevel: 6,
    mpBase: 25,
    mpPerLevel: 5,
    abilities: [
      { id: 'smite', name: 'Smite', desc: 'Deal 150% holy damage to one enemy', mpCost: 4, level: 1, dmgMult: 1.5, element: 'holy' },
      { id: 'heal', name: 'Heal', desc: 'Restore 40% of an ally\'s max HP', mpCost: 4, level: 1, healAlly: true, healPct: 40 },
      { id: 'group_heal', name: 'Group Heal', desc: 'Heal all allies for 25% max HP', mpCost: 8, level: 5, healAlly: true, healPct: 25, aoe: true },
      { id: 'divine_shield', name: 'Divine Shield', desc: 'Boost party armor by 30% for 3 turns', mpCost: 10, level: 8, buff: { stat: 'armor', pct: 30, turns: 3 } },
    ],
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    icon: '\uD83D\uDEE1\uFE0F',
    desc: 'Holy tank — STR/WIS, heavy armor, protects allies',
    hpBase: 42,
    hpPerLevel: 8,
    mpBase: 15,
    mpPerLevel: 3,
    abilities: [
      { id: 'holy_strike', name: 'Holy Strike', desc: 'Deal 140% weapon damage', mpCost: 3, level: 1, dmgMult: 1.4 },
      { id: 'lay_on_hands', name: 'Lay on Hands', desc: 'Heal an ally for 50% of their max HP', mpCost: 6, level: 3, healAlly: true, healPct: 50 },
      { id: 'taunt', name: 'Taunt', desc: 'Force all enemies to target you for 2 turns', mpCost: 5, level: 5, selfBuff: { stat: 'taunt', pct: 1, turns: 2 } },
      { id: 'divine_smite', name: 'Divine Smite', desc: 'Deal 200% holy damage, +50% vs elites', mpCost: 10, level: 8, dmgMult: 2.0, element: 'holy' },
    ],
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    icon: '\uD83C\uDFF9',
    desc: 'Ranged hunter — DEX/WIS, bows, traps, precision shots',
    hpBase: 30,
    hpPerLevel: 5,
    mpBase: 18,
    mpPerLevel: 3,
    abilities: [
      { id: 'precision_shot', name: 'Precision Shot', desc: 'Deal 180% damage, +20% crit', mpCost: 4, level: 1, dmgMult: 1.8, critBonus: 20 },
      { id: 'volley', name: 'Volley', desc: 'Hit all enemies for 80% damage', mpCost: 6, level: 3, dmgMult: 0.8, aoe: true },
      { id: 'snare_trap', name: 'Snare Trap', desc: 'Stun target and deal 100% damage', mpCost: 5, level: 5, dmgMult: 1.0, effect: 'stun' },
      { id: 'headshot', name: 'Headshot', desc: 'Deal 300% damage to targets below 30% HP', mpCost: 10, level: 8, dmgMult: 3.0, executeThreshold: 30 },
    ],
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    icon: '\uD83D\uDC80',
    desc: 'Dark caster — INT/CON, drains life, curses, death magic',
    hpBase: 32,
    hpPerLevel: 5,
    mpBase: 28,
    mpPerLevel: 5,
    abilities: [
      { id: 'drain_life', name: 'Drain Life', desc: 'Deal 120% demonic damage, heal self for half', mpCost: 4, level: 1, dmgMult: 1.2, element: 'demonic', lifesteal: 50 },
      { id: 'curse', name: 'Curse', desc: 'Reduce enemy armor and MR by 30% for 3 turns', mpCost: 5, level: 3, debuff: { stat: 'armor', pct: -30, turns: 3 }, aoe: false },
      { id: 'death_coil', name: 'Death Coil', desc: 'Deal 150% demonic damage, apply Wither', mpCost: 6, level: 5, dmgMult: 1.5, element: 'demonic', applyDot: 'demonic' },
      { id: 'soul_harvest', name: 'Soul Harvest', desc: 'Deal 180% demonic damage to all, heal per hit', mpCost: 12, level: 8, dmgMult: 1.8, aoe: true, element: 'demonic', lifesteal: 30 },
    ],
  },
  bard: {
    id: 'bard',
    name: 'Bard',
    icon: '\uD83C\uDFB6',
    desc: 'Party buffer — high CHA, songs boost allies, debuff enemies',
    hpBase: 32,
    hpPerLevel: 5,
    mpBase: 25,
    mpPerLevel: 4,
    abilities: [
      { id: 'dissonance', name: 'Dissonance', desc: 'Deal 150% magic damage to one enemy', mpCost: 3, level: 1, dmgMult: 1.5, magic: true },
      { id: 'inspire', name: 'Inspire', desc: 'Boost party damage by 25% for 3 turns', mpCost: 4, level: 1, buff: { stat: 'damage', pct: 25, turns: 3 } },
      { id: 'war_song', name: 'War Song', desc: 'Boost party accuracy by 25% for 3 turns', mpCost: 5, level: 3, buff: { stat: 'accuracy', pct: 25, turns: 3 } },
      { id: 'lullaby', name: 'Lullaby', desc: 'Stun all enemies for 1 turn', mpCost: 7, level: 5, effect: 'stun', aoe: true },
      { id: 'encore', name: 'Encore', desc: 'Deal 120% lightning damage, reset ally cooldowns', mpCost: 12, level: 8, dmgMult: 1.2, element: 'lightning' },
    ],
  },
};

// XP curve
export function xpForLevel(level) {
  return Math.floor(50 * Math.pow(level, 1.8));
}

// === Damage Types & Elements ===
// physical and magic are base types; elements are rarer
export const DAMAGE_TYPES = {
  physical:  { name: 'Physical',  icon: '\u2694\uFE0F',      resist: 'armor',          dot: { name: 'Bleed',     icon: '\uD83E\uDE78', dmgPer: 3 } },
  magic:     { name: 'Magic',     icon: '\uD83D\uDD2E',      resist: 'magicResist',    dot: { name: 'Poison',    icon: '\u2620\uFE0F', dmgPer: 3 } },
  fire:      { name: 'Fire',      icon: '\uD83D\uDD25',      resist: 'fireResist',     dot: { name: 'Burn',      icon: '\uD83D\uDD25', dmgPer: 4 } },
  ice:       { name: 'Ice',       icon: '\u2744\uFE0F',      resist: 'iceResist',      dot: { name: 'Frostbite', icon: '\u2744\uFE0F', dmgPer: 2 } },
  lightning: { name: 'Lightning', icon: '\u26A1',             resist: 'lightningResist', dot: null },
  demonic:   { name: 'Demonic',   icon: '\uD83D\uDE08',      resist: 'demonicResist',  dot: { name: 'Wither',    icon: '\uD83D\uDE08', dmgPer: 3 } },
  holy:      { name: 'Holy',      icon: '\u2728',             resist: 'holyResist',     dot: null },
};

// All elemental resistance IDs (for gear generation)
export const ELEMENT_RESISTS = ['fireResist', 'iceResist', 'lightningResist', 'demonicResist', 'holyResist'];

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
// tags: undead, beast, demon, construct, humanoid — used for weakness flavor
// weakTo: these damage types deal 50% more damage (defense halved)
// resistTo: these damage types deal 50% less damage (defense doubled)
export const ENEMIES = {
  // Rust Crypts
  crypt_rat:    { name: 'Crypt Rat',     icon: '\uD83D\uDC00', hp: 10,  armor: 1,  mr: 1,  acc: 8,  dmg: [2, 4],   speed: 12, xp: 10, tier: 1,
                  tags: ['beast'], weakTo: ['fire'], resistTo: [] },
  skeleton:     { name: 'Skeleton',      icon: '\uD83D\uDC80', hp: 14,  armor: 2,  mr: 1,  acc: 9,  dmg: [2, 5],   speed: 8,  xp: 18, tier: 2,
                  tags: ['undead'], weakTo: ['holy', 'fire'], resistTo: ['demonic', 'ice'] },
  ghoul:        { name: 'Ghoul',         icon: '\uD83E\uDDDF', hp: 24,  armor: 4,  mr: 3,  acc: 12, dmg: [4, 8],   speed: 10, xp: 25, tier: 3,
                  tags: ['undead'], weakTo: ['holy', 'fire'], resistTo: ['demonic'] },
  crypt_guard:  { name: 'Crypt Guard',   icon: '\uD83D\uDC82', hp: 40,  armor: 10, mr: 5,  acc: 14, dmg: [7, 12],  speed: 6,  xp: 45, elite: true, tier: 4,
                  tags: ['undead', 'construct'], weakTo: ['holy', 'lightning'], resistTo: ['demonic', 'physical'] },

  // Neon Depths
  void_spider:  { name: 'Void Spider',   icon: '\uD83D\uDD77\uFE0F', hp: 30,  armor: 5,  mr: 10, acc: 20, dmg: [6, 11],  speed: 15, xp: 20, tier: 1,
                  tags: ['beast'], weakTo: ['fire', 'ice'], resistTo: [] },
  corrupted:    { name: 'Corrupted One',  icon: '\uD83D\uDE08', hp: 45,  armor: 12, mr: 12, acc: 18, dmg: [9, 15],  speed: 10, xp: 30, tier: 2, damageType: 'demonic',
                  tags: ['demon'], weakTo: ['holy', 'lightning'], resistTo: ['demonic', 'fire'] },
  neon_wraith:  { name: 'Neon Wraith',   icon: '\uD83D\uDC7B', hp: 35,  armor: 3,  mr: 22, acc: 22, dmg: [12, 18], speed: 14, xp: 35, magic: true, tier: 3, damageType: 'lightning',
                  tags: ['undead'], weakTo: ['holy'], resistTo: ['lightning', 'ice'] },
  tech_golem:   { name: 'Tech Golem',    icon: '\uD83E\uDD16', hp: 80,  armor: 25, mr: 15, acc: 14, dmg: [14, 22], speed: 4,  xp: 55, elite: true, tier: 4,
                  tags: ['construct'], weakTo: ['lightning', 'ice'], resistTo: ['holy', 'demonic'] },

  // Void Marshes
  marsh_lurker: { name: 'Marsh Lurker',  icon: '\uD83D\uDC0D', hp: 45,  armor: 10, mr: 8,  acc: 20, dmg: [10, 16], speed: 11, xp: 35, tier: 1,
                  tags: ['beast'], weakTo: ['ice', 'fire'], resistTo: [] },
  bog_witch:    { name: 'Bog Witch',     icon: '\uD83E\uDDD9', hp: 40,  armor: 4,  mr: 25, acc: 24, dmg: [14, 20], speed: 9,  xp: 45, magic: true, tier: 2, damageType: 'fire',
                  tags: ['humanoid'], weakTo: ['ice', 'holy'], resistTo: ['fire'] },
  void_beast:   { name: 'Void Beast',    icon: '\uD83D\uDC32', hp: 100, armor: 20, mr: 18, acc: 22, dmg: [18, 28], speed: 8,  xp: 80, elite: true, tier: 4, damageType: 'demonic',
                  tags: ['demon', 'beast'], weakTo: ['holy'], resistTo: ['demonic', 'fire'] },

  // Shattered Spire
  spire_sentinel: { name: 'Spire Sentinel', icon: '\uD83E\uDD16', hp: 55, armor: 18, mr: 10, acc: 22, dmg: [12, 20], speed: 7, xp: 50, tier: 1,
                    tags: ['construct'], weakTo: ['lightning', 'ice'], resistTo: ['holy', 'physical'] },
  void_cultist:   { name: 'Void Cultist',   icon: '\uD83E\uDDD9', hp: 45, armor: 6,  mr: 20, acc: 26, dmg: [14, 22], speed: 12, xp: 60, magic: true, tier: 2, damageType: 'demonic',
                    tags: ['humanoid'], weakTo: ['holy', 'physical'], resistTo: ['demonic', 'magic'] },
  crystal_wraith: { name: 'Crystal Wraith',  icon: '\uD83D\uDC7B', hp: 50, armor: 4,  mr: 28, acc: 28, dmg: [16, 24], speed: 14, xp: 65, magic: true, tier: 3, damageType: 'ice',
                    tags: ['undead'], weakTo: ['holy', 'fire'], resistTo: ['ice', 'lightning'] },
  spire_warden:   { name: 'Spire Warden',   icon: '\uD83D\uDC82', hp: 120, armor: 28, mr: 20, acc: 24, dmg: [20, 32], speed: 6, xp: 100, elite: true, tier: 4, damageType: 'lightning',
                    tags: ['construct'], weakTo: ['ice'], resistTo: ['lightning', 'holy', 'physical'] },

  // The Abyss
  abyssal_crawler: { name: 'Abyssal Crawler', icon: '\uD83D\uDC1B', hp: 60, armor: 14, mr: 14, acc: 26, dmg: [14, 22], speed: 16, xp: 70, tier: 1,
                     tags: ['beast', 'demon'], weakTo: ['holy', 'fire'], resistTo: ['demonic'] },
  void_knight:     { name: 'Void Knight',     icon: '\u2694\uFE0F', hp: 80, armor: 24, mr: 16, acc: 28, dmg: [18, 28], speed: 10, xp: 85, tier: 2, damageType: 'demonic',
                     tags: ['undead'], weakTo: ['holy'], resistTo: ['demonic', 'ice', 'physical'] },
  elder_demon:     { name: 'Elder Demon',     icon: '\uD83D\uDE08', hp: 70, armor: 10, mr: 30, acc: 30, dmg: [22, 34], speed: 13, xp: 95, magic: true, tier: 3, damageType: 'demonic',
                     tags: ['demon'], weakTo: ['holy', 'lightning'], resistTo: ['demonic', 'fire'] },
  void_lord:       { name: 'Void Lord',       icon: '\uD83D\uDC79', hp: 180, armor: 30, mr: 30, acc: 30, dmg: [28, 42], speed: 8, xp: 150, elite: true, tier: 4, damageType: 'demonic',
                     tags: ['demon'], weakTo: ['holy'], resistTo: ['demonic', 'fire', 'ice', 'magic'] },
};

// Zones
export const ZONES = [
  {
    id: 'rust_crypts',
    name: 'Rust Crypts',
    icon: '\uD83C\uDFDA\uFE0F',
    desc: 'Crumbling tombs overrun with rats, skeletons, and ghouls. Short paths, few forks. Weak to holy and fire.',
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
    desc: 'Ruined undercity with void spiders, corrupted demons, and lightning wraiths. Tech golems guard the deep floors. Bring lightning resist.',
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
    desc: 'Poisonous swamps with lurkers, fire-wielding bog witches, and the demonic Void Beast. Ice and holy damage shine here.',
    levelRange: [25, 50],
    nodes: [14, 18],
    forkChance: 0.4,
    enemies: ['marsh_lurker', 'bog_witch'],
    elites: ['void_beast'],
    corruptionRate: 1.5,
    lootLevel: 3,
    energyCost: 15,
  },
  {
    id: 'shattered_spire',
    name: 'Shattered Spire',
    icon: '\uD83C\uDFEF',
    desc: 'Fractured tower with construct sentinels, void cultists, and ice wraiths. The Spire Warden hits like lightning. Fast corruption.',
    levelRange: [45, 75],
    nodes: [16, 22],
    forkChance: 0.45,
    enemies: ['spire_sentinel', 'void_cultist', 'crystal_wraith'],
    elites: ['spire_warden'],
    corruptionRate: 2.0,
    lootLevel: 4,
    energyCost: 25,
  },
  {
    id: 'the_abyss',
    name: 'The Abyss',
    icon: '\uD83C\uDF11',
    desc: 'The source of all corruption. Abyssal crawlers, void knights, elder demons, and the Void Lord. Holy damage is essential. Everything resists everything else.',
    levelRange: [70, 99],
    nodes: [20, 25],
    forkChance: 0.5,
    enemies: ['abyssal_crawler', 'void_knight', 'elder_demon'],
    elites: ['void_lord'],
    corruptionRate: 2.5,
    lootLevel: 5,
    energyCost: 40,
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

// === Factions & Reputation ===
export const FACTIONS = {
  delvers_guild: {
    id: 'delvers_guild', name: "Delver's Guild", icon: '\uD83D\uDCA0',
    desc: 'Explorers and pathfinders. Unlock zone perks and better maps.',
    ranks: [
      { name: 'Outsider', rep: 0, perk: null },
      { name: 'Scout', rep: 100, perk: '+1 revealed node per floor' },
      { name: 'Pathfinder', rep: 300, perk: '-10% corruption rate' },
      { name: 'Cartographer', rep: 600, perk: 'Unlock Shattered Spire early' },
      { name: 'Guildmaster', rep: 1000, perk: '+20% extraction XP bonus' },
    ],
    shopItems: ['health_potion', 'mana_potion', 'antidote'],
  },
  iron_covenant: {
    id: 'iron_covenant', name: 'Iron Covenant', icon: '\u2694\uFE0F',
    desc: 'Warriors and weapon smiths. Better gear, combat bonuses, insurance.',
    ranks: [
      { name: 'Civilian', rep: 0, perk: null },
      { name: 'Initiate', rep: 100, perk: '+5% physical damage' },
      { name: 'Soldier', rep: 300, perk: 'Gear drops +1 rarity tier chance' },
      { name: 'Champion', rep: 600, perk: '-25% insurance cost' },
      { name: 'Warlord', rep: 1000, perk: '+10% all damage' },
    ],
    shopItems: ['health_potion', 'revival_scroll'],
  },
  shadow_market: {
    id: 'shadow_market', name: 'Shadow Market', icon: '\uD83C\uDF11',
    desc: 'Black market dealers. Better prices, secure container, rare finds.',
    ranks: [
      { name: 'Unknown', rep: 0, perk: null },
      { name: 'Contact', rep: 100, perk: '-10% merchant prices' },
      { name: 'Dealer', rep: 300, perk: '+1 secure container unit' },
      { name: 'Broker', rep: 600, perk: 'Rare items in merchant stock' },
      { name: 'Kingpin', rep: 1000, perk: '-25% all shop prices' },
    ],
    shopItems: ['antidote', 'revival_scroll'],
  },
  holy_order: {
    id: 'holy_order', name: 'Holy Order', icon: '\u2728',
    desc: 'Clerics and paladins. Healing bonuses, holy damage, undead bane.',
    ranks: [
      { name: 'Heathen', rep: 0, perk: null },
      { name: 'Acolyte', rep: 100, perk: '+15% healing received' },
      { name: 'Priest', rep: 300, perk: '+10% holy damage' },
      { name: 'Bishop', rep: 600, perk: 'Free revive scroll per raid' },
      { name: 'Archon', rep: 1000, perk: '+20% holy damage, undead take 2x' },
    ],
    shopItems: ['health_potion', 'revival_scroll'],
  },
  void_seekers: {
    id: 'void_seekers', name: 'Void Seekers', icon: '\uD83D\uDE08',
    desc: 'Those who harness corruption. Demonic power, risk-reward mastery.',
    ranks: [
      { name: 'Uninitiated', rep: 0, perk: null },
      { name: 'Touched', rep: 100, perk: '+10% demonic damage' },
      { name: 'Embraced', rep: 300, perk: 'Corruption gives +5% damage' },
      { name: 'Vessel', rep: 600, perk: '+2 loot rolls at high corruption' },
      { name: 'Voidborn', rep: 1000, perk: 'Corruption maxes at 50% penalty instead of wipe' },
    ],
    shopItems: ['mana_potion', 'antidote'],
  },
};

// Bounty templates
export const BOUNTY_TEMPLATES = [
  { type: 'kill', desc: 'Kill {count} {enemy}', countRange: [3, 8], rep: 25, gold: 30 },
  { type: 'extract', desc: 'Extract from {zone}', rep: 20, gold: 25 },
  { type: 'extract_loot', desc: 'Extract with {count} items', countRange: [3, 6], rep: 30, gold: 40 },
  { type: 'clear_floor', desc: 'Reach floor {count} in {zone}', countRange: [6, 10], rep: 35, gold: 50 },
  { type: 'no_death', desc: 'Extract from {zone} with no deaths', rep: 40, gold: 60 },
];

// === Skills System ===

// XP needed for each skill level (RuneScape-style exponential)
export function skillXpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 2.2));
}

// Training action tiers (same for all skills)
export const SKILL_TIERS = [
  { tier: 1, level: 1,  time: 2,  xp: 10 },
  { tier: 2, level: 20, time: 5,  xp: 30 },
  { tier: 3, level: 40, time: 10, xp: 75 },
  { tier: 4, level: 60, time: 15, xp: 150 },
  { tier: 5, level: 80, time: 20, xp: 300 },
];

export const SKILL_MAX_LEVEL = 100;
export const SKILL_AFK_MAX = 60; // max 60 min AFK training

export const SKILLS = {
  // Gathering
  mining:      { id: 'mining',      name: 'Mining',      icon: '\u26CF\uFE0F', type: 'gathering', statBonus: 'STR', desc: 'Mine ore and gems' },
  herbalism:   { id: 'herbalism',   name: 'Herbalism',   icon: '\uD83C\uDF3F', type: 'gathering', statBonus: 'WIS', desc: 'Gather herbs and reagents' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', icon: '\uD83E\uDE93', type: 'gathering', statBonus: 'CON', desc: 'Chop logs and forage fruit' },
  fishing:     { id: 'fishing',     name: 'Fishing',     icon: '\uD83C\uDFA3', type: 'gathering', statBonus: 'WIS', desc: 'Catch fish for cooking' },
  // Crafting
  smithing:    { id: 'smithing',    name: 'Smithing',    icon: '\uD83D\uDD28', type: 'crafting',  statBonus: 'CON', desc: 'Forge weapons and armor' },
  alchemy:     { id: 'alchemy',     name: 'Alchemy',     icon: '\u2697\uFE0F', type: 'crafting',  statBonus: 'INT', desc: 'Brew potions and poisons' },
  enchanting:  { id: 'enchanting',  name: 'Enchanting',  icon: '\u2728',       type: 'crafting',  statBonus: 'INT', desc: 'Add substats to gear' },
  runecrafting:{ id: 'runecrafting', name: 'Runecrafting', icon: '\uD83D\uDD2E', type: 'crafting', statBonus: 'INT', desc: 'Craft runes, arrows, throwables' },
  cooking:     { id: 'cooking',     name: 'Cooking',     icon: '\uD83C\uDF73', type: 'crafting',  statBonus: 'CON', desc: 'Cook food for healing and buffs' },
  // Training
  agility:     { id: 'agility',     name: 'Agility',     icon: '\uD83C\uDFC3', type: 'training',  statBonus: 'DEX', desc: 'Train speed and reflexes' },
  leadership:  { id: 'leadership',  name: 'Leadership',  icon: '\uD83D\uDC51', type: 'training',  statBonus: 'CHA', desc: 'Develop command presence' },
  faith:       { id: 'faith',       name: 'Faith',       icon: '\uD83D\uDE4F', type: 'training',  statBonus: 'WIS', desc: 'Deepen spiritual power' },
};

// Training actions (for training skills — no materials needed)
export const TRAINING_ACTIONS = {
  agility: [
    { id: 'sprints',         name: 'Sprints',          level: 1 },
    { id: 'obstacle_course', name: 'Obstacle Course',  level: 20 },
    { id: 'rooftop_running', name: 'Rooftop Running',  level: 40 },
    { id: 'void_dash',       name: 'Void Dash',        level: 60 },
    { id: 'shadow_step',     name: 'Shadow Step',      level: 80 },
  ],
  leadership: [
    { id: 'campfire_stories', name: 'Campfire Stories', level: 1 },
    { id: 'command_drills',   name: 'Command Drills',  level: 20 },
    { id: 'battle_speeches',  name: 'Battle Speeches', level: 40 },
    { id: 'war_council',      name: 'War Council',     level: 60 },
    { id: 'inspire_masses',   name: 'Inspire Masses',  level: 80 },
  ],
  faith: [
    { id: 'prayer',      name: 'Prayer',      level: 1 },
    { id: 'meditation',  name: 'Meditation',   level: 20 },
    { id: 'pilgrimage',  name: 'Pilgrimage',   level: 40 },
    { id: 'communion',   name: 'Communion',     level: 60 },
    { id: 'ascension',   name: 'Ascension',    level: 80 },
  ],
};

// Materials — gathered from gathering skills
export const MATERIALS = {
  // Mining — ore
  copper_ore: { name: 'Copper Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 1 },
  iron_ore: { name: 'Iron Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 10 },
  steel_ore: { name: 'Steel Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 20 },
  mithril_ore: { name: 'Mithril Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 30 },
  adamant_ore: { name: 'Adamant Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 40 },
  void_ore: { name: 'Void Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 50 },
  obsidian_ore: { name: 'Obsidian Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 60 },
  dragon_ore: { name: 'Dragon Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 70 },
  abyssal_ore: { name: 'Abyssal Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 80 },
  celestial_ore: { name: 'Celestial Ore', icon: '\uD83E\uDEA8', skill: 'mining', level: 90 },
  // Mining — gems (rare)
  chipped_topaz: { name: 'Chipped Topaz', icon: '\uD83D\uDC8E', skill: 'mining', level: 1, rare: true, dropPct: 5 },
  cloudy_jade: { name: 'Cloudy Jade', icon: '\uD83D\uDC8E', skill: 'mining', level: 10, rare: true, dropPct: 4.5 },
  rough_ruby: { name: 'Rough Ruby', icon: '\uD83D\uDC8E', skill: 'mining', level: 20, rare: true, dropPct: 4 },
  flawed_sapphire: { name: 'Flawed Sapphire', icon: '\uD83D\uDC8E', skill: 'mining', level: 30, rare: true, dropPct: 3.5 },
  clear_emerald: { name: 'Clear Emerald', icon: '\uD83D\uDC8E', skill: 'mining', level: 40, rare: true, dropPct: 3 },
  void_shard: { name: 'Void Shard', icon: '\uD83D\uDC8E', skill: 'mining', level: 50, rare: true, dropPct: 2.5 },
  shadow_opal: { name: 'Shadow Opal', icon: '\uD83D\uDC8E', skill: 'mining', level: 60, rare: true, dropPct: 2 },
  dragon_eye: { name: 'Dragon Eye', icon: '\uD83D\uDC8E', skill: 'mining', level: 70, rare: true, dropPct: 1.5 },
  abyssal_pearl: { name: 'Abyssal Pearl', icon: '\uD83D\uDC8E', skill: 'mining', level: 80, rare: true, dropPct: 1 },
  celestial_diamond: { name: 'Celestial Diamond', icon: '\uD83D\uDC8E', skill: 'mining', level: 90, rare: true, dropPct: 1 },
  // Herbalism — herbs
  gravemoss: { name: 'Gravemoss', icon: '\uD83C\uDF3F', skill: 'herbalism', level: 1 },
  rotleaf: { name: 'Rotleaf', icon: '\uD83C\uDF3F', skill: 'herbalism', level: 10 },
  nightshade: { name: 'Nightshade', icon: '\uD83C\uDF3F', skill: 'herbalism', level: 20 },
  blightcap: { name: 'Blightcap', icon: '\uD83C\uDF44', skill: 'herbalism', level: 30 },
  voidbloom: { name: 'Voidbloom', icon: '\uD83C\uDF3A', skill: 'herbalism', level: 40 },
  wraithpetal: { name: 'Wraithpetal', icon: '\uD83C\uDF3A', skill: 'herbalism', level: 50 },
  doomthorn: { name: 'Doomthorn', icon: '\uD83C\uDF35', skill: 'herbalism', level: 60 },
  soulroot: { name: 'Soulroot', icon: '\uD83C\uDF3F', skill: 'herbalism', level: 70 },
  abyssal_fern: { name: 'Abyssal Fern', icon: '\uD83C\uDF3F', skill: 'herbalism', level: 80 },
  celestial_lotus: { name: 'Celestial Lotus', icon: '\uD83C\uDF38', skill: 'herbalism', level: 90 },
  // Herbalism — rare drops
  weak_healing_vial: { name: 'Weak Healing Vial', icon: '\u2764\uFE0F', skill: 'herbalism', level: 1, rare: true, dropPct: 5, consumable: { effect: 'heal', value: 10 } },
  minor_antidote_vial: { name: 'Minor Antidote Vial', icon: '\uD83C\uDF3F', skill: 'herbalism', level: 10, rare: true, dropPct: 4.5, consumable: { effect: 'cure', value: 0 } },
  poison_coating: { name: 'Poison Coating', icon: '\u2620\uFE0F', skill: 'herbalism', level: 20, rare: true, dropPct: 4 },
  small_damage_brew: { name: 'Small Damage Brew', icon: '\u2694\uFE0F', skill: 'herbalism', level: 30, rare: true, dropPct: 3.5, consumable: { effect: 'buff_damage', value: 10 } },
  void_mana_sip: { name: 'Void Mana Sip', icon: '\uD83D\uDCA7', skill: 'herbalism', level: 40, rare: true, dropPct: 3, consumable: { effect: 'mana', value: 8 } },
  bleed_coating: { name: 'Bleed Coating', icon: '\uD83E\uDE78', skill: 'herbalism', level: 50, rare: true, dropPct: 2.5 },
  thorn_oil: { name: 'Thorn Oil', icon: '\uD83C\uDF35', skill: 'herbalism', level: 60, rare: true, dropPct: 2 },
  small_resist_brew: { name: 'Small Resist Brew', icon: '\uD83D\uDEE1\uFE0F', skill: 'herbalism', level: 70, rare: true, dropPct: 1.5, consumable: { effect: 'buff_resist', value: 15 } },
  abyssal_coating: { name: 'Abyssal Coating', icon: '\uD83D\uDE08', skill: 'herbalism', level: 80, rare: true, dropPct: 1 },
  celestial_tear: { name: 'Celestial Tear', icon: '\u2728', skill: 'herbalism', level: 90, rare: true, dropPct: 1 },
  // Woodcutting — logs
  deadwood_log: { name: 'Deadwood Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 1, fuelUses: 1 },
  rotwood_log: { name: 'Rotwood Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 10, fuelUses: 2 },
  darkoak_log: { name: 'Darkoak Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 20, fuelUses: 3 },
  blightwood_log: { name: 'Blightwood Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 30, fuelUses: 4 },
  ironbark_log: { name: 'Ironbark Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 40, fuelUses: 5 },
  voidwood_log: { name: 'Voidwood Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 50, fuelUses: 6 },
  ashwood_log: { name: 'Ashwood Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 60, fuelUses: 7 },
  soulwood_log: { name: 'Soulwood Log', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 70, fuelUses: 8 },
  abyssal_timber: { name: 'Abyssal Timber', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 80, fuelUses: 9 },
  celestial_branch: { name: 'Celestial Branch', icon: '\uD83E\uDEB5', skill: 'woodcutting', level: 90, fuelUses: 10 },
  // Woodcutting — rare food drops (edible raw)
  shriveled_berries: { name: 'Shriveled Berries', icon: '\uD83C\uDF47', skill: 'woodcutting', level: 1, rare: true, dropPct: 5, consumable: { effect: 'heal', value: 5 } },
  bark_nuts: { name: 'Bark Nuts', icon: '\uD83C\uDF30', skill: 'woodcutting', level: 10, rare: true, dropPct: 4.5, consumable: { effect: 'heal', value: 8 } },
  wild_mushroom: { name: 'Wild Mushroom', icon: '\uD83C\uDF44', skill: 'woodcutting', level: 20, rare: true, dropPct: 4, consumable: { effect: 'mana', value: 5 } },
  blightsap_fruit: { name: 'Blightsap Fruit', icon: '\uD83C\uDF52', skill: 'woodcutting', level: 30, rare: true, dropPct: 3.5, consumable: { effect: 'buff_damage', value: 5 } },
  ironbark_acorn: { name: 'Ironbark Acorn', icon: '\uD83C\uDF30', skill: 'woodcutting', level: 40, rare: true, dropPct: 3, consumable: { effect: 'buff_armor', value: 5 } },
  void_fig: { name: 'Void Fig', icon: '\uD83C\uDF52', skill: 'woodcutting', level: 50, rare: true, dropPct: 2.5, consumable: { effect: 'heal', value: 12 } },
  smoked_plum: { name: 'Smoked Plum', icon: '\uD83C\uDF51', skill: 'woodcutting', level: 60, rare: true, dropPct: 2, consumable: { effect: 'mana', value: 8 } },
  soulberry: { name: 'Soulberry', icon: '\uD83C\uDF53', skill: 'woodcutting', level: 70, rare: true, dropPct: 1.5, consumable: { effect: 'buff_resist', value: 8 } },
  abyssal_truffle: { name: 'Abyssal Truffle', icon: '\uD83C\uDF44', skill: 'woodcutting', level: 80, rare: true, dropPct: 1, consumable: { effect: 'heal', value: 18 } },
  starfruit: { name: 'Starfruit', icon: '\u2B50', skill: 'woodcutting', level: 90, rare: true, dropPct: 1, consumable: { effect: 'heal_both', value: 10 } },
  // Fishing — fish (must be cooked)
  bone_minnow: { name: 'Bone Minnow', icon: '\uD83D\uDC1F', skill: 'fishing', level: 1 },
  sewer_eel: { name: 'Sewer Eel', icon: '\uD83D\uDC1F', skill: 'fishing', level: 10 },
  pale_carp: { name: 'Pale Carp', icon: '\uD83D\uDC1F', skill: 'fishing', level: 20 },
  blightfin: { name: 'Blightfin', icon: '\uD83D\uDC20', skill: 'fishing', level: 30 },
  ironjaw_trout: { name: 'Ironjaw Trout', icon: '\uD83D\uDC20', skill: 'fishing', level: 40 },
  void_angler: { name: 'Void Angler', icon: '\uD83D\uDC21', skill: 'fishing', level: 50 },
  ashen_pike: { name: 'Ashen Pike', icon: '\uD83D\uDC21', skill: 'fishing', level: 60 },
  soulfish: { name: 'Soulfish', icon: '\uD83D\uDC20', skill: 'fishing', level: 70 },
  abyssal_leviathan: { name: 'Abyssal Leviathan', icon: '\uD83D\uDC33', skill: 'fishing', level: 80 },
  celestial_koi: { name: 'Celestial Koi', icon: '\uD83D\uDC20', skill: 'fishing', level: 90 },
  // Fishing — rare drops
  cracked_shell: { name: 'Cracked Shell', icon: '\uD83D\uDC1A', skill: 'fishing', level: 1, rare: true, dropPct: 5 },
  murky_pearl: { name: 'Murky Pearl', icon: '\uD83D\uDC8E', skill: 'fishing', level: 10, rare: true, dropPct: 4.5 },
  rotted_kelp: { name: 'Rotted Kelp', icon: '\uD83C\uDF3F', skill: 'fishing', level: 20, rare: true, dropPct: 4 },
  blight_roe: { name: 'Blight Roe', icon: '\uD83E\uDDE3', skill: 'fishing', level: 30, rare: true, dropPct: 3.5 },
  jagged_scale: { name: 'Jagged Scale', icon: '\uD83D\uDEE1\uFE0F', skill: 'fishing', level: 40, rare: true, dropPct: 3 },
  void_ink: { name: 'Void Ink', icon: '\uD83C\uDF11', skill: 'fishing', level: 50, rare: true, dropPct: 2.5 },
  ember_coral: { name: 'Ember Coral', icon: '\uD83D\uDD25', skill: 'fishing', level: 60, rare: true, dropPct: 2 },
  ghostfin: { name: 'Ghostfin', icon: '\uD83D\uDC7B', skill: 'fishing', level: 70, rare: true, dropPct: 1.5 },
  deep_sea_fang: { name: 'Deep Sea Fang', icon: '\uD83E\uDDB7', skill: 'fishing', level: 80, rare: true, dropPct: 1 },
  golden_scale: { name: 'Golden Scale', icon: '\u2B50', skill: 'fishing', level: 90, rare: true, dropPct: 1 },
  // Crafting reagents (from rare drops, used in enchanting/runecrafting)
  smoldering_ember: { name: 'Smoldering Ember', icon: '\uD83D\uDD25', skill: 'woodcutting', level: 60, rare: true, dropPct: 2 },
  soul_essence: { name: 'Soul Essence', icon: '\uD83D\uDC7B', skill: 'herbalism', level: 70, rare: true, dropPct: 1.5 },
  void_amber: { name: 'Void Amber', icon: '\uD83D\uDD2E', skill: 'woodcutting', level: 50, rare: true, dropPct: 2.5 },
  hollow_reed: { name: 'Hollow Reed', icon: '\uD83C\uDF3E', skill: 'woodcutting', level: 30, rare: true, dropPct: 3.5 },
  living_heartwood: { name: 'Living Heartwood', icon: '\uD83C\uDF33', skill: 'woodcutting', level: 90, rare: true, dropPct: 1 },
};

// Get materials for a gathering skill at a given level (returns primary + possible rare)
export function getGatherableAt(skillId, level) {
  const mats = Object.entries(MATERIALS)
    .filter(([, m]) => m.skill === skillId && m.level <= level && !m.rare)
    .sort((a, b) => b[1].level - a[1].level);
  return mats.length > 0 ? mats[0] : null; // highest tier you can gather
}

export function getRareDropsAt(skillId, level) {
  return Object.entries(MATERIALS)
    .filter(([, m]) => m.skill === skillId && m.level <= level && m.rare)
    .sort((a, b) => b[1].level - a[1].level);
}
