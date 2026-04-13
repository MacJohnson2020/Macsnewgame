// === Voidborn — Town Tab ===

import { G, saveGame, getHero, stopTraining, getTrainingSlots } from '../../state.js';
import { BUILDINGS, SKILLS, CLASSES } from '../../config.js';
import { el, fmtNum } from '../../utils.js';
import { btn, card, statRow, toast, progressBar } from '../components.js';
import { renderActiveTab, switchTab } from '../router.js';
import { renderHUD } from '../hud.js';

export function renderTownTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  container.appendChild(el('div', { class: 'section-title', text: 'Town' }));
  container.appendChild(el('div', { class: 'section-subtitle', text: 'Upgrade buildings to improve your idle rewards and raid preparation.' }));

  // Buildings
  for (const [id, bldg] of Object.entries(BUILDINGS)) {
    const level = G.buildings[id] || 0;
    const cost = Math.floor(bldg.baseCost * Math.pow(bldg.costMult, level));
    const canAfford = G.gold >= cost;
    const isMaxed = level >= bldg.maxLevel;

    const bldgCard = el('div', { class: 'card', style: 'margin-bottom: 8px;' });

    bldgCard.appendChild(el('div', { class: 'card-header' }, [
      el('span', { class: 'card-title', text: `${bldg.icon} ${bldg.name}` }),
      el('span', { class: 'tag', text: `Lv.${level}/${bldg.maxLevel}` }),
    ]));

    bldgCard.appendChild(el('p', { class: 'text-dim', text: bldg.desc, style: 'font-size: 12px; margin-bottom: 6px;' }));

    // Effect description
    bldgCard.appendChild(statRow('Effect', getBuildingEffect(id, level)));

    if (!isMaxed) {
      bldgCard.appendChild(statRow('Upgrade Cost', `${fmtNum(cost)} gold`, canAfford ? 'text-success' : 'text-danger'));

      bldgCard.appendChild(btn(
        canAfford ? 'Upgrade' : 'Not enough gold',
        canAfford ? 'btn-primary btn-sm' : 'btn-sm',
        canAfford ? () => upgradeBuilding(id, cost) : null
      ));
    } else {
      bldgCard.appendChild(el('span', { class: 'text-success', text: 'MAX LEVEL', style: 'font-size: 12px; font-weight: 700;' }));
    }

    // Workshop: show active training
    if (id === 'workshop') {
      bldgCard.appendChild(el('div', { class: 'divider', style: 'margin: 8px 0;' }));
      const slots = getTrainingSlots();
      const usedSlots = G.trainingQueues.length;
      bldgCard.appendChild(el('div', { class: 'text-dim', text: `Active Training: ${usedSlots}/${slots} slots`, style: 'font-size: 11px; font-weight: 700; margin-bottom: 4px;' }));

      if (G.trainingQueues.length === 0) {
        bldgCard.appendChild(el('div', { class: 'text-dim', text: 'No heroes training. Open Skills tab to start.', style: 'font-size: 10px; font-style: italic; margin-bottom: 6px;' }));
      } else {
        for (const queue of G.trainingQueues) {
          const hero = getHero(queue.heroId);
          const skillDef = SKILLS[queue.skillId];
          if (!hero || !skillDef) continue;
          const cls = CLASSES[hero.classId];
          const row = el('div', { style: 'display: flex; align-items: center; gap: 6px; padding: 4px; background: var(--bg-dark); border-radius: 4px; margin-bottom: 3px;' });
          row.appendChild(el('span', { text: cls.icon, style: 'font-size: 14px;' }));
          row.appendChild(el('span', { class: 'text-bright', text: hero.name, style: 'font-size: 11px; font-weight: 600; flex: 1;' }));
          row.appendChild(el('span', { text: skillDef.icon, style: 'font-size: 14px;' }));
          row.appendChild(el('span', { class: 'text-dim', text: `${queue.actionsLeft} left`, style: 'font-size: 10px;' }));
          row.appendChild(btn('Stop', 'btn-sm btn-danger', () => {
            stopTraining(hero.id);
            saveGame();
            renderActiveTab();
            toast(`${hero.name} stopped training`, 'info');
          }));
          bldgCard.appendChild(row);
        }
      }

      bldgCard.appendChild(btn('Open Skills Tab', 'btn-sm btn-block', () => switchTab('skills')));
    }

    container.appendChild(bldgCard);
  }

  return container;
}

function getBuildingEffect(id, level) {
  switch (id) {
    case 'generator': return `+${(1 + level * 0.5).toFixed(1)} energy/min`;
    case 'foundry': return `+${level * 2} gold/min offline`;
    case 'vault': return `+${level * 10} stash capacity`;
    case 'workshop': return `${Math.min(1 + Math.floor(level / 3), 3)} training slots`;
    case 'tavern': return `${1 + level} heroes available`;
    case 'shrine': return `-${level * 5}% insurance cost`;
    default: return 'N/A';
  }
}

function upgradeBuilding(id, cost) {
  if (G.gold < cost) return;
  G.gold -= cost;
  G.buildings[id]++;
  saveGame();
  renderActiveTab();
  renderHUD();
  toast(`${BUILDINGS[id].name} upgraded to Level ${G.buildings[id]}!`, 'success');
}
