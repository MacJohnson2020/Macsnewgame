// === Voidborn — Encounter Resolution ===

import { ZONES, CORRUPTION_LEVELS, ENEMIES } from '../config.js';
import { createEnemy, generateGear, generateConsumable, generateGold } from './entities.js';
import { pick, randInt, rollChance, rand } from '../utils.js';

// Generate encounter data for a node when stepped on
export function generateEncounter(node, zone, partyLevel, corruption) {
  switch (node.type) {
    case 'enemy':
      return generateEnemyEncounter(zone, partyLevel, corruption, node.branch === 'risky', node.difficulty);
    case 'chest':
      return generateChestEncounter(zone, partyLevel, node.branch === 'risky');
    case 'trap':
      return generateTrapEncounter(zone, partyLevel);
    case 'shrine':
      return generateShrineEncounter();
    case 'merchant':
      return generateMerchantEncounter(zone, partyLevel);
    case 'event':
      return generateEventEncounter(zone, partyLevel);
    case 'extraction':
      return { type: 'extraction', title: 'Extraction Point', desc: 'Extract safely with your loot?', icon: '\u2705' };
    case 'start':
      return { type: 'start', title: 'Entry Point', desc: 'Your party enters the zone...', icon: '\uD83D\uDEAA' };
    case 'empty':
      return { type: 'empty', title: 'Empty Passage', desc: 'Nothing of note here. The void whispers...', icon: '\u00B7' };
    default:
      return { type: 'empty', title: 'Unknown', desc: 'An empty space.', icon: '?' };
  }
}

function generateEnemyEncounter(zone, partyLevel, corruption, isRisky, difficulty = 1) {
  // Scale enemy count by difficulty: easy=1, medium=1-2, hard=2, elite=2-3
  let enemyCount;
  if (difficulty <= 1) {
    enemyCount = 1;
  } else if (difficulty === 2) {
    enemyCount = isRisky ? 2 : randInt(1, 2);
  } else if (difficulty === 3) {
    enemyCount = isRisky ? randInt(2, 3) : 2;
  } else {
    enemyCount = isRisky ? 3 : randInt(2, 3);
  }

  // Add extra enemies from corruption
  const corruptionLevel = CORRUPTION_LEVELS.filter(c => corruption >= c.threshold).pop();
  const extraSpawns = corruptionLevel ? corruptionLevel.extraSpawns : 0;
  const totalEnemies = Math.min(enemyCount + Math.floor(extraSpawns / 2), 4);

  // Filter enemies by tier based on difficulty
  const maxTier = difficulty <= 1 ? 1 : difficulty <= 2 ? 2 : 3;
  const eligibleEnemies = zone.enemies.filter(id => {
    const template = ENEMIES[id];
    return template && (template.tier || 1) <= maxTier;
  });
  const enemyPool = eligibleEnemies.length > 0 ? eligibleEnemies : zone.enemies;

  const enemies = [];
  for (let i = 0; i < totalEnemies; i++) {
    // Elite only on difficulty 4+ or risky branches deep in
    const useElite = (difficulty >= 4 || (isRisky && difficulty >= 3 && rollChance(20))) && zone.elites.length > 0;
    const typeId = useElite ? pick(zone.elites) : pick(enemyPool);
    enemies.push(createEnemy(typeId, partyLevel));
  }

  return {
    type: 'combat',
    title: enemies.length === 1 ? enemies[0].name : `${enemies.length} Enemies`,
    desc: enemies.length === 1
      ? `A ${enemies[0].name} blocks the path!`
      : `${enemies.length} enemies lurk ahead!`,
    icon: enemies.some(e => e.elite) ? '\uD83D\uDC79' : '\uD83D\uDC80',
    enemies,
  };
}

function generateChestEncounter(zone, partyLevel, isRisky) {
  const items = [];
  const itemCount = isRisky ? randInt(2, 3) : randInt(1, 2);

  for (let i = 0; i < itemCount; i++) {
    if (rollChance(60)) {
      items.push(generateGear(zone.lootLevel + partyLevel * 0.5));
    } else {
      items.push(generateConsumable());
    }
  }

  const gold = generateGold(zone.lootLevel);

  return {
    type: 'chest',
    title: isRisky ? 'Rare Chest' : 'Chest',
    desc: isRisky ? 'A gleaming chest — corrupted but overflowing with loot.' : 'A supply crate left behind.',
    icon: isRisky ? '\uD83D\uDCE6' : '\uD83D\uDCE6',
    items,
    gold,
  };
}

function generateTrapEncounter(zone, partyLevel) {
  const trapTypes = [
    { name: 'Spike Trap', desc: 'Hidden spikes spring from the ground!', damage: randInt(5, 10 + partyLevel), type: 'physical' },
    { name: 'Poison Gas', desc: 'A cloud of toxic gas fills the area!', damage: randInt(3, 8), type: 'poison', dot: { name: 'Poison', damage: 3, turns: 3 } },
    { name: 'Void Blast', desc: 'Void energy erupts from a corrupted crystal!', damage: randInt(8, 15 + partyLevel), type: 'magic' },
  ];

  const trap = pick(trapTypes);
  return {
    type: 'trap',
    title: trap.name,
    desc: trap.desc,
    icon: '\u26A0\uFE0F',
    damage: trap.damage,
    damageType: trap.type,
    dot: trap.dot || null,
    // WIS check can reduce/avoid damage
    wisCheck: 12 + Math.floor(partyLevel / 3),
  };
}

function generateShrineEncounter() {
  const shrines = [
    { name: 'Shrine of Healing', desc: 'A warm light radiates from an ancient altar.', effect: 'heal', value: 50, icon: '\u2728' },
    { name: 'Shrine of Power', desc: 'Dark energy coalesces into pure strength.', effect: 'buff_str', value: 3, turns: 10, icon: '\u2728' },
    { name: 'Shrine of Clarity', desc: 'Your mind clears, mana surges through you.', effect: 'restore_mp', value: 30, icon: '\u2728' },
    { name: 'Shrine of Fortune', desc: 'The gods smile upon you. Gold appears.', effect: 'gold', value: randInt(20, 50), icon: '\u2728' },
  ];

  const shrine = pick(shrines);
  return {
    type: 'shrine',
    title: shrine.name,
    desc: shrine.desc,
    icon: shrine.icon,
    effect: shrine.effect,
    value: shrine.value,
    turns: shrine.turns || 0,
  };
}

function generateMerchantEncounter(zone, partyLevel) {
  const items = [];
  for (let i = 0; i < 3; i++) {
    const item = rollChance(50)
      ? generateGear(zone.lootLevel + partyLevel * 0.5)
      : generateConsumable();
    item.price = getItemPrice(item);
    items.push(item);
  }

  return {
    type: 'merchant',
    title: 'Wandering Merchant',
    desc: 'A hooded figure offers their wares...',
    icon: '\uD83D\uDED2',
    items,
  };
}

function generateEventEncounter(zone, partyLevel) {
  const events = [
    {
      title: 'Wounded Traveler',
      desc: 'A wounded adventurer begs for help. Share a healing potion?',
      icon: '\uD83E\uDD15',
      choices: [
        { label: 'Help them', desc: 'Give a potion, gain a small reward', effect: 'help_traveler' },
        { label: 'Leave them', desc: 'Conserve resources', effect: 'ignore' },
      ],
    },
    {
      title: 'Mysterious Chest',
      desc: 'A chest pulses with void energy. Open it?',
      icon: '\uD83D\uDD2E',
      choices: [
        { label: 'Open it', desc: '50% good loot, 50% trap', effect: 'risky_chest' },
        { label: 'Leave it', desc: 'Play it safe', effect: 'ignore' },
      ],
    },
    {
      title: 'Collapsed Passage',
      desc: 'The way ahead is blocked by rubble. A narrow gap leads to an unexplored area.',
      icon: '\uD83E\uDEA8',
      choices: [
        { label: 'Squeeze through', desc: 'Might find something... or nothing', effect: 'explore_passage' },
        { label: 'Turn back', desc: 'Stay on the main path', effect: 'ignore' },
      ],
    },
  ];

  return {
    type: 'event',
    ...pick(events),
  };
}

// Resolve event choice
export function resolveEventChoice(encounter, choiceIdx, party, zone) {
  const choice = encounter.choices[choiceIdx];
  const results = { text: '', items: [], gold: 0, damage: 0 };

  switch (choice.effect) {
    case 'help_traveler':
      results.gold = randInt(15, 30);
      results.text = `The traveler thanks you and shares ${results.gold} gold.`;
      if (rollChance(30)) {
        const item = generateGear(zone.lootLevel);
        results.items.push(item);
        results.text += ` They also hand you a ${item.name}!`;
      }
      break;

    case 'risky_chest':
      if (rollChance(50)) {
        const item = generateGear(zone.lootLevel + 1, rollChance(30) ? 'rare' : null);
        results.items.push(item);
        results.gold = randInt(20, 50);
        results.text = `Jackpot! Found a ${item.name} and ${results.gold} gold!`;
      } else {
        results.damage = randInt(10, 20);
        results.text = `It was a trap! Void energy blasts the party for ${results.damage} damage!`;
      }
      break;

    case 'explore_passage':
      if (rollChance(60)) {
        const item = generateConsumable();
        results.items.push(item);
        results.text = `Found a hidden ${item.name} in the rubble!`;
      } else {
        results.text = 'Nothing but dust and bones.';
      }
      break;

    case 'ignore':
      results.text = 'You move on.';
      break;
  }

  return results;
}

// Get item sell price
function getItemPrice(item) {
  const basePrice = { common: 10, uncommon: 25, rare: 60, epic: 150, legendary: 400 };
  return Math.round((basePrice[item.rarity] || 10) * (item.size || 1) * (0.8 + rand() * 0.4));
}

// Apply trap effects to party
export function applyTrap(trap, party) {
  const results = [];
  for (const hero of party) {
    if (!hero.alive) continue;

    // WIS check: higher WIS heroes can avoid/reduce trap damage
    const wisBonus = Math.floor((hero.stats.WIS - 10) / 2);
    const avoided = wisBonus > 0 && rollChance(wisBonus * 10);

    if (avoided) {
      results.push({ hero, text: `${hero.name} spots the trap and avoids it!`, avoided: true });
    } else {
      let dmg = trap.damage;
      // Reduce by armor if physical
      if (trap.damageType === 'physical') {
        const armor = hero.gear.armor ? hero.gear.armor.armor : 0;
        dmg = Math.max(1, dmg - Math.floor(armor / 3));
      }
      hero.hp -= dmg;
      results.push({ hero, text: `${hero.name} takes ${dmg} damage!`, damage: dmg });

      // Apply DoT if applicable
      if (trap.dot) {
        hero.dots = hero.dots || [];
        hero.dots.push({ ...trap.dot });
        results.push({ hero, text: `${hero.name} is ${trap.dot.name.toLowerCase()}ed!` });
      }

      if (hero.hp <= 0) {
        hero.hp = 0;
        hero.alive = false;
        results.push({ hero, text: `${hero.name} has been killed by the trap!`, death: true });
      }
    }
  }
  return results;
}

// Apply shrine effect to party
export function applyShrine(shrine, party) {
  const results = [];
  switch (shrine.effect) {
    case 'heal':
      for (const hero of party) {
        if (!hero.alive) continue;
        const healed = Math.min(shrine.value, hero.maxHp - hero.hp);
        hero.hp += healed;
        results.push(`${hero.name} healed for ${healed} HP`);
      }
      break;
    case 'restore_mp':
      for (const hero of party) {
        if (!hero.alive) continue;
        const restored = Math.min(shrine.value, hero.maxMp - hero.mp);
        hero.mp += restored;
        results.push(`${hero.name} restored ${restored} MP`);
      }
      break;
    case 'buff_str':
      for (const hero of party) {
        if (!hero.alive) continue;
        hero.buffs = hero.buffs || [];
        hero.buffs.push({ stat: 'STR', value: shrine.value, turns: shrine.turns });
        results.push(`${hero.name} gains +${shrine.value} STR for ${shrine.turns} turns`);
      }
      break;
    case 'gold':
      results.push(`Found ${shrine.value} gold!`);
      break;
  }
  return results;
}
