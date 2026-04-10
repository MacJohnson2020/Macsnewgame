// === Voidborn — Combat System (Chance-to-Hit, Party Turn-Based) ===

import { getAccuracy, getArmor, getMagicResist, getDefense, getWeaponDamage, getDamageStat, getPenetration, getCritChance, getInitiative } from './entities.js';
import { CLASSES, DAMAGE_TYPES } from '../config.js';
import { calcHitChance, calcDamage, rollChance, randInt, clamp, statMod } from '../utils.js';

// Combat state
export function createCombatState(party, enemies) {
  // Build turn order based on initiative (DEX)
  const combatants = [];

  for (const hero of party) {
    if (!hero.alive) continue;
    combatants.push({
      id: hero.id,
      type: 'hero',
      entity: hero,
      initiative: getInitiative(hero) + randInt(1, 6), // add some randomness
    });
  }

  for (const enemy of enemies) {
    combatants.push({
      id: enemy.id,
      type: 'enemy',
      entity: enemy,
      initiative: enemy.speed + randInt(1, 6),
    });
  }

  // Sort by initiative (highest first)
  combatants.sort((a, b) => b.initiative - a.initiative);

  return {
    party,
    enemies,
    combatants,
    turnIndex: 0,
    round: 1,
    log: [],
    state: 'active', // 'active', 'victory', 'defeat', 'fled'
    pendingAction: null, // waiting for player input
    xpEarned: 0,
    loot: [],
  };
}

// Get current combatant
export function getCurrentCombatant(combat) {
  return combat.combatants[combat.turnIndex];
}

// Advance to next living combatant
export function nextTurn(combat) {
  // Process DoTs and buffs for current combatant
  const current = getCurrentCombatant(combat);
  if (current) processTurnEffects(combat, current.entity);

  // Find next alive combatant
  let attempts = combat.combatants.length;
  do {
    combat.turnIndex = (combat.turnIndex + 1) % combat.combatants.length;
    if (combat.turnIndex === 0) combat.round++;
    attempts--;
  } while (!combat.combatants[combat.turnIndex].entity.alive && attempts > 0);

  // Check victory/defeat
  checkCombatEnd(combat);

  return getCurrentCombatant(combat);
}

// Process DoTs and expire buffs
function processTurnEffects(combat, entity) {
  // DoTs
  if (entity.dots) {
    for (let i = entity.dots.length - 1; i >= 0; i--) {
      const dot = entity.dots[i];
      entity.hp -= dot.damage;
      combat.log.push({ type: 'damage', text: `${entity.name} takes ${dot.damage} ${dot.name} damage`, class: 'damage' });
      dot.turns--;
      if (dot.turns <= 0) entity.dots.splice(i, 1);
      if (entity.hp <= 0) {
        entity.hp = 0;
        entity.alive = false;
        combat.log.push({ type: 'death', text: `${entity.name} has been slain!`, class: 'death' });
      }
    }
  }

  // Expire buffs
  if (entity.buffs) {
    for (let i = entity.buffs.length - 1; i >= 0; i--) {
      entity.buffs[i].turns--;
      if (entity.buffs[i].turns <= 0) entity.buffs.splice(i, 1);
    }
  }

  // Expire debuffs
  if (entity.debuffs) {
    for (let i = entity.debuffs.length - 1; i >= 0; i--) {
      entity.debuffs[i].turns--;
      if (entity.debuffs[i].turns <= 0) entity.debuffs.splice(i, 1);
    }
  }

  // Reduce ability cooldowns
  if (entity.abilityCooldowns) {
    for (const key of Object.keys(entity.abilityCooldowns)) {
      if (entity.abilityCooldowns[key] > 0) entity.abilityCooldowns[key]--;
    }
  }
}

// Check if combat is over
function checkCombatEnd(combat) {
  const heroesAlive = combat.party.some(h => h.alive);
  const enemiesAlive = combat.enemies.some(e => e.alive);

  if (!enemiesAlive) {
    combat.state = 'victory';
    combat.xpEarned = combat.enemies.reduce((s, e) => s + e.xp, 0);
  } else if (!heroesAlive) {
    combat.state = 'defeat';
  }
}

// === Player Actions ===

// Basic weapon attack
export function attackAction(combat, attacker, target) {
  const isHero = combat.party.includes(attacker);
  const isMagicWeapon = attacker.gear?.weapon?.damageType === 'magic';

  let accuracy, defense, pen;

  if (isHero) {
    accuracy = getAccuracy(attacker);
    const penStats = getPenetration(attacker);
    if (isMagicWeapon) {
      defense = target.magicResist || getMagicResist(target);
      pen = penStats.magicPen;
    } else {
      defense = target.armor || getArmor(target);
      pen = penStats.armorPen;
    }
  } else {
    // Enemy attacking hero — use element-aware defense
    accuracy = attacker.accuracy;
    defense = getDefense(target, attacker.damageType || (attacker.magic ? 'magic' : 'physical'));
    pen = 0;
  }

  const hitChance = calcHitChance(accuracy, defense, pen);
  const hit = rollChance(hitChance);

  if (!hit) {
    combat.log.push({
      type: 'miss',
      text: `${attacker.name} attacks ${target.name} — MISS (${hitChance}%)`,
      class: 'miss',
    });
    return { hit: false, hitChance };
  }

  // Calculate damage
  let dmgMin, dmgMax, statBonus;
  if (isHero) {
    [dmgMin, dmgMax] = getWeaponDamage(attacker);
    statBonus = getDamageStat(attacker);
  } else {
    dmgMin = attacker.dmgMin;
    dmgMax = attacker.dmgMax;
    statBonus = 0;
  }

  let damage = randInt(dmgMin, dmgMax) + statBonus;
  let isCrit = false;

  // Crit check
  const critChance = isHero ? getCritChance(attacker) : 5;
  if (rollChance(critChance)) {
    damage = Math.round(damage * 2);
    isCrit = true;
  }

  damage = Math.max(1, damage);
  target.hp -= damage;

  // Check for weakness/resistance flavor
  const atkType = isMagicWeapon ? 'magic' : 'physical';
  const isWeak = target.weakTo && target.weakTo.includes(atkType);
  const isResist = target.resistTo && target.resistTo.includes(atkType);
  const weakTag = isWeak ? ' WEAK!' : isResist ? ' resisted' : '';

  if (isCrit) {
    combat.log.push({
      type: 'crit',
      text: `${attacker.name} CRITS ${target.name} for ${damage} damage!${weakTag}`,
      class: 'crit',
    });
  } else {
    combat.log.push({
      type: 'damage',
      text: `${attacker.name} hits ${target.name} for ${damage}${weakTag} (${hitChance}%)`,
      class: 'damage',
    });
  }

  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    combat.log.push({ type: 'death', text: `${target.name} has been slain!`, class: 'death' });
  }

  return { hit: true, damage, isCrit, hitChance };
}

// Use a class ability
export function abilityAction(combat, hero, abilityId, target) {
  const cls = CLASSES[hero.classId];
  const ability = cls.abilities.find(a => a.id === abilityId);
  if (!ability) return { error: 'Unknown ability' };
  if (hero.mp < ability.mpCost) return { error: 'Not enough MP' };
  if (hero.abilityCooldowns[abilityId] > 0) return { error: 'On cooldown' };
  if (ability.level > hero.level) return { error: 'Level too low' };

  hero.mp -= ability.mpCost;
  hero.abilityCooldowns[abilityId] = 2; // 2 turn cooldown

  combat.log.push({ type: 'ability', text: `${hero.name} uses ${ability.name}!`, class: 'ability' });

  const results = [];

  // Determine targets
  const targets = ability.aoe
    ? combat.enemies.filter(e => e.alive)
    : [target];

  for (const t of targets) {
    if (!t || !t.alive) continue;

    // Damage abilities
    if (ability.dmgMult) {
      // Determine damage type: element > magic flag > physical
      const dmgType = ability.element || (ability.magic ? 'magic' : 'physical');
      const isMagicStat = ability.magic || ability.element; // uses INT scaling if magic or elemental
      const accuracy = getAccuracy(hero) + (ability.critBonus || 0);
      const penStats = getPenetration(hero);
      const defense = getDefense(t, dmgType);
      const pen = isMagicStat ? penStats.magicPen : penStats.armorPen;

      const hitChance = calcHitChance(accuracy, defense, pen);
      const hit = rollChance(hitChance);

      if (!hit) {
        combat.log.push({ type: 'miss', text: `  → ${t.name}: MISS (${hitChance}%)`, class: 'miss' });
        results.push({ target: t, hit: false });
        continue;
      }

      // Execute threshold check
      if (ability.executeThreshold) {
        const hpPct = (t.hp / t.maxHp) * 100;
        if (hpPct > ability.executeThreshold) {
          // Reduced damage if above threshold
          const [dmgMin, dmgMax] = getWeaponDamage(hero);
          let damage = Math.round((randInt(dmgMin, dmgMax) + getDamageStat(hero)) * 1.0);
          damage = Math.max(1, damage);
          t.hp -= damage;
          combat.log.push({ type: 'damage', text: `  → ${t.name}: ${damage} damage (target above ${ability.executeThreshold}% HP)`, class: 'damage' });
          if (t.hp <= 0) { t.hp = 0; t.alive = false; combat.log.push({ type: 'death', text: `  ${t.name} has been slain!`, class: 'death' }); }
          results.push({ target: t, hit: true, damage });
          continue;
        }
      }

      const [dmgMin, dmgMax] = getWeaponDamage(hero);
      let damage = Math.round((randInt(dmgMin, dmgMax) + getDamageStat(hero)) * ability.dmgMult);

      // Crit
      const critChance = getCritChance(hero) + (ability.critBonus || 0);
      const isAbilWeak = t.weakTo && t.weakTo.includes(dmgType);
      const isAbilResist = t.resistTo && t.resistTo.includes(dmgType);
      const abilWeakTag = isAbilWeak ? ' WEAK!' : isAbilResist ? ' resisted' : '';
      if (rollChance(critChance)) {
        damage *= 2;
        combat.log.push({ type: 'crit', text: `  → ${t.name}: CRIT! ${damage}${abilWeakTag}`, class: 'crit' });
      } else {
        combat.log.push({ type: 'damage', text: `  → ${t.name}: ${damage}${abilWeakTag}`, class: 'damage' });
      }

      damage = Math.max(1, Math.round(damage));
      t.hp -= damage;
      results.push({ target: t, hit: true, damage });

      // Lifesteal
      if (ability.lifesteal && damage > 0) {
        const healed = Math.round(damage * ability.lifesteal / 100);
        hero.hp = Math.min(hero.maxHp, hero.hp + healed);
        combat.log.push({ type: 'heal', text: `  ${hero.name} drains ${healed} HP`, class: 'heal' });
      }

      if (t.hp <= 0) {
        t.hp = 0;
        t.alive = false;
        combat.log.push({ type: 'death', text: `  ${t.name} has been slain!`, class: 'death' });
      }
    }

    // DoT effects (legacy manual dot)
    if (ability.dot) {
      t.dots = t.dots || [];
      t.dots.push({ name: ability.name, damage: ability.dot.damage, turns: ability.dot.turns });
      combat.log.push({ type: 'ability', text: `  → ${t.name} is afflicted! (${ability.dot.damage}/turn for ${ability.dot.turns} turns)`, class: 'ability' });
    }

    // Element-based DoT (applyDot references DAMAGE_TYPES)
    if (ability.applyDot && !ability.dot) {
      const dtConfig = DAMAGE_TYPES[ability.applyDot];
      if (dtConfig && dtConfig.dot) {
        const dotInfo = dtConfig.dot;
        const dotDmg = dotInfo.dmgPer + Math.floor(hero.level / 3);
        t.dots = t.dots || [];
        t.dots.push({ name: dotInfo.name, damage: dotDmg, turns: 3 });
        combat.log.push({ type: 'ability', text: `  → ${t.name}: ${dotInfo.name}! (${dotDmg}/turn for 3 turns)`, class: 'ability' });
      }
    }

    // Debuff effects
    if (ability.debuff) {
      t.debuffs = t.debuffs || [];
      t.debuffs.push({ stat: ability.debuff.stat, value: ability.debuff.pct, turns: ability.debuff.turns });
    }

    // Stun/slow effects
    if (ability.effect === 'stun') {
      t.debuffs = t.debuffs || [];
      t.debuffs.push({ stat: 'stunned', value: 1, turns: 1 });
      combat.log.push({ type: 'ability', text: `  → ${t.name} is stunned!`, class: 'ability' });
    }
  }

  // Self buffs
  if (ability.buff) {
    hero.buffs = hero.buffs || [];
    hero.buffs.push({ stat: ability.buff.stat, value: ability.buff.pct, turns: ability.buff.turns });
    combat.log.push({ type: 'ability', text: `  ${hero.name} gains +${ability.buff.pct}% ${ability.buff.stat} for ${ability.buff.turns} turns`, class: 'ability' });
  }
  if (ability.selfBuff) {
    hero.buffs = hero.buffs || [];
    hero.buffs.push({ stat: ability.selfBuff.stat, value: ability.selfBuff.pct, turns: ability.selfBuff.turns });
    combat.log.push({ type: 'ability', text: `  ${hero.name} gains +${ability.selfBuff.pct}% ${ability.selfBuff.stat}`, class: 'ability' });
  }

  // Heal ally abilities (Cleric/Paladin)
  if (ability.healAlly) {
    const healTargets = ability.aoe ? combat.party.filter(h => h.alive) : [target];
    for (const t of healTargets) {
      if (!t || !t.alive) continue;
      const healed = Math.round(t.maxHp * ability.healPct / 100);
      t.hp = Math.min(t.maxHp, t.hp + healed);
      combat.log.push({ type: 'heal', text: `  → ${t.name} healed for ${healed} HP`, class: 'heal' });
    }
  }

  // Encore: reset all ally cooldowns (Bard)
  if (ability.id === 'encore') {
    for (const ally of combat.party.filter(h => h.alive)) {
      if (ally.abilityCooldowns) {
        for (const key of Object.keys(ally.abilityCooldowns)) {
          ally.abilityCooldowns[key] = 0;
        }
      }
    }
    combat.log.push({ type: 'ability', text: `  All ally cooldowns reset!`, class: 'ability' });
  }

  return { results };
}

// Use an item in combat
export function useItemAction(combat, hero, item, targetHero = null) {
  if (!item.isConsumable) return { error: 'Not a consumable' };

  const target = targetHero || hero;

  switch (item.effect) {
    case 'heal':
      target.hp = Math.min(target.maxHp, target.hp + item.value);
      combat.log.push({ type: 'heal', text: `${hero.name} uses ${item.name} on ${target.name} — healed ${item.value} HP`, class: 'heal' });
      break;
    case 'mana':
      target.mp = Math.min(target.maxMp, target.mp + item.value);
      combat.log.push({ type: 'heal', text: `${hero.name} uses ${item.name} — restored ${item.value} MP`, class: 'heal' });
      break;
    case 'cure':
      target.dots = [];
      combat.log.push({ type: 'heal', text: `${hero.name} uses ${item.name} on ${target.name} — cured!`, class: 'heal' });
      break;
    case 'revive':
      if (target.alive) return { error: 'Target is alive' };
      target.alive = true;
      target.hp = Math.round(target.maxHp * (item.value / 100));
      combat.log.push({ type: 'heal', text: `${hero.name} uses ${item.name} — ${target.name} is revived!`, class: 'heal' });
      break;
  }

  // Remove item from hero inventory
  const idx = hero.inventory.findIndex(i => i.id === item.id);
  if (idx >= 0) hero.inventory.splice(idx, 1);

  return { success: true };
}

// Attempt to flee
export function fleeAction(combat) {
  const avgDex = combat.party
    .filter(h => h.alive)
    .reduce((s, h) => s + h.stats.DEX, 0) / combat.party.filter(h => h.alive).length;

  const avgEnemySpeed = combat.enemies
    .filter(e => e.alive)
    .reduce((s, e) => s + e.speed, 0) / combat.enemies.filter(e => e.alive).length;

  const fleeChance = clamp(Math.round((avgDex / (avgDex + avgEnemySpeed)) * 100 + 10), 15, 85);
  const success = rollChance(fleeChance);

  if (success) {
    combat.state = 'fled';
    combat.log.push({ type: 'ability', text: `Party flees! (${fleeChance}% chance)`, class: 'ability' });
  } else {
    combat.log.push({ type: 'miss', text: `Failed to flee! (${fleeChance}% chance)`, class: 'miss' });
  }

  return { success, fleeChance };
}

// Get hit chance preview for UI
export function previewAttack(attacker, target, isHero = true) {
  let accuracy, defense, pen;

  if (isHero) {
    accuracy = getAccuracy(attacker);
    const penStats = getPenetration(attacker);
    const isMagic = attacker.gear?.weapon?.damageType === 'magic';
    defense = isMagic ? (target.magicResist || 0) : (target.armor || 0);
    pen = isMagic ? penStats.magicPen : penStats.armorPen;
  } else {
    accuracy = attacker.accuracy;
    defense = attacker.magic ? getMagicResist(target) : getArmor(target);
    pen = 0;
  }

  return {
    hitChance: calcHitChance(accuracy, defense, pen),
    critChance: isHero ? getCritChance(attacker) : 5,
  };
}

// Hero Auto-Battle AI
export function heroAutoBattle(combat, hero) {
  if (!hero.alive) return;

  // Check if stunned
  if (hero.debuffs?.some(d => d.stat === 'stunned')) {
    combat.log.push({ type: 'ability', text: `${hero.name} is stunned and cannot act!`, class: 'ability' });
    return;
  }

  const mode = hero.autoBattle;
  const cls = CLASSES[hero.classId];
  const enemies = combat.enemies.filter(e => e.alive);
  const allies = combat.party.filter(h => h.alive);
  if (enemies.length === 0) return;

  // Find usable abilities (enough MP, not on CD, level unlocked)
  const usable = cls.abilities.filter(a =>
    hero.level >= a.level &&
    hero.mp >= a.mpCost &&
    !(hero.abilityCooldowns[a.id] > 0)
  );

  if (mode === 'aggressive') {
    // Use highest-damage ability first, else basic attack on lowest-HP enemy
    const dmgAbility = usable.filter(a => a.dmgMult).sort((a, b) => b.dmgMult - a.dmgMult)[0];
    const target = [...enemies].sort((a, b) => a.hp - b.hp)[0];

    if (dmgAbility) {
      abilityAction(combat, hero, dmgAbility.id, target);
    } else {
      attackAction(combat, hero, target);
    }
  } else if (mode === 'defensive') {
    // Heal low-HP ally with items, or use defensive abilities, or attack
    const lowAlly = allies.find(h => h.hp / h.maxHp < 0.4);
    const healItem = hero.inventory.find(i => i.isConsumable && i.effect === 'heal');

    if (lowAlly && healItem) {
      useItemAction(combat, hero, healItem, lowAlly);
    } else {
      // Use stun/debuff abilities
      const defAbility = usable.find(a => a.effect === 'stun' || a.debuff);
      const target = [...enemies].sort((a, b) => b.hp - a.hp)[0]; // attack strongest

      if (defAbility) {
        abilityAction(combat, hero, defAbility.id, target);
      } else {
        attackAction(combat, hero, target);
      }
    }
  } else if (mode === 'supportive') {
    // Buff/debuff first, then heal, then attack weakest
    const buffAbility = usable.find(a => a.buff || a.selfBuff);
    const debuffAbility = usable.find(a => a.debuff || a.effect === 'stun');
    const lowAlly = allies.find(h => h.hp / h.maxHp < 0.5);
    const healItem = hero.inventory.find(i => i.isConsumable && i.effect === 'heal');
    const target = [...enemies].sort((a, b) => a.hp - b.hp)[0];

    if (buffAbility) {
      abilityAction(combat, hero, buffAbility.id, target);
    } else if (debuffAbility) {
      abilityAction(combat, hero, debuffAbility.id, target);
    } else if (lowAlly && healItem) {
      useItemAction(combat, hero, healItem, lowAlly);
    } else {
      attackAction(combat, hero, target);
    }
  }
}

// Enemy AI: pick action for an enemy's turn
export function enemyAI(combat, enemy) {
  // Check if stunned
  if (enemy.debuffs?.some(d => d.stat === 'stunned')) {
    combat.log.push({ type: 'ability', text: `${enemy.name} is stunned and cannot act!`, class: 'ability' });
    return;
  }

  // Pick a living hero target (lowest HP)
  const targets = combat.party.filter(h => h.alive);
  if (targets.length === 0) return;

  targets.sort((a, b) => a.hp - b.hp);
  const target = targets[0];

  attackAction(combat, enemy, target);
}
