import { SKILLS, SKILL_IDS } from '../data/skills.js';
import { XP_TABLE_99, XP_TABLE_120, levelForXp } from './xp.js';

export const SAVE_VERSION = 1;
const LOG_LIMIT = 50;

function tableForSkill(skillId) {
  return SKILLS[skillId].maxLevel === 120 ? XP_TABLE_120 : XP_TABLE_99;
}

export function getLevel(state, skillId) {
  return levelForXp(state.skills[skillId].xp, tableForSkill(skillId));
}

export function getXp(state, skillId) {
  return state.skills[skillId].xp;
}

export function getMaxHp(state) {
  return getLevel(state, 'hitpoints');
}

export function addLogEntry(state, message) {
  state.log.push(message);
  if (state.log.length > LOG_LIMIT) {
    state.log.shift();
  }
}

export function addXp(state, skillId, amount) {
  const table = tableForSkill(skillId);
  const beforeLevel = levelForXp(state.skills[skillId].xp, table);
  state.skills[skillId].xp += amount;
  const afterLevel = levelForXp(state.skills[skillId].xp, table);

  if (afterLevel > beforeLevel) {
    addLogEntry(state, `Congratulations! Your ${SKILLS[skillId].name} level is now ${afterLevel}.`);
  }
  return { leveledUp: afterLevel > beforeLevel, level: afterLevel };
}

export function addItem(state, itemId, qty = 1) {
  state.inventory[itemId] = (state.inventory[itemId] || 0) + qty;
}

export function addGold(state, amount) {
  state.inventory.gold = (state.inventory.gold || 0) + amount;
}

export function createDefaultState() {
  const skills = {};
  for (const id of SKILL_IDS) {
    skills[id] = { xp: 0 };
  }
  // Hitpoints starts at level 10, OSRS convention.
  skills.hitpoints.xp = XP_TABLE_99[10];

  const state = {
    version: SAVE_VERSION,
    skills,
    inventory: { logs: 0, gold: 0 },
    equipment: { weapon: 'rusty_sword' },
    combat: { currentHp: 0, monsterId: null, monsterHp: null },
    activity: { type: null, ticks: 0 },
    log: [],
  };

  state.combat.currentHp = getMaxHp(state);
  addLogEntry(state, 'Welcome to Millbrook.');
  return state;
}
