import { loadState, saveState } from './core/save.js';
import { runGameTick, TICK_MS } from './core/tick.js';
import { renderApp, scrollLogToBottom } from './ui/render.js';
import { startCombat } from './systems/combat.js';

const AUTOSAVE_EVERY_N_TICKS = 10;

const state = loadState();
const appEl = document.getElementById('app');
let ticksSinceSave = 0;

function render() {
  appEl.innerHTML = renderApp(state);
  scrollLogToBottom();
}

function handleAction(action) {
  if (action === 'chop') {
    state.activity = { type: 'woodcutting', ticks: 0 };
  } else if (action === 'fight') {
    startCombat(state, 'wild_boar');
  } else if (action === 'stop') {
    state.activity = { type: null, ticks: 0 };
    state.combat.monsterId = null;
    state.combat.monsterHp = null;
  }
  render();
}

appEl.addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (action) handleAction(action);
});

setInterval(() => {
  runGameTick(state);
  render();

  ticksSinceSave += 1;
  if (ticksSinceSave >= AUTOSAVE_EVERY_N_TICKS) {
    saveState(state);
    ticksSinceSave = 0;
  }
}, TICK_MS);

window.addEventListener('beforeunload', () => saveState(state));

render();
