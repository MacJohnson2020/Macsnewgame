import { getLevel, addXp, addItem, addLogEntry } from '../core/state.js';

const WOODCUTTING_XP_PER_LOG = 25;

export function tickWoodcutting(state) {
  state.activity.ticks += 1;

  const level = getLevel(state, 'woodcutting');
  const chance = Math.min(0.35 + level * 0.004, 0.8);

  if (Math.random() < chance) {
    addItem(state, 'logs', 1);
    addXp(state, 'woodcutting', WOODCUTTING_XP_PER_LOG);
    addLogEntry(state, 'You get some logs.');
  }
}
