import { tickWoodcutting } from '../systems/gathering.js';
import { tickCombat } from '../systems/combat.js';

export const TICK_MS = 600;

export function runGameTick(state) {
  if (state.activity.type === 'woodcutting') {
    tickWoodcutting(state);
  } else if (state.activity.type === 'combat') {
    tickCombat(state);
  }
}
