// === Voidborn — Stash Tab ===

import { G, stashCapacity, stashUsed, canStash, getHero, canCarry } from '../../state.js';
import { el } from '../../utils.js';
import { itemDisplay, itemDetail, btn, card, statRow, toast } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';
import { saveGame } from '../../state.js';

export function renderStashTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  // Stash header
  container.appendChild(el('div', { class: 'section-title', text: 'Town Stash' }));
  container.appendChild(el('div', { class: 'text-dim', text: `${stashUsed()}/${stashCapacity()} units used`, style: 'margin-bottom: 8px;' }));

  if (G.stash.length === 0) {
    container.appendChild(el('p', { class: 'text-dim', text: 'Stash is empty. Extract loot from raids to fill it!' }));
  } else {
    const grid = el('div', { class: 'grid-3' });
    for (const item of G.stash) {
      grid.appendChild(itemDisplay(item, (itm) => showItemActions(itm, container)));
    }
    container.appendChild(grid);
  }

  // Divider
  container.appendChild(el('div', { class: 'divider' }));

  // Hero inventories
  container.appendChild(el('div', { class: 'section-title', text: 'Hero Inventories' }));

  for (const hero of G.heroes) {
    const heroSection = el('div', { class: 'card', style: 'margin-bottom: 8px;' });
    const { CLASSES } = getClassesLocal();
    const cls = CLASSES[hero.classId] || { icon: '?', name: '?' };
    const used = getUsedInv(hero);

    heroSection.appendChild(el('div', { class: 'card-header' }, [
      el('span', { class: 'card-title', text: `${cls.icon} ${hero.name} (${used}/${hero.inventoryCapacity}u)` }),
    ]));

    // Equipped gear
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = hero.gear[slot];
      if (item) {
        const row = el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 4px;' }, [
          el('span', { class: 'text-dim', text: slot, style: 'width: 60px; font-size: 11px;' }),
          el('span', { text: item.icon }),
          el('span', { class: `rarity-text-${item.rarity}`, text: item.name, style: 'font-size: 12px; flex: 1;' }),
          btn('Unequip', 'btn-sm', () => unequipItem(hero, slot)),
        ]);
        heroSection.appendChild(row);
      } else {
        heroSection.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 4px; opacity: 0.4;' }, [
          el('span', { class: 'text-dim', text: slot, style: 'width: 60px; font-size: 11px;' }),
          el('span', { class: 'text-dim', text: '(empty)' }),
        ]));
      }
    }

    // Inventory items
    if (hero.inventory.length > 0) {
      const invGrid = el('div', { class: 'grid-3', style: 'margin-top: 6px;' });
      for (const item of hero.inventory) {
        invGrid.appendChild(itemDisplay(item, (itm) => showHeroItemActions(hero, itm, container)));
      }
      heroSection.appendChild(invGrid);
    }

    container.appendChild(heroSection);
  }

  return container;
}

function showItemActions(item, container) {
  // Show item detail + actions (equip to hero, discard)
  const modal = el('div', { class: 'card', style: 'position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); z-index: 50; max-width: 400px; width: 90%;' });

  modal.appendChild(itemDetail(item));

  const actions = el('div', { class: 'flex-col gap-sm', style: 'margin-top: 8px;' });

  // Equip to hero buttons
  for (const hero of G.heroes) {
    if (item.slot && canCarry(hero, item)) {
      const { CLASSES } = getClassesLocal();
      const cls = CLASSES[hero.classId] || { icon: '?', name: '?' };

      // Check stat requirements
      let meetsReqs = true;
      if (item.statReq) {
        for (const [stat, val] of Object.entries(item.statReq)) {
          if ((hero.stats[stat] || 0) < val) meetsReqs = false;
        }
      }

      const equipBtn = btn(
        `${meetsReqs ? 'Equip on' : 'Req not met:'} ${cls.icon} ${hero.name}`,
        meetsReqs ? 'btn-primary btn-sm btn-block' : 'btn-sm btn-block',
        meetsReqs ? () => equipFromStash(hero, item, modal) : null
      );
      if (!meetsReqs) equipBtn.disabled = true;
      actions.appendChild(equipBtn);
    }
  }

  // Discard
  actions.appendChild(btn('Discard', 'btn-danger btn-sm btn-block', () => {
    const idx = G.stash.findIndex(i => i.id === item.id);
    if (idx >= 0) G.stash.splice(idx, 1);
    modal.remove();
    saveGame();
    renderActiveTab();
  }));

  // Close
  actions.appendChild(btn('Close', 'btn-sm btn-block', () => modal.remove()));

  modal.appendChild(actions);
  document.body.appendChild(modal);
}

function showHeroItemActions(hero, item, container) {
  const modal = el('div', { class: 'card', style: 'position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); z-index: 50; max-width: 400px; width: 90%;' });

  modal.appendChild(itemDetail(item));

  const actions = el('div', { class: 'flex-col gap-sm', style: 'margin-top: 8px;' });

  // Move to stash
  if (canStash(item)) {
    actions.appendChild(btn('Move to Stash', 'btn-primary btn-sm btn-block', () => {
      const idx = hero.inventory.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        hero.inventory.splice(idx, 1);
        G.stash.push(item);
        modal.remove();
        saveGame();
        renderActiveTab();
      }
    }));
  }

  // Equip (if gear)
  if (item.slot && !item.isConsumable) {
    let meetsReqs = true;
    if (item.statReq) {
      for (const [stat, val] of Object.entries(item.statReq)) {
        if ((hero.stats[stat] || 0) < val) meetsReqs = false;
      }
    }

    if (meetsReqs) {
      actions.appendChild(btn('Equip', 'btn-success btn-sm btn-block', () => {
        equipFromInventory(hero, item);
        modal.remove();
        renderActiveTab();
      }));
    }
  }

  // Discard
  actions.appendChild(btn('Discard', 'btn-danger btn-sm btn-block', () => {
    const idx = hero.inventory.findIndex(i => i.id === item.id);
    if (idx >= 0) hero.inventory.splice(idx, 1);
    modal.remove();
    saveGame();
    renderActiveTab();
  }));

  actions.appendChild(btn('Close', 'btn-sm btn-block', () => modal.remove()));

  modal.appendChild(actions);
  document.body.appendChild(modal);
}

function equipFromStash(hero, item, modal) {
  // Remove from stash
  const idx = G.stash.findIndex(i => i.id === item.id);
  if (idx < 0) return;
  G.stash.splice(idx, 1);

  // If hero has something in that slot, unequip to stash
  const slot = item.slot;
  if (hero.gear[slot]) {
    G.stash.push(hero.gear[slot]);
  }

  hero.gear[slot] = item;
  modal.remove();
  saveGame();
  renderActiveTab();
  toast(`${hero.name} equipped ${item.name}`, 'success');
}

function equipFromInventory(hero, item) {
  const idx = hero.inventory.findIndex(i => i.id === item.id);
  if (idx < 0) return;
  hero.inventory.splice(idx, 1);

  const slot = item.slot;
  if (hero.gear[slot]) {
    hero.inventory.push(hero.gear[slot]);
  }

  hero.gear[slot] = item;
  saveGame();
  toast(`${hero.name} equipped ${item.name}`, 'success');
}

function unequipItem(hero, slot) {
  const item = hero.gear[slot];
  if (!item) return;

  if (canStash(item)) {
    hero.gear[slot] = null;
    G.stash.push(item);
    saveGame();
    renderActiveTab();
    toast(`Unequipped ${item.name} to stash`, 'info');
  } else {
    toast('Stash is full!', 'danger');
  }
}

function getUsedInv(hero) {
  let used = 0;
  for (const item of hero.inventory) used += item.size;
  for (const slot of ['weapon', 'armor', 'accessory']) {
    if (hero.gear[slot]) used += hero.gear[slot].size;
  }
  return used;
}

function getClassesLocal() {
  return {
    CLASSES: {
      fighter: { icon: '\u2694\uFE0F', name: 'Fighter' },
      rogue: { icon: '\uD83D\uDDE1\uFE0F', name: 'Rogue' },
      mage: { icon: '\uD83E\uDDD9', name: 'Mage' },
    },
  };
}
