// === Voidborn — Stash Tab ===

import { G, stashCapacity, stashUsed, canStash, getHero, usedInventory, saveGame, secureContainerCapacity, secureContainerUsed, canSecure } from '../../state.js';
import { CLASSES, GEAR_SLOTS, GEAR_SLOT_INFO } from '../../config.js';
import { el } from '../../utils.js';
import { itemDisplay, itemDetail, btn, statRow, toast, progressBar } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';

export function renderStashTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  // Hero equipment & inventory (show first — this is what players care about)
  container.appendChild(el('div', { class: 'section-title', text: 'Heroes' }));

  for (const hero of G.heroes) {
    container.appendChild(renderHeroGear(hero));
  }

  // Divider
  container.appendChild(el('div', { class: 'divider' }));

  // Town Stash
  container.appendChild(el('div', { class: 'section-title', text: 'Town Stash' }));
  const used = stashUsed();
  const cap = stashCapacity();
  container.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 8px;' }, [
    el('span', { class: 'text-dim', text: `${used}/${cap} units`, style: 'font-size: 12px;' }),
    progressBar(used, cap, '', false),
  ]));

  if (G.stash.length === 0) {
    container.appendChild(el('p', { class: 'text-dim', text: 'Stash is empty. Extract loot from raids!' }));
  } else {
    const grid = el('div', { class: 'grid-3' });
    for (const item of G.stash) {
      grid.appendChild(itemDisplay(item, (itm) => showStashItemActions(itm)));
    }
    container.appendChild(grid);
  }

  // Divider
  container.appendChild(el('div', { class: 'divider' }));

  // Secure Container
  container.appendChild(el('div', { class: 'section-title', text: 'Secure Container' }));
  const secUsed = secureContainerUsed();
  const secCap = secureContainerCapacity();
  container.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 4px;' }, [
    el('span', { class: 'text-dim', text: `${secUsed}/${secCap} units`, style: 'font-size: 12px;' }),
    progressBar(secUsed, secCap, '', false),
  ]));
  container.appendChild(el('div', { class: 'text-dim', text: 'Items here are never lost, even on full wipe.', style: 'font-size: 11px; margin-bottom: 6px; font-style: italic;' }));

  if (G.secureContainer.length === 0) {
    container.appendChild(el('p', { class: 'text-dim', text: 'Empty. Move valuable items here from stash.' }));
  } else {
    const secGrid = el('div', { class: 'grid-3' });
    for (const item of G.secureContainer) {
      secGrid.appendChild(itemDisplay(item, (itm) => showSecureItemActions(itm)));
    }
    container.appendChild(secGrid);
  }

  return container;
}

function renderHeroGear(hero) {
  const cls = CLASSES[hero.classId];
  const used = usedInventory(hero);
  const card = el('div', { class: 'card', style: 'margin-bottom: 8px;' });

  // Header
  card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 8px;' }, [
    el('span', { text: cls.icon, style: 'font-size: 22px;' }),
    el('div', { style: 'flex: 1;' }, [
      el('div', { class: 'text-bright', text: `${hero.name}`, style: 'font-weight: 700;' }),
      el('div', { class: 'text-dim', text: `Lv.${hero.level} ${cls.name} | ${used}/${hero.inventoryCapacity}u`, style: 'font-size: 11px;' }),
    ]),
  ]));

  // Equipment slots (11 RuneScape-style)
  card.appendChild(el('div', { class: 'text-dim', text: 'Equipment', style: 'font-size: 11px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase;' }));
  const gearGrid = el('div', { class: 'grid-3', style: 'margin-bottom: 8px;' });

  const isTwoHanded = hero.gear.weapon && hero.gear.weapon.twoHanded;

  for (const slot of GEAR_SLOTS) {
    const slotInfo = GEAR_SLOT_INFO[slot];
    const item = hero.gear[slot];
    const blocked = slot === 'offhand' && isTwoHanded;

    if (item) {
      const slotEl = el('div', { class: `item-slot rarity-${item.rarity}`, style: 'cursor: pointer;' }, [
        el('span', { class: 'item-icon', text: item.icon }),
        el('span', { class: `item-name rarity-text-${item.rarity}`, text: item.name }),
        el('span', { class: 'text-dim', text: `${item.size}u`, style: 'font-size: 9px;' }),
      ]);
      slotEl.onclick = () => showEquippedItemActions(hero, slot, item);
      gearGrid.appendChild(slotEl);
    } else if (blocked) {
      gearGrid.appendChild(el('div', { class: 'item-slot empty', style: 'opacity: 0.3;' }, [
        el('span', { class: 'text-dim', text: '2H', style: 'font-size: 10px;' }),
      ]));
    } else {
      const emptySlot = el('div', { class: 'item-slot empty', style: 'cursor: pointer;' }, [
        el('span', { text: slotInfo.icon, style: 'font-size: 16px; opacity: 0.4;' }),
        el('span', { class: 'text-dim', text: slotInfo.name, style: 'font-size: 9px;' }),
      ]);
      emptySlot.onclick = () => showEquipOptions(hero, slot);
      gearGrid.appendChild(emptySlot);
    }
  }
  card.appendChild(gearGrid);

  // Inventory (non-equipped items)
  if (hero.inventory.length > 0) {
    card.appendChild(el('div', { class: 'text-dim', text: 'Backpack', style: 'font-size: 11px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase;' }));
    const invGrid = el('div', { class: 'grid-3' });
    for (const item of hero.inventory) {
      invGrid.appendChild(itemDisplay(item, (itm) => showHeroItemActions(hero, itm)));
    }
    card.appendChild(invGrid);
  }

  return card;
}

// Show actions for an equipped item
function showEquippedItemActions(hero, slot, item) {
  const modal = createModal();
  modal.appendChild(itemDetail(item));

  const actions = el('div', { class: 'flex-col gap-sm', style: 'margin-top: 8px;' });

  // Unequip to stash
  actions.appendChild(btn('Unequip to Stash', 'btn-primary btn-sm btn-block', () => {
    if (!canStash(item)) { toast('Stash is full!', 'danger'); return; }
    hero.gear[slot] = null;
    G.stash.push(item);
    closeModal(modal);
    saveGame();
    renderActiveTab();
    toast(`Unequipped ${item.name}`, 'info');
  }));

  // Unequip to backpack
  const freeSpace = hero.inventoryCapacity - usedInventory(hero) + item.size;
  if (freeSpace >= item.size) {
    actions.appendChild(btn('Move to Backpack', 'btn-sm btn-block', () => {
      hero.gear[slot] = null;
      hero.inventory.push(item);
      closeModal(modal);
      saveGame();
      renderActiveTab();
    }));
  }

  actions.appendChild(btn('Close', 'btn-sm btn-block', () => closeModal(modal)));
  modal.appendChild(actions);
  document.body.appendChild(modal);
}

// Show equip options from stash for an empty slot
function showEquipOptions(hero, slot) {
  const available = G.stash.filter(item => item.slot === slot);
  if (available.length === 0) {
    toast(`No ${slot} items in stash`, 'info');
    return;
  }

  const modal = createModal();
  modal.appendChild(el('div', { class: 'text-bright', text: `Equip ${slot}`, style: 'font-weight: 700; margin-bottom: 8px;' }));

  for (const item of available) {
    let meetsReqs = true;
    if (item.statReq) {
      for (const [stat, val] of Object.entries(item.statReq)) {
        if ((hero.stats[stat] || 0) < val) meetsReqs = false;
      }
    }

    const row = el('div', { class: `loot-item rarity-${item.rarity}`, style: 'cursor: pointer;' }, [
      el('div', { class: 'loot-item-info' }, [
        el('span', { text: item.icon }),
        el('span', { class: `rarity-text-${item.rarity}`, text: item.name, style: 'font-size: 12px;' }),
      ]),
      meetsReqs
        ? btn('Equip', 'btn-sm btn-success', () => {
            const idx = G.stash.findIndex(i => i.id === item.id);
            if (idx >= 0) G.stash.splice(idx, 1);
            hero.gear[slot] = item;
            closeModal(modal);
            saveGame();
            renderActiveTab();
            renderHUD();
            toast(`${hero.name} equipped ${item.name}`, 'success');
          })
        : el('span', { class: 'text-danger', text: 'Req not met', style: 'font-size: 10px;' }),
    ]);
    modal.appendChild(row);
  }

  modal.appendChild(btn('Close', 'btn-sm btn-block', () => closeModal(modal)));
  document.body.appendChild(modal);
}

// Show actions for a stash item
function showStashItemActions(item) {
  const modal = createModal();
  modal.appendChild(itemDetail(item));

  const actions = el('div', { class: 'flex-col gap-sm', style: 'margin-top: 8px;' });

  // Equip to hero
  if (item.slot) {
    for (const hero of G.heroes) {
      const cls = CLASSES[hero.classId];
      let meetsReqs = true;
      if (item.statReq) {
        for (const [stat, val] of Object.entries(item.statReq)) {
          if ((hero.stats[stat] || 0) < val) meetsReqs = false;
        }
      }

      actions.appendChild(btn(
        `${meetsReqs ? 'Equip on' : 'Cant equip:'} ${cls.icon} ${hero.name}`,
        meetsReqs ? 'btn-primary btn-sm btn-block' : 'btn-sm btn-block',
        meetsReqs ? () => {
          const idx = G.stash.findIndex(i => i.id === item.id);
          if (idx >= 0) G.stash.splice(idx, 1);
          const slot = item.slot;
          if (hero.gear[slot]) G.stash.push(hero.gear[slot]);
          hero.gear[slot] = item;
          closeModal(modal);
          saveGame();
          renderActiveTab();
          renderHUD();
          toast(`${hero.name} equipped ${item.name}`, 'success');
        } : null
      ));
    }
  }

  // Give to hero backpack
  for (const hero of G.heroes) {
    const cls = CLASSES[hero.classId];
    const space = hero.inventoryCapacity - usedInventory(hero);
    if (space >= item.size) {
      actions.appendChild(btn(
        `Give to ${cls.icon} ${hero.name}`,
        'btn-sm btn-block',
        () => {
          const idx = G.stash.findIndex(i => i.id === item.id);
          if (idx >= 0) G.stash.splice(idx, 1);
          hero.inventory.push(item);
          closeModal(modal);
          saveGame();
          renderActiveTab();
          toast(`Gave ${item.name} to ${hero.name}`, 'info');
        }
      ));
    }
  }

  // Move to secure container
  if (canSecure(item)) {
    actions.appendChild(btn('Move to Secure Container', 'btn-success btn-sm btn-block', () => {
      const idx = G.stash.findIndex(i => i.id === item.id);
      if (idx >= 0) G.stash.splice(idx, 1);
      G.secureContainer.push(item);
      closeModal(modal);
      saveGame();
      renderActiveTab();
      toast(`Secured ${item.name}`, 'success');
    }));
  }

  // Discard
  actions.appendChild(btn('Discard', 'btn-danger btn-sm btn-block', () => {
    const idx = G.stash.findIndex(i => i.id === item.id);
    if (idx >= 0) G.stash.splice(idx, 1);
    closeModal(modal);
    saveGame();
    renderActiveTab();
  }));

  actions.appendChild(btn('Close', 'btn-sm btn-block', () => closeModal(modal)));
  modal.appendChild(actions);
  document.body.appendChild(modal);
}

// Show actions for a secure container item
function showSecureItemActions(item) {
  const modal = createModal();
  modal.appendChild(itemDetail(item));

  const actions = el('div', { class: 'flex-col gap-sm', style: 'margin-top: 8px;' });

  // Move back to stash
  if (canStash(item)) {
    actions.appendChild(btn('Move to Stash', 'btn-primary btn-sm btn-block', () => {
      const idx = G.secureContainer.findIndex(i => i.id === item.id);
      if (idx >= 0) G.secureContainer.splice(idx, 1);
      G.stash.push(item);
      closeModal(modal);
      saveGame();
      renderActiveTab();
      toast(`Moved ${item.name} to stash`, 'info');
    }));
  }

  actions.appendChild(btn('Close', 'btn-sm btn-block', () => closeModal(modal)));
  modal.appendChild(actions);
  document.body.appendChild(modal);
}

// Show actions for a hero's backpack item
function showHeroItemActions(hero, item) {
  const modal = createModal();
  modal.appendChild(itemDetail(item));

  const actions = el('div', { class: 'flex-col gap-sm', style: 'margin-top: 8px;' });

  // Equip if it's gear
  if (item.slot && !item.isConsumable) {
    let meetsReqs = true;
    if (item.statReq) {
      for (const [stat, val] of Object.entries(item.statReq)) {
        if ((hero.stats[stat] || 0) < val) meetsReqs = false;
      }
    }
    if (meetsReqs) {
      actions.appendChild(btn('Equip', 'btn-success btn-sm btn-block', () => {
        const idx = hero.inventory.findIndex(i => i.id === item.id);
        if (idx >= 0) hero.inventory.splice(idx, 1);
        if (hero.gear[item.slot]) hero.inventory.push(hero.gear[item.slot]);
        hero.gear[item.slot] = item;
        closeModal(modal);
        saveGame();
        renderActiveTab();
        toast(`Equipped ${item.name}`, 'success');
      }));
    }
  }

  // Move to stash
  if (canStash(item)) {
    actions.appendChild(btn('Move to Stash', 'btn-primary btn-sm btn-block', () => {
      const idx = hero.inventory.findIndex(i => i.id === item.id);
      if (idx >= 0) hero.inventory.splice(idx, 1);
      G.stash.push(item);
      closeModal(modal);
      saveGame();
      renderActiveTab();
    }));
  }

  // Discard
  actions.appendChild(btn('Discard', 'btn-danger btn-sm btn-block', () => {
    const idx = hero.inventory.findIndex(i => i.id === item.id);
    if (idx >= 0) hero.inventory.splice(idx, 1);
    closeModal(modal);
    saveGame();
    renderActiveTab();
  }));

  actions.appendChild(btn('Close', 'btn-sm btn-block', () => closeModal(modal)));
  modal.appendChild(actions);
  document.body.appendChild(modal);
}

// Modal helpers
function createModal() {
  // Remove any existing modal
  const existing = document.querySelector('.item-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = el('div', { class: 'item-modal-backdrop' });
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:90;display:flex;align-items:flex-end;justify-content:center;padding:0 8px 68px;';
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

  const modal = el('div', { class: 'card', style: 'width:100%;max-width:420px;max-height:70vh;overflow-y:auto;' });
  backdrop.appendChild(modal);
  return backdrop;
}

function closeModal(modal) {
  modal.remove();
}
