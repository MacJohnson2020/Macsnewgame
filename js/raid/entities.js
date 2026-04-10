// === Voidborn — Entity (Hero/Enemy) stat calculations ===

import { CLASSES, ENEMIES, WEAPON_TYPES, OFFHAND_TYPES, BODY_TYPES, SLOT_TYPES, RARITIES, GEAR_SLOTS, DAMAGE_TYPES } from '../config.js';
import { statMod, randInt, pick, weightedPick, uid } from '../utils.js';

// Get hero's total accuracy
export function getAccuracy(hero) {
  let acc = 5; // base accuracy
  const weapon = hero.gear.weapon;
  if (weapon) {
    acc += weapon.accuracy || 0;
    // STR-based or DEX-based depending on weapon damage type
    if (weapon.damageType === 'physical') {
      // Check if finesse (dagger, bow)
      const type = WEAPON_TYPES[weapon.weaponType];
      if (type && type.statReq.DEX) {
        acc += statMod(hero.stats.DEX) * 2;
      } else {
        acc += statMod(hero.stats.STR) * 2;
      }
    } else {
      acc += statMod(hero.stats.INT) * 2;
    }
  } else {
    acc += statMod(hero.stats.STR); // unarmed uses STR
  }
  // Substat bonuses
  acc += getSubstatTotal(hero, 'accuracy');
  // Buff/debuff
  acc += getBuffValue(hero, 'accuracy');
  return Math.max(1, acc);
}

// Get hero's armor (physical defense) — sum from all gear slots
export function getArmor(hero) {
  let armor = 0;
  for (const slot of GEAR_SLOTS) {
    if (hero.gear[slot] && hero.gear[slot].armor) armor += hero.gear[slot].armor;
  }
  return armor;
}

// Get hero's magic resist — sum from all gear slots + WIS
export function getMagicResist(hero) {
  let mr = statMod(hero.stats.WIS) * 2;
  for (const slot of GEAR_SLOTS) {
    if (hero.gear[slot] && hero.gear[slot].magicResist) mr += hero.gear[slot].magicResist;
  }
  return Math.max(0, mr);
}

// Get defense for a specific damage type / element
export function getDefense(entity, damageType) {
  if (!damageType || damageType === 'physical') return entity.armor || getArmor(entity);
  if (damageType === 'magic') return entity.magicResist || getMagicResist(entity);

  // Elemental — check the DAMAGE_TYPES config for which resist to use
  const dtConfig = DAMAGE_TYPES[damageType];
  if (!dtConfig) return 0;
  const resistKey = dtConfig.resist;

  // For heroes: sum gear substats + any direct stat
  if (entity.gear) {
    return getSubstatTotal(entity, resistKey) + (entity[resistKey] || 0);
  }
  // For enemies: direct stat
  return entity[resistKey] || 0;
}

// Get hero's weapon damage range
export function getWeaponDamage(hero) {
  const weapon = hero.gear.weapon;
  if (!weapon) return [1, 3]; // unarmed
  return [weapon.dmgMin, weapon.dmgMax];
}

// Get stat bonus to damage
export function getDamageStat(hero) {
  const weapon = hero.gear.weapon;
  if (!weapon) return statMod(hero.stats.STR);
  if (weapon.damageType === 'magic') return statMod(hero.stats.INT);
  const type = WEAPON_TYPES[weapon.weaponType];
  if (type && type.statReq.DEX) return statMod(hero.stats.DEX);
  return statMod(hero.stats.STR);
}

// Get armor/magic penetration
export function getPenetration(hero) {
  return {
    armorPen: getSubstatTotal(hero, 'armorPen'),
    magicPen: getSubstatTotal(hero, 'magicPen'),
  };
}

// Get crit chance %
export function getCritChance(hero) {
  let crit = 3; // base 3%
  crit += statMod(hero.stats.DEX); // DEX adds crit
  crit += getSubstatTotal(hero, 'critChance');
  return Math.min(crit, 75); // cap at 75%
}

// Get initiative value (for turn order)
export function getInitiative(hero) {
  return hero.stats.DEX + (hero.gear.weapon ? 0 : -2);
}

// Get total substat value across all gear
function getSubstatTotal(hero, substatId) {
  let total = 0;
  for (const slot of GEAR_SLOTS) {
    const item = hero.gear[slot];
    if (item && item.substats) {
      for (const sub of item.substats) {
        if (sub.id === substatId) total += sub.value;
      }
    }
  }
  return total;
}

// Get buff/debuff value for a stat
function getBuffValue(entity, stat) {
  let val = 0;
  if (entity.buffs) {
    for (const b of entity.buffs) {
      if (b.stat === stat) val += b.value;
    }
  }
  if (entity.debuffs) {
    for (const d of entity.debuffs) {
      if (d.stat === stat) val += d.value; // debuffs have negative values
    }
  }
  return val;
}

// Create an enemy instance from template
export function createEnemy(typeId, zoneLevel = 1) {
  const template = ENEMIES[typeId];
  if (!template) return null;
  const levelScale = 1 + (zoneLevel - 1) * 0.08;
  return {
    id: uid(),
    typeId,
    name: template.name,
    icon: template.icon,
    hp: Math.round(template.hp * levelScale),
    maxHp: Math.round(template.hp * levelScale),
    armor: Math.round(template.armor * levelScale),
    magicResist: Math.round(template.mr * levelScale),
    accuracy: Math.round(template.acc * levelScale),
    dmgMin: Math.round(template.dmg[0] * levelScale),
    dmgMax: Math.round(template.dmg[1] * levelScale),
    speed: template.speed,
    xp: Math.round(template.xp * levelScale),
    elite: template.elite || false,
    magic: template.magic || false,
    damageType: template.damageType || (template.magic ? 'magic' : 'physical'),
    alive: true,
    buffs: [],
    debuffs: [],
    dots: [],
  };
}

// Generate a random piece of gear for any of the 11 slots
export function generateGear(level, forcedRarity = null) {
  const rarityEntries = Object.entries(RARITIES).map(([id, r]) => ({ id, ...r }));
  const rarity = forcedRarity
    ? { id: forcedRarity, ...RARITIES[forcedRarity] }
    : weightedPick(rarityEntries);

  const scale = 1 + (level - 1) * 0.1;

  // Pick a random slot category
  const slotPool = pick(['weapon', 'offhand', 'body', 'head', 'legs', 'hands', 'feet', 'cape', 'neck', 'ring', 'ammo']);
  let item;

  if (slotPool === 'weapon') {
    const typeId = pick(Object.keys(WEAPON_TYPES));
    const type = WEAPON_TYPES[typeId];
    item = {
      id: uid(), name: `${rarity.name} ${type.name}`, icon: type.icon,
      slot: 'weapon', weaponType: typeId, size: type.size, rarity: rarity.id,
      damageType: type.damageType, twoHanded: type.twoHanded || false,
      usesAmmo: type.usesAmmo || false,
      dmgMin: Math.round(type.baseDmg[0] * scale * rarity.statMult),
      dmgMax: Math.round(type.baseDmg[1] * scale * rarity.statMult),
      accuracy: Math.round(type.baseAcc * scale * rarity.statMult * 0.8),
      statReq: { ...type.statReq }, substats: [],
    };
  } else if (slotPool === 'offhand') {
    const typeId = pick(Object.keys(OFFHAND_TYPES));
    const type = OFFHAND_TYPES[typeId];
    item = {
      id: uid(), name: `${rarity.name} ${type.name}`, icon: type.icon,
      slot: 'offhand', size: type.size, rarity: rarity.id,
      statReq: { ...type.statReq }, substats: [],
    };
    if (type.baseArmor) {
      item.armor = Math.round(randInt(type.baseArmor[0], type.baseArmor[1]) * scale * rarity.statMult);
      item.magicResist = Math.round(randInt(type.baseMR[0], type.baseMR[1]) * scale * rarity.statMult);
    }
    if (type.baseDmg) {
      item.dmgMin = Math.round(type.baseDmg[0] * scale * rarity.statMult);
      item.dmgMax = Math.round(type.baseDmg[1] * scale * rarity.statMult);
      item.accuracy = Math.round(type.baseAcc * scale * rarity.statMult * 0.8);
      item.damageType = 'physical';
    }
  } else if (slotPool === 'body') {
    const typeId = pick(Object.keys(BODY_TYPES));
    const type = BODY_TYPES[typeId];
    item = {
      id: uid(), name: `${rarity.name} ${type.name}`, icon: type.icon,
      slot: 'body', size: type.size, rarity: rarity.id,
      armor: Math.round(randInt(type.baseArmor[0], type.baseArmor[1]) * scale * rarity.statMult),
      magicResist: Math.round(randInt(type.baseMR[0], type.baseMR[1]) * scale * rarity.statMult),
      statReq: { ...(type.statReq || {}) }, substats: [],
    };
  } else {
    // Head, legs, hands, feet, cape, neck, ring, ammo
    const candidates = Object.entries(SLOT_TYPES).filter(([, t]) => t.slot === slotPool);
    if (candidates.length === 0) {
      // Fallback to a ring
      item = { id: uid(), name: `${rarity.name} Ring`, icon: '\uD83D\uDC8D', slot: 'ring', size: 1, rarity: rarity.id, substats: [] };
    } else {
      const [typeId, type] = pick(candidates);
      item = {
        id: uid(), name: `${rarity.name} ${type.name}`, icon: type.icon,
        slot: type.slot, size: type.size, rarity: rarity.id,
        statReq: { ...(type.statReq || {}) }, substats: [],
      };
      if (type.baseArmor) item.armor = Math.round(randInt(type.baseArmor[0], type.baseArmor[1]) * scale * rarity.statMult);
      if (type.baseMR) item.magicResist = Math.round(randInt(type.baseMR[0], type.baseMR[1]) * scale * rarity.statMult);
      if (type.stackable) item.stackable = true;
    }
  }

  // Add substats based on rarity
  const SUBSTATS = [
    { id: 'accuracy', name: 'Accuracy', range: [3, 10] },
    { id: 'armorPen', name: 'Armor Pen', range: [3, 12], suffix: '%' },
    { id: 'magicPen', name: 'Magic Pen', range: [3, 12], suffix: '%' },
    { id: 'critChance', name: 'Crit Chance', range: [2, 8], suffix: '%' },
    { id: 'maxHp', name: 'Max HP', range: [5, 25] },
    { id: 'maxMp', name: 'Max MP', range: [3, 15] },
    // Elemental resists (rarer — only appear on uncommon+ gear)
    { id: 'fireResist', name: 'Fire Resist', range: [3, 12], minRarity: 1 },
    { id: 'iceResist', name: 'Ice Resist', range: [3, 12], minRarity: 1 },
    { id: 'lightningResist', name: 'Lightning Resist', range: [3, 12], minRarity: 1 },
    { id: 'demonicResist', name: 'Demonic Resist', range: [3, 12], minRarity: 1 },
    { id: 'holyResist', name: 'Holy Resist', range: [3, 12], minRarity: 1 },
  ];
  const rarityTier = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const itemTier = rarityTier[rarity.id] || 0;
  const usedIds = new Set();
  for (let i = 0; i < rarity.substatCount; i++) {
    const available = SUBSTATS.filter(s => !usedIds.has(s.id) && (!s.minRarity || itemTier >= s.minRarity));
    if (available.length === 0) break;
    const sub = pick(available);
    usedIds.add(sub.id);
    item.substats.push({ id: sub.id, name: sub.name, value: randInt(sub.range[0], sub.range[1]), suffix: sub.suffix || '' });
  }

  return item;
}

// Generate a consumable drop
export function generateConsumable() {
  const types = ['health_potion', 'mana_potion', 'antidote'];
  const typeId = pick(types);
  const { CONSUMABLES } = await_consumables();
  const template = CONSUMABLES[typeId];
  return {
    id: uid(),
    consumableId: typeId,
    name: template.name,
    icon: template.icon,
    size: template.size,
    rarity: 'common',
    isConsumable: true,
    effect: template.effect,
    value: template.value,
    desc: template.desc,
  };
}

function await_consumables() {
  return {
    CONSUMABLES: {
      health_potion:  { name: 'Health Potion',  icon: '\u2764\uFE0F', size: 1, effect: 'heal',   value: 30, desc: 'Restore 30 HP' },
      mana_potion:    { name: 'Mana Potion',    icon: '\uD83D\uDCA7', size: 1, effect: 'mana',   value: 15, desc: 'Restore 15 MP' },
      antidote:       { name: 'Antidote',        icon: '\uD83C\uDF3F', size: 1, effect: 'cure',   value: 0,  desc: 'Remove poison and DoT effects' },
    }
  };
}

// Generate gold drop
export function generateGold(zoneLevel) {
  return randInt(3 + zoneLevel * 2, 8 + zoneLevel * 5);
}
