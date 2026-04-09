// === Voidborn — Party Tab ===

import { G, getHero, recalcHero, usedInventory } from '../../state.js';
import { CLASSES, STATS, STAT_DESC, GEAR_SLOTS, GEAR_SLOT_INFO } from '../../config.js';
import { el } from '../../utils.js';
import { heroCard, progressBar, statRow, btn, toast, itemDetail } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';

export function renderPartyTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  container.appendChild(el('div', { class: 'section-title', text: 'Your Party' }));

  if (G.heroes.length === 0) {
    container.appendChild(el('p', { class: 'text-dim', text: 'No heroes yet. Create your first character!' }));
    return container;
  }

  for (const hero of G.heroes) {
    container.appendChild(renderHeroDetail(hero));
  }

  return container;
}

function renderHeroDetail(hero) {
  const cls = CLASSES[hero.classId];
  const card = el('div', { class: 'card', style: 'margin-bottom: 12px;' });

  // Header
  card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 8px;' }, [
    el('span', { text: cls.icon, style: 'font-size: 28px;' }),
    el('div', { style: 'flex: 1;' }, [
      el('div', { class: 'text-bright', text: `${hero.name}${hero.isMain ? ' (Main)' : ''}`, style: 'font-weight: 700;' }),
      el('div', { class: 'text-dim', text: `Level ${hero.level} ${cls.name}`, style: 'font-size: 12px;' }),
    ]),
  ]));

  // HP / MP bars
  card.appendChild(el('div', { class: 'flex gap-sm', style: 'margin-bottom: 4px; align-items: center;' }, [
    el('span', { class: 'text-dim', text: 'HP', style: 'width: 24px; font-size: 11px;' }),
    progressBar(hero.hp, hero.maxHp, 'hp', true),
  ]));
  card.appendChild(el('div', { class: 'flex gap-sm', style: 'margin-bottom: 4px; align-items: center;' }, [
    el('span', { class: 'text-dim', text: 'MP', style: 'width: 24px; font-size: 11px;' }),
    progressBar(hero.mp, hero.maxMp, 'mp', true),
  ]));

  // XP bar
  const xpNeeded = Math.floor(50 * Math.pow(hero.level, 1.8));
  card.appendChild(el('div', { class: 'flex gap-sm', style: 'margin-bottom: 8px; align-items: center;' }, [
    el('span', { class: 'text-dim', text: 'XP', style: 'width: 24px; font-size: 11px;' }),
    progressBar(hero.xp, xpNeeded, 'xp', true),
  ]));

  // Stats
  const statsDiv = el('div', { style: 'margin-bottom: 8px;' });
  for (const stat of STATS) {
    const row = el('div', { class: 'stat-alloc' });
    row.appendChild(el('span', { class: 'stat-alloc-name', text: stat }));
    row.appendChild(el('span', { class: 'stat-alloc-desc', text: STAT_DESC[stat] }));

    const controls = el('div', { class: 'stat-alloc-controls' });

    if (hero.statPoints > 0) {
      const minusBtn = el('button', { class: 'stat-alloc-btn', text: '-' });
      minusBtn.onclick = () => {
        if (hero.stats[stat] > 8) {
          hero.stats[stat]--;
          hero.statPoints++;
          recalcHero(hero);
          renderActiveTab();
          renderHUD();
        }
      };
      controls.appendChild(minusBtn);
    }

    controls.appendChild(el('span', { class: 'stat-alloc-val', text: String(hero.stats[stat]) }));

    if (hero.statPoints > 0) {
      const plusBtn = el('button', { class: 'stat-alloc-btn', text: '+' });
      plusBtn.onclick = () => {
        if (hero.statPoints > 0) {
          hero.stats[stat]++;
          hero.statPoints--;
          recalcHero(hero);
          renderActiveTab();
          renderHUD();
        }
      };
      controls.appendChild(plusBtn);
    }

    row.appendChild(controls);
    statsDiv.appendChild(row);
  }

  if (hero.statPoints > 0) {
    statsDiv.insertBefore(
      el('div', { class: 'text-warning', text: `${hero.statPoints} stat points to allocate!`, style: 'font-size: 12px; margin-bottom: 6px;' }),
      statsDiv.firstChild
    );
  }

  card.appendChild(statsDiv);

  // Gear (11 slots)
  card.appendChild(el('div', { class: 'text-dim', text: 'Equipment', style: 'font-size: 11px; font-weight: 600; margin-bottom: 4px;' }));
  const gearGrid = el('div', { class: 'grid-3' });
  const isTwoHanded = hero.gear.weapon && hero.gear.weapon.twoHanded;
  for (const slot of GEAR_SLOTS) {
    const info = GEAR_SLOT_INFO[slot];
    const item = hero.gear[slot];
    const blocked = slot === 'offhand' && isTwoHanded;
    if (item) {
      gearGrid.appendChild(el('div', { class: `item-slot rarity-${item.rarity}` }, [
        el('span', { class: 'item-icon', text: item.icon }),
        el('span', { class: `item-name rarity-text-${item.rarity}`, text: item.name }),
      ]));
    } else if (blocked) {
      gearGrid.appendChild(el('div', { class: 'item-slot empty', style: 'opacity: 0.3;' }, [
        el('span', { class: 'text-dim', text: '2H', style: 'font-size: 10px;' }),
      ]));
    } else {
      gearGrid.appendChild(el('div', { class: 'item-slot empty' }, [
        el('span', { text: info.icon, style: 'font-size: 14px; opacity: 0.3;' }),
        el('span', { class: 'text-dim', text: info.name, style: 'font-size: 9px;' }),
      ]));
    }
  }
  card.appendChild(gearGrid);

  // Inventory summary
  const used = usedInventory(hero);
  card.appendChild(el('div', { class: 'text-dim', text: `Inventory: ${used}/${hero.inventoryCapacity}u`, style: 'font-size: 11px; margin-top: 8px;' }));

  // Abilities
  card.appendChild(el('div', { class: 'text-dim', text: 'Abilities', style: 'font-size: 11px; font-weight: 600; margin-top: 8px; margin-bottom: 4px;' }));
  for (const ability of cls.abilities) {
    const unlocked = hero.level >= ability.level;
    const abilRow = el('div', { class: 'stat-row', style: unlocked ? '' : 'opacity: 0.4;' }, [
      el('span', { class: 'stat-label', text: `${ability.name} (Lv.${ability.level})` }),
      el('span', { class: 'stat-value text-dim', text: ability.desc, style: 'font-size: 10px; text-align: right;' }),
    ]);
    card.appendChild(abilRow);
  }

  return card;
}
