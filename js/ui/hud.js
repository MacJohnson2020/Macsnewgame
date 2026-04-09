// === Voidborn — HUD (Top Bar) ===

import { G, getMainHero, deleteSave } from '../state.js';
import { el, fmtNum } from '../utils.js';

export function renderHUD() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.innerHTML = '';

  const main = getMainHero();

  // Gold
  hud.appendChild(hudStat('\uD83D\uDCB0', fmtNum(G.gold)));

  // Energy
  hud.appendChild(hudStat('\u26A1', `${G.energy}/${G.maxEnergy}`));

  // Main hero level
  if (main) {
    hud.appendChild(hudStat('\u2B50', `Lv.${main.level}`));
  }

  // In-raid indicator
  if (G.activeRaid) {
    const badge = el('span', {
      class: 'tag',
      text: `\uD83D\uDDE1\uFE0F ${G.activeRaid.zoneName}`,
      style: 'color: var(--danger); border-color: var(--danger); margin-left: auto;',
    });
    hud.appendChild(badge);
  }

  // Reset button
  const resetBtn = el('button', {
    text: '\u2699\uFE0F',
    style: 'background:none;border:none;font-size:18px;cursor:pointer;margin-left:auto;padding:4px;',
  });
  resetBtn.onclick = () => {
    if (confirm('Reset game? This deletes ALL progress permanently.')) {
      if (confirm('Are you sure? This cannot be undone.')) {
        deleteSave();
        location.reload();
      }
    }
  };
  hud.appendChild(resetBtn);
}

function hudStat(icon, value) {
  return el('div', { class: 'hud-stat' }, [
    el('span', { class: 'label', text: icon }),
    el('span', { class: 'value', text: value }),
  ]);
}
