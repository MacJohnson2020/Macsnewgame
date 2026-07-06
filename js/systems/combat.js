import { getLevel, getMaxHp, addXp, addGold, addLogEntry } from '../core/state.js';
import { MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';

const MELEE_XP_PER_DAMAGE = 4;
const HITPOINTS_XP_PER_DAMAGE = 1.33;

export function startCombat(state, monsterId) {
  const monster = MONSTERS[monsterId];
  state.activity = { type: 'combat', ticks: 0 };
  state.combat.monsterId = monsterId;
  state.combat.monsterHp = monster.maxHp;
  addLogEntry(state, `You engage a ${monster.name}.`);
}

function respawnMonster(state, monster) {
  state.combat.monsterHp = monster.maxHp;
}

function resolvePlayerAttack(state, monster) {
  const weapon = ITEMS[state.equipment.weapon];
  const meleeLevel = getLevel(state, 'melee');
  const accuracy = Math.min(0.9, 0.5 + (meleeLevel - monster.defenceLevel) * 0.02);

  if (Math.random() >= accuracy) {
    addLogEntry(state, `You miss the ${monster.name}.`);
    return;
  }

  const maxHit = Math.max(1, Math.floor(meleeLevel / 4) + weapon.strengthBonus);
  const damage = 1 + Math.floor(Math.random() * maxHit);
  state.combat.monsterHp -= damage;
  addXp(state, 'melee', damage * MELEE_XP_PER_DAMAGE);
  addXp(state, 'hitpoints', damage * HITPOINTS_XP_PER_DAMAGE);
  addLogEntry(state, `You hit the ${monster.name} for ${damage}.`);

  if (state.combat.monsterHp <= 0) {
    const [min, max] = monster.goldDrop;
    const gold = min + Math.floor(Math.random() * (max - min + 1));
    addGold(state, gold);
    addLogEntry(state, `You defeat the ${monster.name} and find ${gold} gold.`);
    respawnMonster(state, monster);
  }
}

function resolveMonsterAttack(state, monster) {
  const defenceLevel = getLevel(state, 'defence');
  const accuracy = Math.max(0.1, 0.5 + (monster.attackLevel - defenceLevel) * 0.02);

  if (Math.random() >= accuracy) {
    addLogEntry(state, `The ${monster.name} misses you.`);
    return;
  }

  const damage = 1 + Math.floor(Math.random() * monster.maxHit);
  state.combat.currentHp = Math.max(0, state.combat.currentHp - damage);
  addLogEntry(state, `The ${monster.name} hits you for ${damage}.`);

  if (state.combat.currentHp <= 0) {
    addLogEntry(state, 'You have been knocked out and wake up back in Millbrook.');
    state.combat.currentHp = getMaxHp(state);
    state.combat.monsterId = null;
    state.combat.monsterHp = null;
    state.activity = { type: null, ticks: 0 };
  }
}

export function tickCombat(state) {
  const monster = MONSTERS[state.combat.monsterId];
  if (!monster) return;

  state.activity.ticks += 1;
  const ticks = state.activity.ticks;
  const weapon = ITEMS[state.equipment.weapon];

  if (ticks % weapon.attackSpeedTicks === 0) {
    resolvePlayerAttack(state, monster);
  }

  // Offset from the player's swing so both don't always land on the same tick.
  if (state.combat.monsterHp > 0 && ticks % monster.attackSpeedTicks === 2) {
    resolveMonsterAttack(state, monster);
  }
}
