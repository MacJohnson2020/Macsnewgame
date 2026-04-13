// === Voidborn — Raid Tab (Main Gameplay View) ===

import { G, getHero, saveGame, canCarry, giveStarterGear, recalcHero, getInsuranceCost, buyInsurance, isHeroInsured } from '../../state.js';
import { ZONES, CLASSES, GEAR_SLOTS, GEAR_SLOT_INFO, STATS, STAT_DESC, ENEMIES } from '../../config.js';
import { el } from '../../utils.js';
import { btn, card, heroCard, enemyCard, itemDisplay, itemDetail, corruptionBar, progressBar, statRow, toast, showDamageNumber, showContextTip } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';
import { setNavVisible } from '../router.js';
import { startRaid, getAvailableNodes, stepToNode, resolveEncounter, extractRaid, clearRaid, isPartyWiped, RAID_PHASE } from '../../raid/loop.js';
import { renderPath, renderPathOverview } from '../../raid/pathRenderer.js';
import { getCurrentCombatant, nextTurn, attackAction, abilityAction, useItemAction, fleeAction, previewAttack, enemyAI, heroAutoBattle } from '../../raid/combat.js';
import { generateGear, generateConsumable, generateGold } from '../../raid/entities.js';

export function renderRaidTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  if (!G.activeRaid) {
    return renderRaidPrep(container);
  }

  const raid = G.activeRaid;

  switch (raid.phase) {
    case RAID_PHASE.EXPLORING:
      return renderExploring(container, raid);
    case RAID_PHASE.ENCOUNTER:
      return renderEncounter(container, raid);
    case RAID_PHASE.COMBAT:
      return renderCombat(container, raid);
    case RAID_PHASE.EXTRACTING:
      return renderExtracting(container, raid);
    case RAID_PHASE.RESULT:
      return renderResult(container, raid);
    default:
      return renderRaidPrep(container);
  }
}

// === Raid Prep ===
function renderRaidPrep(container) {
  container.appendChild(el('div', { class: 'section-title', text: 'Extraction Raid' }));

  if (G.heroes.length === 0) {
    container.appendChild(el('p', { class: 'text-dim', text: 'Create a hero first from the character creation screen.' }));
    return container;
  }

  // Party selection
  container.appendChild(el('div', { class: 'text-dim', text: 'Select Party', style: 'font-weight: 600; margin-bottom: 4px;' }));
  for (const hero of G.heroes) {
    const cls = CLASSES[hero.classId];
    const isSelected = G.raidParty.includes(hero.id);
    const selectBtn = el('div', {
      class: `card ${isSelected ? 'rarity-rare' : ''}`,
      style: 'margin-bottom: 6px; cursor: pointer; padding: 8px;',
    }, [
      el('div', { class: 'flex gap-sm', style: 'align-items: center;' }, [
        el('span', { text: cls.icon, style: 'font-size: 20px;' }),
        el('span', { class: 'text-bright', text: `${hero.name} Lv.${hero.level}`, style: 'font-weight: 600; flex: 1;' }),
        el('span', { text: `HP: ${hero.hp}/${hero.maxHp}`, class: 'text-dim', style: 'font-size: 11px;' }),
        el('span', { text: isSelected ? '\u2705' : '\u2B1C', style: 'font-size: 18px;' }),
      ]),
    ]);
    selectBtn.onclick = () => togglePartyMember(hero.id);
    container.appendChild(selectBtn);
  }

  container.appendChild(el('div', { class: 'divider' }));

  // Insurance section — per-hero toggle
  if (G.raidParty.length > 0) {
    const insSection = el('div', { class: 'card', style: 'padding: 10px; margin-bottom: 8px;' });
    insSection.appendChild(el('div', { class: 'text-bright', text: 'Gear Insurance', style: 'font-weight: 700; font-size: 12px;' }));
    insSection.appendChild(el('div', { class: 'text-dim', text: 'Tap heroes to insure individually. Recovered gear goes to stash on death.', style: 'font-size: 10px; margin-bottom: 6px;' }));

    const pending = G.pendingInsurance || [];
    let totalCost = 0;

    const partyHeroes = G.raidParty.map(id => getHero(id)).filter(Boolean);
    for (const hero of partyHeroes) {
      const cost = getInsuranceCost(hero);
      const insured = pending.includes(hero.id);
      if (insured) totalCost += cost;

      const row = el('div', {
        style: `display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 6px; margin-bottom: 2px; border-radius: 4px; cursor: pointer; background: ${insured ? 'rgba(46,204,113,0.1)' : 'var(--bg-dark)'}; border: 1px solid ${insured ? 'var(--success)' : 'var(--border)'};`
      });
      row.appendChild(el('span', { class: insured ? 'text-success' : 'text-dim', text: insured ? '\u2705' : '\u2B1C', style: 'font-size: 14px;' }));
      row.appendChild(el('span', { class: 'text-bright', text: hero.name, style: 'flex: 1;' }));
      row.appendChild(el('span', { class: cost === 0 ? 'text-dim' : 'text-warning', text: `${cost}g` }));

      row.onclick = () => {
        // Toggle this hero in the pending list
        const current = G.pendingInsurance || [];
        let updated;
        if (current.includes(hero.id)) {
          // Uninsure — refund cost
          updated = current.filter(id => id !== hero.id);
          G.gold += cost;
        } else {
          // Insure — check gold
          if (G.gold < cost) {
            toast(`Need ${cost}g to insure ${hero.name}`, 'danger');
            return;
          }
          G.gold -= cost;
          updated = [...current, hero.id];
        }
        G.pendingInsurance = updated.length > 0 ? updated : null;
        saveGame();
        renderActiveTab();
        renderHUD();
      };
      insSection.appendChild(row);
    }

    // Summary + bulk buttons
    if (pending.length > 0) {
      insSection.appendChild(el('div', { class: 'text-success', text: `${pending.length} hero${pending.length > 1 ? 'es' : ''} insured · ${totalCost}g paid`, style: 'font-size: 11px; font-weight: 600; margin-top: 4px;' }));
    }
    const btnRow = el('div', { style: 'display: flex; gap: 4px; margin-top: 4px;' });
    btnRow.appendChild(btn('Insure All', 'btn-sm', () => {
      const current = G.pendingInsurance || [];
      const toInsure = partyHeroes.filter(h => !current.includes(h.id));
      const cost = toInsure.reduce((s, h) => s + getInsuranceCost(h), 0);
      if (G.gold < cost) { toast(`Need ${cost}g`, 'danger'); return; }
      G.gold -= cost;
      G.pendingInsurance = [...current, ...toInsure.map(h => h.id)];
      saveGame();
      renderActiveTab();
      renderHUD();
      toast(`Insured ${toInsure.length} heroes for ${cost}g`, 'success');
    }));
    if (pending.length > 0) {
      btnRow.appendChild(btn('Clear All', 'btn-sm', () => {
        // Refund all
        let refund = 0;
        for (const hid of pending) {
          const h = getHero(hid);
          if (h) refund += getInsuranceCost(h);
        }
        G.gold += refund;
        G.pendingInsurance = null;
        saveGame();
        renderActiveTab();
        renderHUD();
        toast(`Refunded ${refund}g`, 'info');
      }));
    }
    insSection.appendChild(btnRow);
    container.appendChild(insSection);
  }

  // Zone selection
  container.appendChild(el('div', { class: 'text-dim', text: 'Select Zone', style: 'font-weight: 600; margin-bottom: 4px;' }));
  for (const zone of ZONES) {
    const avgLevel = G.heroes.length > 0
      ? Math.round(G.heroes.reduce((s, h) => s + h.level, 0) / G.heroes.length)
      : 1;
    const inRange = avgLevel >= zone.levelRange[0];

    const zoneCard = el('div', { class: `zone-card ${!inRange ? '' : ''}`, style: !inRange ? 'opacity: 0.5;' : '' });
    zoneCard.appendChild(el('div', { class: 'zone-name', text: `${zone.icon} ${zone.name}` }));
    zoneCard.appendChild(el('div', { class: 'zone-level', text: `Level ${zone.levelRange[0]}-${zone.levelRange[1]} | ${zone.energyCost} energy` }));
    zoneCard.appendChild(el('div', { class: 'zone-desc', text: zone.desc }));

    // Bestiary button always available
    zoneCard.appendChild(btn('View Enemies', 'btn-sm', () => showBestiary(zone)));

    if (inRange && G.raidParty.length > 0) {
      zoneCard.appendChild(btn('Deploy', 'btn-primary btn-sm', () => {
        const raid = startRaid(zone.id);
        if (raid) {
          setNavVisible(false);
          renderActiveTab();
          renderHUD();
        } else {
          toast('Not enough energy!', 'danger');
        }
      }));
      zoneCard.style.cursor = 'pointer';
    }

    container.appendChild(zoneCard);
  }

  return container;
}

// Bestiary screen — shows all enemies in a zone with stats and weaknesses
function showBestiary(zone) {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });

  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { class: 'text-bright', text: `${zone.icon} ${zone.name} Bestiary`, style: 'font-size: 18px; font-weight: 700;' }),
    el('div', { class: 'text-dim', text: zone.desc, style: 'font-size: 11px; margin-top: 4px;' }),
  ]));

  const allEnemies = [...zone.enemies, ...(zone.elites || [])];
  for (const enemyId of allEnemies) {
    const template = ENEMIES[enemyId];
    if (!template) continue;

    const card = el('div', { class: `card ${template.elite ? 'rarity-epic' : ''}`, style: 'margin-bottom: 8px; padding: 10px;' });

    card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 6px;' }, [
      el('span', { text: template.icon, style: 'font-size: 22px;' }),
      el('div', { style: 'flex: 1;' }, [
        el('div', { class: 'text-bright', text: template.name, style: 'font-weight: 700;' }),
        el('div', { class: 'text-dim', text: [
          template.elite ? 'ELITE' : '',
          ...(template.tags || []),
        ].filter(Boolean).join(' \u00B7 '), style: 'font-size: 10px;' }),
      ]),
    ]));

    // Stats row
    const statsDiv = el('div', { style: 'display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;' });
    statsDiv.appendChild(el('span', { class: 'text-dim', text: `HP ${template.hp}`, style: 'font-size: 10px;' }));
    statsDiv.appendChild(el('span', { class: 'text-dim', text: `Armor ${template.armor}`, style: 'font-size: 10px;' }));
    statsDiv.appendChild(el('span', { class: 'text-dim', text: `MR ${template.mr}`, style: 'font-size: 10px;' }));
    statsDiv.appendChild(el('span', { class: 'text-dim', text: `Acc ${template.acc}`, style: 'font-size: 10px;' }));
    statsDiv.appendChild(el('span', { class: 'text-dim', text: `Dmg ${template.dmg[0]}-${template.dmg[1]}`, style: 'font-size: 10px;' }));
    statsDiv.appendChild(el('span', { class: 'text-dim', text: `XP ${template.xp}`, style: 'font-size: 10px;' }));
    card.appendChild(statsDiv);

    // Damage type
    if (template.damageType) {
      card.appendChild(el('div', { class: 'text-warning', text: `Deals ${template.damageType} damage`, style: 'font-size: 11px; font-weight: 600;' }));
    }

    // Weaknesses
    if (template.weakTo && template.weakTo.length > 0) {
      const row = el('div', { style: 'display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;' });
      row.appendChild(el('span', { class: 'text-success', text: 'Weak:', style: 'font-size: 10px; font-weight: 700;' }));
      for (const w of template.weakTo) {
        row.appendChild(el('span', { class: 'text-success', text: w, style: 'font-size: 10px; background: rgba(46,204,113,0.1); padding: 1px 4px; border-radius: 3px;' }));
      }
      card.appendChild(row);
    }

    // Resistances
    if (template.resistTo && template.resistTo.length > 0) {
      const row = el('div', { style: 'display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;' });
      row.appendChild(el('span', { class: 'text-danger', text: 'Resist:', style: 'font-size: 10px; font-weight: 700;' }));
      for (const r of template.resistTo) {
        row.appendChild(el('span', { class: 'text-danger', text: r, style: 'font-size: 10px; background: rgba(231,76,60,0.1); padding: 1px 4px; border-radius: 3px;' }));
      }
      card.appendChild(row);
    }

    screen.appendChild(card);
  }

  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

function togglePartyMember(heroId) {
  const idx = G.raidParty.indexOf(heroId);
  if (idx >= 0) {
    G.raidParty.splice(idx, 1);
  } else if (G.raidParty.length < 4) {
    G.raidParty.push(heroId);
  } else {
    toast('Party is full (max 4)', 'warning');
    return;
  }
  saveGame();
  renderActiveTab();
}

// === Exploring ===
function renderExploring(container, raid) {
  // Corruption bar
  container.appendChild(corruptionBar(raid.corruption, raid.corruptionLevel));

  // Path overview
  container.appendChild(renderPathOverview(raid));

  // Path map
  const pathEl = renderPath(raid, (nodeId) => {
    const encounter = stepToNode(raid, nodeId);
    if (encounter) {
      saveGame();
      renderActiveTab();
      renderHUD();
    }
  });
  container.appendChild(pathEl);

  // Available nodes
  const available = getAvailableNodes(raid);
  if (available.length === 0) {
    container.appendChild(el('p', { class: 'text-warning', text: 'Dead end! You must extract or go back.' }));
  }

  // Party status with inventory
  container.appendChild(el('div', { class: 'divider' }));
  container.appendChild(el('div', { class: 'text-dim', text: 'Party', style: 'font-weight: 600; margin-bottom: 4px;' }));
  for (const heroId of raid.party) {
    const hero = getHero(heroId);
    if (!hero) continue;
    const cls = CLASSES[hero.classId];
    const used = usedInvQuick(hero);

    const cardEl = heroCard(hero);

    // Show inventory items
    if (hero.inventory.length > 0) {
      const invDiv = el('div', { style: 'margin-top: 6px;' });
      invDiv.appendChild(el('div', { class: 'text-dim', text: `Backpack (${used}/${hero.inventoryCapacity}u)`, style: 'font-size: 10px; font-weight: 600; margin-bottom: 3px;' }));
      const itemRow = el('div', { style: 'display: flex; flex-wrap: wrap; gap: 3px;' });
      for (const item of hero.inventory) {
        const pill = el('span', {
          class: `rarity-text-${item.rarity || 'common'}`,
          text: `${item.icon} ${item.name}`,
          style: 'font-size: 10px; background: var(--bg-dark); padding: 2px 5px; border-radius: 4px; white-space: nowrap;',
        });
        itemRow.appendChild(pill);
      }
      invDiv.appendChild(itemRow);
      cardEl.appendChild(invDiv);
    }

    // Quick heal button + Equip + Items
    const actionRow = el('div', { style: 'margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;' });

    // Quick consume: show heal button if hero is hurt and has a health potion
    if (hero.alive && hero.hp < hero.maxHp) {
      const healPotion = hero.inventory.find(i => i.isConsumable && i.effect === 'heal');
      if (healPotion) {
        actionRow.appendChild(btn(`\u2764\uFE0F Heal`, 'btn-sm btn-success', () => {
          hero.hp = Math.min(hero.maxHp, hero.hp + healPotion.value);
          const idx = hero.inventory.findIndex(i => i.id === healPotion.id);
          if (idx >= 0) hero.inventory.splice(idx, 1);
          saveGame();
          toast(`${hero.name} healed ${healPotion.value} HP`, 'success');
          renderActiveTab();
        }));
      }
    }
    if (hero.alive && hero.mp < hero.maxMp) {
      const manaPotion = hero.inventory.find(i => i.isConsumable && i.effect === 'mana');
      if (manaPotion) {
        actionRow.appendChild(btn(`\uD83D\uDCA7 Mana`, 'btn-sm', () => {
          hero.mp = Math.min(hero.maxMp, hero.mp + manaPotion.value);
          const idx = hero.inventory.findIndex(i => i.id === manaPotion.id);
          if (idx >= 0) hero.inventory.splice(idx, 1);
          saveGame();
          toast(`${hero.name} restored ${manaPotion.value} MP`, 'success');
          renderActiveTab();
        }));
      }
    }

    actionRow.appendChild(btn('\uD83D\uDEE1\uFE0F Equip', 'btn-sm', () => {
      showRaidEquipScreen(hero, raid);
    }));
    const consumables = hero.inventory.filter(i => i.isConsumable);
    if (consumables.length > 0) {
      actionRow.appendChild(btn(`\uD83C\uDF1F Items (${consumables.length})`, 'btn-sm', () => {
        showRaidUseItemScreen(hero, raid);
      }));
    }
    cardEl.appendChild(actionRow);

    container.appendChild(cardEl);
  }

  // Trade button (only if 2+ alive heroes)
  const aliveHeroes = raid.party.map(id => getHero(id)).filter(h => h && h.alive);
  if (aliveHeroes.length >= 2) {
    container.appendChild(btn('\uD83D\uDD04 Trade Items', 'btn-block btn-sm', () => {
      showTradeMenu(container, raid);
    }));
  }

  // Abandon raid button
  container.appendChild(el('div', { class: 'divider' }));
  container.appendChild(btn('Abandon Raid (lose all items)', 'btn-danger btn-block btn-sm', () => {
    if (confirm('Abandon raid? You will lose ALL carried items and equipped gear.')) {
      endRaidFailed(raid);
    }
  }));

  return container;
}

// === Non-Combat Encounter ===
function renderEncounter(container, raid) {
  const enc = raid.encounter;
  if (!enc) return renderExploring(container, raid);

  // First-time encounter type tips
  if (enc.type === 'chest') showContextTip('first_chest', 'Chests', 'Chests give gold and items. Pick which hero carries each item — items drop if that hero dies.');
  if (enc.type === 'trap') showContextTip('first_trap', 'Traps', 'Traps damage your party. Heroes with high WIS can spot them and avoid damage.');
  if (enc.type === 'shrine') showContextTip('first_shrine', 'Shrines', 'Shrines grant free buffs, heals, or gold. Always step on them — they have no downside.');
  if (enc.type === 'merchant') showContextTip('first_merchant', 'Merchants', "Merchants sell items for gold. You can't come back once you continue, so buy what you need.");
  if (enc.type === 'event') showContextTip('first_event', 'Events', 'Events offer a choice between safe and risky options. Risky choices can backfire but often pay more.');
  if (enc.type === 'extraction') showContextTip('first_extract', 'Extraction Point', 'Extract now to keep everything! Or push deeper for more loot — but every step increases danger.');

  // Encounter card
  const encCard = el('div', { class: 'encounter-card' });
  encCard.appendChild(el('div', { class: 'encounter-icon', text: enc.icon }));
  encCard.appendChild(el('div', { class: 'encounter-title', text: enc.title }));
  encCard.appendChild(el('div', { class: 'encounter-desc', text: enc.desc }));

  // Actions based on type
  const actions = el('div', { class: 'encounter-actions' });

  switch (enc.type) {
    case 'chest': {
      const result = resolveEncounter(raid);
      if (result && result.items) {
        encCard.appendChild(el('div', { class: 'text-success', text: `+${result.gold} gold`, style: 'font-weight: 700; margin-bottom: 8px;' }));
        const lootDiv = el('div', { class: 'loot-items' });
        for (const item of result.items) {
          const lootRow = el('div', { class: 'loot-item' }, [
            el('div', { class: 'loot-item-info' }, [
              el('span', { text: item.icon }),
              el('span', { class: `rarity-text-${item.rarity}`, text: item.name, style: 'font-size: 12px;' }),
              el('span', { class: 'loot-item-size', text: `${item.size}u` }),
            ]),
          ]);

          // Pick up buttons for each hero
          for (const heroId of raid.party) {
            const hero = getHero(heroId);
            if (hero && hero.alive && canCarry(hero, item)) {
              const pickBtn = btn(`\uD83C\uDF92 ${hero.name}`, 'btn-sm', () => {
                hero.inventory.push(item);
                const itemIdx = result.items.indexOf(item);
                if (itemIdx >= 0) result.items.splice(itemIdx, 1);
                raid.itemsCollected.push(item);
                saveGame();
                renderActiveTab();
                toast(`${hero.name} picked up ${item.name}`, 'success');
              });
              lootRow.appendChild(pickBtn);
            }
          }

          lootDiv.appendChild(lootRow);
        }
        encCard.appendChild(lootDiv);
      }
      actions.appendChild(btn('Continue', 'btn-primary btn-block', () => continueExploring(raid)));
      break;
    }

    case 'trap': {
      const result = resolveEncounter(raid);
      if (result) {
        for (const r of result.results) {
          encCard.appendChild(el('p', { text: r, style: 'font-size: 13px; margin-top: 4px;' }));
        }
      }
      if (isPartyWiped(raid)) {
        actions.appendChild(btn('Party Wiped...', 'btn-danger btn-block', () => {
          endRaidFailed(raid);
        }));
      } else {
        actions.appendChild(btn('Continue', 'btn-primary btn-block', () => continueExploring(raid)));
      }
      break;
    }

    case 'shrine': {
      const result = resolveEncounter(raid);
      if (result) {
        for (const r of result.results) {
          encCard.appendChild(el('p', { class: 'text-success', text: r, style: 'font-size: 13px; margin-top: 4px;' }));
        }
      }
      actions.appendChild(btn('Continue', 'btn-primary btn-block', () => continueExploring(raid)));
      break;
    }

    case 'event': {
      if (enc.choices) {
        for (let i = 0; i < enc.choices.length; i++) {
          const choice = enc.choices[i];
          actions.appendChild(btn(choice.label, 'btn-block', () => {
            const result = resolveEncounter(raid, i);
            if (result) {
              // Show result and then continue
              raid.encounter = { ...enc, type: 'event_result', resultText: result.results[0], items: result.items || [] };
              raid.phase = RAID_PHASE.ENCOUNTER;
              renderActiveTab();
            }
          }));
        }
      }
      break;
    }

    case 'event_result': {
      encCard.appendChild(el('p', { text: enc.resultText, style: 'font-size: 13px; margin-top: 8px;' }));
      if (enc.items && enc.items.length > 0) {
        for (const item of enc.items) {
          const lootRow = el('div', { class: 'loot-item' }, [
            el('div', { class: 'loot-item-info' }, [
              el('span', { text: item.icon }),
              el('span', { class: `rarity-text-${item.rarity}`, text: item.name }),
            ]),
          ]);
          for (const heroId of raid.party) {
            const hero = getHero(heroId);
            if (hero && hero.alive && canCarry(hero, item)) {
              lootRow.appendChild(btn(`\uD83C\uDF92 ${hero.name}`, 'btn-sm', () => {
                hero.inventory.push(item);
                saveGame();
                renderActiveTab();
                toast(`${hero.name} picked up ${item.name}`, 'success');
              }));
            }
          }
          encCard.appendChild(lootRow);
        }
      }
      actions.appendChild(btn('Continue', 'btn-primary btn-block', () => continueExploring(raid)));
      break;
    }

    case 'merchant': {
      const items = enc.items || [];
      for (const item of items) {
        const row = el('div', { class: 'loot-item' }, [
          el('div', { class: 'loot-item-info' }, [
            el('span', { text: item.icon }),
            el('span', { class: `rarity-text-${item.rarity}`, text: item.name }),
          ]),
          el('span', { class: 'text-warning', text: `${item.price}g`, style: 'font-weight: 600;' }),
        ]);
        if (G.gold >= item.price) {
          row.appendChild(btn('Buy', 'btn-sm btn-success', () => {
            G.gold -= item.price;
            // Add to first hero with space
            for (const heroId of raid.party) {
              const hero = getHero(heroId);
              if (hero && hero.alive && canCarry(hero, item)) {
                hero.inventory.push(item);
                toast(`${hero.name} bought ${item.name}`, 'success');
                break;
              }
            }
            const idx = items.indexOf(item);
            if (idx >= 0) items.splice(idx, 1);
            saveGame();
            renderActiveTab();
            renderHUD();
          }));
        }
        encCard.appendChild(row);
      }
      actions.appendChild(btn('Leave', 'btn-block', () => continueExploring(raid)));
      break;
    }

    case 'empty':
    case 'start':
    default:
      actions.appendChild(btn('Continue', 'btn-primary btn-block', () => continueExploring(raid)));
      break;
  }

  encCard.appendChild(actions);
  container.appendChild(encCard);

  return container;
}

function continueExploring(raid) {
  raid.phase = RAID_PHASE.EXPLORING;
  raid.encounter = null;
  renderActiveTab();
}

// === Combat ===
function renderCombat(container, raid) {
  const combat = raid.combat;
  if (!combat) return renderExploring(container, raid);

  // First-time combat tip
  showContextTip('first_combat', 'Combat Basics',
    'Check enemy weaknesses (Weak/Resist tags on their cards). Holy damage wrecks undead, fire burns beasts. Use abilities to exploit weaknesses for bonus damage.');

  // Check combat state
  if (combat.state === 'victory') {
    return renderCombatVictory(container, raid);
  }
  if (combat.state === 'defeat') {
    return renderCombatDefeat(container, raid);
  }
  if (combat.state === 'fled') {
    return renderCombatFled(container, raid);
  }

  container.appendChild(el('div', { class: 'section-title', text: `Combat - Round ${combat.round}` }));

  // Combat layout
  const sides = el('div', { class: 'combat-sides' });

  // Party side
  const partyDiv = el('div', { class: 'combat-party' });
  partyDiv.appendChild(el('div', { class: 'text-dim', text: 'Party', style: 'font-size: 11px; font-weight: 600; margin-bottom: 4px;' }));
  for (const hero of combat.party) {
    const current = getCurrentCombatant(combat);
    const isTurn = current && current.id === hero.id;
    const c = heroCard(hero);
    if (isTurn) c.classList.add('active-turn');
    partyDiv.appendChild(c);
  }
  sides.appendChild(partyDiv);

  sides.appendChild(el('div', { class: 'combat-vs', text: 'VS' }));

  // Enemy side
  const enemyDiv = el('div', { class: 'combat-enemies' });
  enemyDiv.appendChild(el('div', { class: 'text-dim', text: 'Enemies', style: 'font-size: 11px; font-weight: 600; margin-bottom: 4px;' }));
  for (const enemy of combat.enemies) {
    const current = getCurrentCombatant(combat);
    const isTurn = current && current.id === enemy.id;
    const c = enemyCard(enemy);
    if (isTurn) c.classList.add('active-turn');
    enemyDiv.appendChild(c);
  }
  sides.appendChild(enemyDiv);

  container.appendChild(sides);

  // Current turn actions
  const current = getCurrentCombatant(combat);
  if (current && current.type === 'hero') {
    if (current.entity.autoBattle) {
      // Auto-battle hero — resolve automatically
      container.appendChild(el('p', { class: 'text-accent', text: `${current.entity.name} (auto: ${current.entity.autoBattle})...`, style: 'text-align: center; margin: 8px 0;' }));
      setTimeout(() => {
        if (current.entity.alive) {
          heroAutoBattle(combat, current.entity);
        }
        nextTurn(combat);
        saveGame();
        renderActiveTab();
      }, 400);
    } else {
      container.appendChild(renderHeroActions(raid, combat, current.entity));
    }
  } else if (current && current.type === 'enemy') {
    // Enemy turn — auto-resolve
    container.appendChild(el('p', { class: 'text-warning', text: `${current.entity.name}'s turn...`, style: 'text-align: center; margin: 8px 0;' }));
    setTimeout(() => {
      if (current.entity.alive) {
        enemyAI(combat, current.entity);
      }
      nextTurn(combat);
      saveGame();
      renderActiveTab();
    }, 800);
  }

  // Combat log
  if (combat.log.length > 0) {
    const log = el('div', { class: 'combat-log' });
    const recentLogs = combat.log.slice(-8);
    for (const entry of recentLogs) {
      log.appendChild(el('div', { class: `combat-log-entry ${entry.class}`, text: entry.text }));
    }
    container.appendChild(log);
    // Scroll log to bottom
    setTimeout(() => log.scrollTop = log.scrollHeight, 0);
  }

  // Flush floating damage number events after DOM is attached
  if (combat.events && combat.events.length > 0) {
    const events = [...combat.events];
    combat.events = [];
    setTimeout(() => {
      for (const ev of events) {
        showDamageNumber(ev.targetId, ev.amount || 0, ev.type);
      }
    }, 50);
  }

  return container;
}

function renderHeroActions(raid, combat, hero) {
  const actions = el('div', { class: 'combat-actions' });

  actions.appendChild(el('div', { class: 'text-bright', text: `${hero.name}'s Turn`, style: 'font-weight: 700; text-align: center; margin-bottom: 4px;' }));

  // Attack — pick target
  actions.appendChild(el('div', { class: 'text-dim', text: 'Attack:', style: 'font-size: 11px; font-weight: 600; margin-bottom: 2px;' }));
  for (const enemy of combat.enemies.filter(e => e.alive)) {
    const preview = previewAttack(hero, enemy, true);
    const atkBtn = el('button', { class: 'combat-action-btn' });
    atkBtn.appendChild(el('span', { text: `${enemy.icon} ${enemy.name}` }));
    atkBtn.appendChild(el('span', { class: 'hit-chance', text: `${preview.hitChance}% hit | ${preview.critChance}% crit` }));
    atkBtn.onclick = () => {
      attackAction(combat, hero, enemy);
      nextTurn(combat);
      saveGame();
      renderActiveTab();
    };
    actions.appendChild(atkBtn);
  }

  // Class abilities — with target selection for single-target
  const cls = CLASSES[hero.classId];
  actions.appendChild(el('div', { class: 'text-dim', text: 'Abilities:', style: 'font-size: 11px; font-weight: 600; margin-top: 6px; margin-bottom: 2px;' }));
  const abilRow = el('div', { class: 'combat-action-row' });
  for (const ability of cls.abilities) {
    if (hero.level < ability.level) continue;
    const onCooldown = hero.abilityCooldowns[ability.id] > 0;
    const noMp = hero.mp < ability.mpCost;

    const abilBtn = el('button', { class: 'combat-action-btn' });
    abilBtn.appendChild(el('span', { text: ability.name }));
    abilBtn.appendChild(el('span', { class: 'hit-chance', text: `${ability.mpCost} MP${onCooldown ? ' (CD)' : ''}` }));

    if (onCooldown || noMp) {
      abilBtn.disabled = true;
    } else {
      abilBtn.onclick = () => {
        // Replace action panel with target selection
        showAbilityTargetScreen(raid, combat, hero, ability);
      };
    }
    abilRow.appendChild(abilBtn);
  }
  actions.appendChild(abilRow);

  // Items & Flee
  const utilRow = el('div', { class: 'combat-action-row', style: 'margin-top: 6px;' });

  // Item use — show list of consumables
  const consumables = hero.inventory.filter(i => i.isConsumable);
  if (consumables.length > 0) {
    const itemBtn = el('button', { class: 'combat-action-btn' });
    itemBtn.textContent = `\uD83C\uDF1F Items (${consumables.length})`;
    itemBtn.onclick = () => showItemPicker(actions, combat, hero, raid);
    utilRow.appendChild(itemBtn);
  }

  // Equip — manage gear mid-raid
  const gearItems = hero.inventory.filter(i => i.slot && !i.isConsumable);
  const equipBtn = el('button', { class: 'combat-action-btn' });
  equipBtn.textContent = `\uD83D\uDEE1\uFE0F Equip${gearItems.length ? ` (${gearItems.length})` : ''}`;
  equipBtn.onclick = () => showRaidEquipScreen(hero, raid);
  utilRow.appendChild(equipBtn);

  // Flee
  const fleeBtn = el('button', { class: 'combat-action-btn' });
  fleeBtn.textContent = '\uD83C\uDFC3 Flee';
  fleeBtn.onclick = () => {
    fleeAction(combat);
    if (combat.state === 'fled') {
      raid.phase = RAID_PHASE.EXPLORING;
      raid.combat = null;
    } else {
      nextTurn(combat);
    }
    saveGame();
    renderActiveTab();
  };
  utilRow.appendChild(fleeBtn);

  actions.appendChild(utilRow);

  // Auto-battle toggle
  const autoRow = el('div', { style: 'display: flex; gap: 4px; margin-top: 6px; justify-content: center;' });
  autoRow.appendChild(el('span', { class: 'text-dim', text: 'Auto:', style: 'font-size: 10px; align-self: center;' }));
  const modes = [
    { id: null, label: 'Manual' },
    { id: 'aggressive', label: 'Aggr' },
    { id: 'defensive', label: 'Def' },
    { id: 'supportive', label: 'Supp' },
  ];
  for (const mode of modes) {
    const active = hero.autoBattle === mode.id;
    const modeBtn = el('button', {
      class: `btn-sm ${active ? 'btn-primary' : ''}`,
      text: mode.label,
      style: `font-size: 10px; padding: 3px 8px; ${active ? '' : 'opacity: 0.6;'}`,
    });
    modeBtn.onclick = () => {
      hero.autoBattle = mode.id;
      saveGame();
      renderActiveTab();
    };
    autoRow.appendChild(modeBtn);
  }
  actions.appendChild(autoRow);

  return actions;
}

// Full-screen ability target selection
function showAbilityTargetScreen(raid, combat, hero, ability) {
  // Clear the content area and show target selection
  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });

  // Header
  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { class: 'text-bright', text: ability.name, style: 'font-size: 18px; font-weight: 700;' }),
    el('div', { class: 'text-dim', text: ability.desc, style: 'font-size: 12px; margin-top: 4px;' }),
    el('div', { class: 'text-accent', text: `${ability.mpCost} MP | ${ability.aoe ? 'Hits all enemies' : 'Single target'}`, style: 'font-size: 11px; margin-top: 4px;' }),
  ]));

  if (ability.healAlly && !ability.aoe) {
    // Single-target heal — target an ally
    screen.appendChild(el('div', { class: 'text-dim', text: 'Pick an ally to heal:', style: 'font-weight: 600; margin-bottom: 4px;' }));

    for (const ally of combat.party.filter(h => h.alive)) {
      const healAmt = Math.round(ally.maxHp * ability.healPct / 100);
      const tBtn = el('div', { class: 'combatant-card', style: 'cursor: pointer; margin-bottom: 6px;' });
      const cls = CLASSES[ally.classId];
      tBtn.appendChild(el('div', { class: 'combatant-header' }, [
        el('span', { class: 'combatant-icon', text: cls.icon }),
        el('div', { class: 'combatant-info' }, [
          el('span', { class: 'combatant-name', text: ally.name }),
          el('span', { class: 'combatant-class', text: `HP: ${ally.hp}/${ally.maxHp}` }),
        ]),
        el('span', { class: 'text-success', text: `+${healAmt} HP`, style: 'font-size: 11px;' }),
      ]));
      tBtn.appendChild(progressBar(ally.hp, ally.maxHp, 'hp', false));
      tBtn.onclick = () => {
        abilityAction(combat, hero, ability.id, ally);
        nextTurn(combat);
        saveGame();
        renderActiveTab();
      };
      screen.appendChild(tBtn);
    }
  } else if (ability.aoe) {
    // AoE — confirm or back
    const aoeText = ability.healAlly ? 'This ability heals all allies.' : 'This ability hits all enemies.';
    screen.appendChild(el('div', { class: 'text-dim', text: aoeText, style: 'text-align: center; margin: 8px 0;' }));
    screen.appendChild(btn('Confirm', 'btn-primary btn-block btn-lg', () => {
      abilityAction(combat, hero, ability.id, null);
      nextTurn(combat);
      saveGame();
      renderActiveTab();
    }));
  } else {
    // Single target — show enemy list
    screen.appendChild(el('div', { class: 'text-dim', text: 'Pick a target:', style: 'font-weight: 600; margin-bottom: 4px;' }));

    for (const enemy of combat.enemies.filter(e => e.alive)) {
      const preview = previewAttack(hero, enemy, true);
      const tBtn = el('div', { class: 'combatant-card', style: 'cursor: pointer; margin-bottom: 6px;' });
      tBtn.appendChild(el('div', { class: 'combatant-header' }, [
        el('span', { class: 'combatant-icon', text: enemy.icon }),
        el('div', { class: 'combatant-info' }, [
          el('span', { class: 'combatant-name', text: enemy.name }),
          el('span', { class: 'combatant-class', text: `HP: ${enemy.hp}/${enemy.maxHp}` }),
        ]),
        el('span', { class: 'text-dim', text: `${preview.hitChance}% hit`, style: 'font-size: 11px;' }),
      ]));
      tBtn.appendChild(progressBar(enemy.hp, enemy.maxHp, 'hp', false));
      tBtn.onclick = () => {
        abilityAction(combat, hero, ability.id, enemy);
        nextTurn(combat);
        saveGame();
        renderActiveTab();
      };
      screen.appendChild(tBtn);
    }
  }

  // Back button
  screen.appendChild(el('div', { style: 'margin-top: 8px;' }, [
    btn('\u2190 Back', 'btn-block', () => renderActiveTab()),
  ]));

  content.appendChild(screen);
}

// Throwable target selection screen
function showThrowTargetScreen(raid, combat, hero, item) {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });

  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { class: 'text-bright', text: `${item.icon} ${item.name}`, style: 'font-size: 18px; font-weight: 700;' }),
    el('div', { class: 'text-dim', text: item.desc || '', style: 'font-size: 12px; margin-top: 4px;' }),
  ]));

  screen.appendChild(el('div', { class: 'text-dim', text: 'Pick a target:', style: 'font-weight: 600; margin-bottom: 4px;' }));

  for (const enemy of combat.enemies.filter(e => e.alive)) {
    const tBtn = el('div', { class: 'combatant-card', style: 'cursor: pointer; margin-bottom: 6px;' });
    tBtn.appendChild(el('div', { class: 'combatant-header' }, [
      el('span', { class: 'combatant-icon', text: enemy.icon }),
      el('div', { class: 'combatant-info' }, [
        el('span', { class: 'combatant-name', text: enemy.name }),
        el('span', { class: 'combatant-class', text: `HP: ${enemy.hp}/${enemy.maxHp}` }),
      ]),
    ]));
    tBtn.appendChild(progressBar(enemy.hp, enemy.maxHp, 'hp', false));
    tBtn.onclick = () => {
      useItemAction(combat, hero, item, null, enemy);
      nextTurn(combat);
      saveGame();
      renderActiveTab();
    };
    screen.appendChild(tBtn);
  }

  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

// Item picker during combat
function showItemPicker(parent, combat, hero, raid) {
  const old = parent.querySelector('.item-picker');
  if (old) old.remove();

  const picker = el('div', { class: 'item-picker card', style: 'margin-top: 6px;' });
  picker.appendChild(el('div', { class: 'text-bright', text: 'Use Item:', style: 'font-size: 12px; font-weight: 700; margin-bottom: 4px;' }));

  const consumables = hero.inventory.filter(i => i.isConsumable);
  for (const item of consumables) {
    const row = el('button', { class: 'combat-action-btn', style: 'text-align: left;' });
    row.appendChild(el('span', { text: `${item.icon} ${item.name}` }));
    row.appendChild(el('span', { class: 'hit-chance', text: item.desc }));
    const needsEnemyTarget = ['throw', 'throw_stun', 'throw_poison'].includes(item.effect);
    row.onclick = () => {
      if (item.effect === 'revive') {
        const dead = combat.party.filter(h => !h.alive);
        if (dead.length === 0) { toast('No one to revive', 'info'); return; }
        useItemAction(combat, hero, item, dead[0]);
        nextTurn(combat);
        saveGame();
        renderActiveTab();
      } else if (needsEnemyTarget) {
        // Open enemy target picker
        showThrowTargetScreen(raid, combat, hero, item);
      } else {
        useItemAction(combat, hero, item);
        nextTurn(combat);
        saveGame();
        renderActiveTab();
      }
    };
    picker.appendChild(row);
  }

  picker.appendChild(btn('Cancel', 'btn-sm', () => picker.remove()));
  parent.appendChild(picker);
}

// Full-screen equip screen during raid
function showRaidEquipScreen(hero, raid) {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });
  const cls = CLASSES[hero.classId];
  const used = usedInvQuick(hero);

  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { class: 'text-bright', text: `${cls.icon} ${hero.name} — Equipment`, style: 'font-size: 18px; font-weight: 700;' }),
    el('div', { class: 'text-dim', text: `Lv.${hero.level} ${cls.name} | ${used}/${hero.inventoryCapacity}u`, style: 'font-size: 12px; margin-top: 4px;' }),
  ]));

  // Current gear by slot
  const isTwoHanded = hero.gear.weapon && hero.gear.weapon.twoHanded;

  for (const slot of GEAR_SLOTS) {
    const equipped = hero.gear[slot];
    const available = hero.inventory.filter(i => i.slot === slot && !i.isConsumable);
    const blocked = slot === 'offhand' && isTwoHanded;

    const slotDiv = el('div', { class: 'card', style: 'margin-bottom: 6px; padding: 8px;' });
    const slotInfo = GEAR_SLOT_INFO[slot];

    if (equipped) {
      const equipRow = el('div', { class: 'flex gap-sm', style: 'align-items: center;' }, [
        el('span', { class: 'text-dim', text: slotInfo.name, style: 'font-size: 10px; font-weight: 700; width: 54px; text-transform: uppercase;' }),
        el('span', { text: equipped.icon }),
        el('span', { class: `rarity-text-${equipped.rarity}`, text: equipped.name, style: 'font-size: 12px; flex: 1;' }),
      ]);
      // Unequip button
      equipRow.appendChild(btn('Unequip', 'btn-sm', () => {
        hero.gear[slot] = null;
        hero.inventory.push(equipped);
        saveGame();
        showRaidEquipScreen(hero, raid);
        toast(`Unequipped ${equipped.name}`, 'info');
      }));
      slotDiv.appendChild(equipRow);
    } else if (blocked) {
      slotDiv.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; opacity: 0.4;' }, [
        el('span', { class: 'text-dim', text: slotInfo.name, style: 'font-size: 10px; font-weight: 700; width: 54px; text-transform: uppercase;' }),
        el('span', { class: 'text-dim', text: '(2-handed weapon equipped)', style: 'font-size: 11px;' }),
      ]));
    } else {
      slotDiv.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; opacity: 0.5;' }, [
        el('span', { class: 'text-dim', text: slotInfo.name, style: 'font-size: 10px; font-weight: 700; width: 54px; text-transform: uppercase;' }),
        el('span', { text: slotInfo.icon }),
        el('span', { class: 'text-dim', text: 'Empty', style: 'font-size: 11px;' }),
      ]));
    }

    // Show equippable items from backpack
    for (const item of available) {
      let meetsReqs = true;
      if (item.statReq) {
        for (const [stat, val] of Object.entries(item.statReq)) {
          if ((hero.stats[stat] || 0) < val) meetsReqs = false;
        }
      }

      const eqRow = el('div', { style: 'margin-top: 4px; margin-left: 54px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;' });
      eqRow.appendChild(el('span', { text: item.icon }));
      eqRow.appendChild(el('span', { class: `rarity-text-${item.rarity}`, text: item.name, style: 'font-size: 11px;' }));

      // Stat comparison vs currently equipped
      const compareDiv = el('span', { style: 'font-size: 10px; display: flex; gap: 4px; flex: 1;' });
      const diffs = compareItems(item, equipped);
      for (const d of diffs) {
        const color = d.val > 0 ? 'text-success' : d.val < 0 ? 'text-danger' : 'text-dim';
        const sign = d.val > 0 ? '+' : '';
        compareDiv.appendChild(el('span', { class: color, text: `${sign}${d.val} ${d.stat}` }));
      }
      eqRow.appendChild(compareDiv);

      if (meetsReqs) {
        eqRow.appendChild(btn('Equip', 'btn-sm btn-success', () => {
          const idx = hero.inventory.findIndex(i => i.id === item.id);
          if (idx >= 0) hero.inventory.splice(idx, 1);
          if (hero.gear[slot]) hero.inventory.push(hero.gear[slot]);
          hero.gear[slot] = item;
          saveGame();
          showRaidEquipScreen(hero, raid);
          toast(`Equipped ${item.name}`, 'success');
        }));
      } else {
        eqRow.appendChild(el('span', { class: 'text-danger', text: 'Req not met', style: 'font-size: 10px;' }));
      }
      slotDiv.appendChild(eqRow);
    }

    // Only show slots that have something equipped or something available
    if (equipped || available.length > 0 || blocked) {
      screen.appendChild(slotDiv);
    }
  }

  // Back button
  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

// Full-screen item use during exploration
function showRaidUseItemScreen(hero, raid) {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });
  const cls = CLASSES[hero.classId];

  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { class: 'text-bright', text: `${cls.icon} ${hero.name} — Use Item`, style: 'font-size: 18px; font-weight: 700;' }),
    el('div', { class: 'text-dim', text: `HP: ${hero.hp}/${hero.maxHp} | MP: ${hero.mp}/${hero.maxMp}`, style: 'font-size: 12px; margin-top: 4px;' }),
  ]));

  const consumables = hero.inventory.filter(i => i.isConsumable);
  if (consumables.length === 0) {
    screen.appendChild(el('p', { class: 'text-dim', text: 'No usable items.' }));
  } else {
    for (const item of consumables) {
      const row = el('div', { class: 'card', style: 'padding: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;' });
      row.appendChild(el('span', { text: item.icon, style: 'font-size: 22px;' }));
      row.appendChild(el('div', { style: 'flex: 1;' }, [
        el('div', { class: 'text-bright', text: item.name, style: 'font-size: 13px; font-weight: 600;' }),
        el('div', { class: 'text-dim', text: item.desc, style: 'font-size: 11px;' }),
      ]));

      if (item.effect === 'heal' && hero.hp < hero.maxHp) {
        row.appendChild(btn('Use', 'btn-sm btn-success', () => {
          hero.hp = Math.min(hero.maxHp, hero.hp + item.value);
          const idx = hero.inventory.findIndex(i => i.id === item.id);
          if (idx >= 0) hero.inventory.splice(idx, 1);
          saveGame();
          toast(`${hero.name} healed ${item.value} HP`, 'success');
          showRaidUseItemScreen(hero, raid);
        }));
      } else if (item.effect === 'mana' && hero.mp < hero.maxMp) {
        row.appendChild(btn('Use', 'btn-sm btn-success', () => {
          hero.mp = Math.min(hero.maxMp, hero.mp + item.value);
          const idx = hero.inventory.findIndex(i => i.id === item.id);
          if (idx >= 0) hero.inventory.splice(idx, 1);
          saveGame();
          toast(`${hero.name} restored ${item.value} MP`, 'success');
          showRaidUseItemScreen(hero, raid);
        }));
      } else if (item.effect === 'cure') {
        row.appendChild(btn('Use', 'btn-sm btn-success', () => {
          hero.dots = [];
          const idx = hero.inventory.findIndex(i => i.id === item.id);
          if (idx >= 0) hero.inventory.splice(idx, 1);
          saveGame();
          toast(`${hero.name} cured!`, 'success');
          showRaidUseItemScreen(hero, raid);
        }));
      } else {
        row.appendChild(el('span', { class: 'text-dim', text: 'N/A', style: 'font-size: 10px;' }));
      }

      screen.appendChild(row);
    }
  }

  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

// Old inline equip menu kept for combat use
function showRaidEquipMenu(parent, hero, raid) {
  const old = parent.querySelector('.equip-picker');
  if (old) old.remove();

  const picker = el('div', { class: 'equip-picker card', style: 'margin-top: 6px;' });
  picker.appendChild(el('div', { class: 'text-bright', text: `${hero.name} — Equipment`, style: 'font-size: 12px; font-weight: 700; margin-bottom: 4px;' }));

  for (const slot of GEAR_SLOTS) {
    const equipped = hero.gear[slot];
    const available = hero.inventory.filter(i => i.slot === slot && !i.isConsumable);

    const row = el('div', { style: 'margin-bottom: 6px;' });
    row.appendChild(el('div', { class: 'text-dim', text: slot.toUpperCase(), style: 'font-size: 10px; font-weight: 700;' }));

    if (equipped) {
      row.appendChild(el('div', { class: 'text-dim', text: `  Equipped: ${equipped.icon} ${equipped.name}`, style: 'font-size: 11px;' }));
    }

    for (const item of available) {
      let meetsReqs = true;
      if (item.statReq) {
        for (const [stat, val] of Object.entries(item.statReq)) {
          if ((hero.stats[stat] || 0) < val) meetsReqs = false;
        }
      }
      if (!meetsReqs) continue;

      const eqBtn = el('button', { class: 'combat-action-btn', style: 'text-align: left;' });
      eqBtn.appendChild(el('span', { text: `${item.icon} Equip ${item.name}`, class: `rarity-text-${item.rarity}` }));
      eqBtn.onclick = () => {
        const idx = hero.inventory.findIndex(i => i.id === item.id);
        if (idx >= 0) hero.inventory.splice(idx, 1);
        if (hero.gear[slot]) hero.inventory.push(hero.gear[slot]);
        hero.gear[slot] = item;
        saveGame();
        renderActiveTab();
        toast(`Equipped ${item.name}`, 'success');
      };
      row.appendChild(eqBtn);
    }

    if (equipped || available.length > 0) picker.appendChild(row);
  }

  picker.appendChild(btn('Close', 'btn-sm', () => picker.remove()));
  parent.appendChild(picker);
}

// Trade menu — pick a hero, then pick items to transfer
function showTradeMenu(container, raid) {
  const old = container.querySelector('.trade-menu');
  if (old) { old.remove(); return; }

  const menu = el('div', { class: 'trade-menu card', style: 'margin-top: 8px;' });
  menu.appendChild(el('div', { class: 'text-bright', text: 'Trade — Select Hero', style: 'font-weight: 700; margin-bottom: 6px;' }));

  const heroes = raid.party.map(id => getHero(id)).filter(h => h && h.alive);

  for (const hero of heroes) {
    const cls = CLASSES[hero.classId];
    const heroBtn = btn(`${cls.icon} ${hero.name} (${hero.inventory.length} items)`, 'btn-block btn-sm', () => {
      showTradeFrom(menu, hero, heroes, raid);
    });
    menu.appendChild(heroBtn);
  }

  menu.appendChild(btn('Close', 'btn-sm btn-block', () => menu.remove()));
  container.appendChild(menu);
}

function showTradeFrom(menu, fromHero, allHeroes, raid) {
  menu.innerHTML = '';
  const cls = CLASSES[fromHero.classId];
  menu.appendChild(el('div', { class: 'text-bright', text: `${cls.icon} ${fromHero.name}'s Items`, style: 'font-weight: 700; margin-bottom: 6px;' }));

  if (fromHero.inventory.length === 0) {
    menu.appendChild(el('p', { class: 'text-dim', text: 'No items to trade.' }));
    menu.appendChild(btn('Back', 'btn-sm btn-block', () => { menu.remove(); }));
    return;
  }

  for (const item of fromHero.inventory) {
    const row = el('div', { class: 'loot-item', style: 'flex-wrap: wrap;' }, [
      el('div', { class: 'loot-item-info' }, [
        el('span', { text: item.icon }),
        el('span', { class: `rarity-text-${item.rarity || 'common'}`, text: item.name, style: 'font-size: 12px;' }),
        el('span', { class: 'text-dim', text: `${item.size}u`, style: 'font-size: 10px;' }),
      ]),
    ]);

    // "Give to" buttons for other heroes
    for (const target of allHeroes) {
      if (target.id === fromHero.id) continue;
      const tCls = CLASSES[target.classId];
      const space = target.inventoryCapacity - usedInvQuick(target);
      if (space >= item.size) {
        row.appendChild(btn(`\u27A1\uFE0F ${tCls.icon} ${target.name}`, 'btn-sm', () => {
          const idx = fromHero.inventory.findIndex(i => i.id === item.id);
          if (idx >= 0) {
            fromHero.inventory.splice(idx, 1);
            target.inventory.push(item);
            saveGame();
            toast(`Gave ${item.name} to ${target.name}`, 'success');
            showTradeFrom(menu, fromHero, allHeroes, raid);
          }
        }));
      }
    }

    menu.appendChild(row);
  }

  menu.appendChild(btn('Back', 'btn-sm btn-block', () => { menu.remove(); }));
}

// Compare two items (new vs currently equipped) for stat diffs
// Level-up stat allocation screen
function showLevelUpScreen(heroes, index, raid) {
  if (index >= heroes.length) {
    // All heroes done — back to exploring
    saveGame();
    renderActiveTab();
    return;
  }

  showContextTip('first_levelup', 'Level Up!', 'Each level grants 2 stat points. Put them in your main attack stat (STR for melee, DEX for finesse, INT for magic) or CON for survivability.');

  const hero = heroes[index];
  const cls = CLASSES[hero.classId];
  const content = document.getElementById('content');
  content.innerHTML = '';

  function render() {
    content.innerHTML = '';
    const screen = el('div', { class: 'flex-col gap-md' });

    screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 16px;' }, [
      el('div', { text: '\u2B50', style: 'font-size: 36px; text-align: center;' }),
      el('div', { class: 'text-success', text: 'LEVEL UP!', style: 'font-size: 22px; font-weight: 900; text-align: center;' }),
      el('div', { class: 'text-bright', text: `${cls.icon} ${hero.name} — Level ${hero.level}`, style: 'font-size: 16px; font-weight: 700; text-align: center; margin-top: 4px;' }),
      el('div', { class: 'text-dim', text: `HP: ${hero.maxHp} | MP: ${hero.maxMp}`, style: 'font-size: 12px; text-align: center; margin-top: 2px;' }),
    ]));

    if (hero.statPoints > 0) {
      screen.appendChild(el('div', { class: 'text-warning', text: `${hero.statPoints} stat points to allocate`, style: 'font-weight: 600; text-align: center; margin-bottom: 4px;' }));
    }

    const statsDiv = el('div', { class: 'card', style: 'padding: 12px;' });
    for (const stat of STATS) {
      const row = el('div', { class: 'stat-alloc' });
      row.appendChild(el('span', { class: 'stat-alloc-name', text: stat }));
      row.appendChild(el('span', { class: 'stat-alloc-desc', text: STAT_DESC[stat] }));

      const controls = el('div', { class: 'stat-alloc-controls' });

      const minusBtn = el('button', { class: 'stat-alloc-btn', text: '-' });
      minusBtn.disabled = hero.stats[stat] <= 8;
      minusBtn.onclick = () => {
        if (hero.stats[stat] > 8) {
          hero.stats[stat]--;
          hero.statPoints++;
          recalcHero(hero);
          hero.hp = hero.maxHp;
          hero.mp = hero.maxMp;
          render();
        }
      };
      controls.appendChild(minusBtn);

      controls.appendChild(el('span', { class: 'stat-alloc-val', text: String(hero.stats[stat]) }));

      const plusBtn = el('button', { class: 'stat-alloc-btn', text: '+' });
      plusBtn.disabled = hero.statPoints <= 0;
      plusBtn.onclick = () => {
        if (hero.statPoints > 0) {
          hero.stats[stat]++;
          hero.statPoints--;
          recalcHero(hero);
          hero.hp = hero.maxHp;
          hero.mp = hero.maxMp;
          render();
        }
      };
      controls.appendChild(plusBtn);

      row.appendChild(controls);
      statsDiv.appendChild(row);
    }
    screen.appendChild(statsDiv);

    // Confirm button
    const remaining = heroes.length - index - 1;
    const label = hero.statPoints > 0
      ? `Allocate all points first`
      : remaining > 0
        ? `Confirm — Next Hero (${remaining} more)`
        : 'Confirm';

    const confirmBtn = btn(label, 'btn-primary btn-block btn-lg', () => {
      saveGame();
      showLevelUpScreen(heroes, index + 1, raid);
    });
    confirmBtn.disabled = hero.statPoints > 0;
    screen.appendChild(confirmBtn);

    content.appendChild(screen);
  }

  render();
}

function compareItems(newItem, oldItem) {
  const diffs = [];
  const stats = ['dmgMin', 'dmgMax', 'accuracy', 'armor', 'magicResist'];
  const labels = { dmgMin: 'MinDmg', dmgMax: 'MaxDmg', accuracy: 'Acc', armor: 'Armor', magicResist: 'MR' };
  for (const stat of stats) {
    const newVal = newItem[stat] || 0;
    const oldVal = oldItem ? (oldItem[stat] || 0) : 0;
    const diff = newVal - oldVal;
    if (diff !== 0) diffs.push({ stat: labels[stat], val: diff });
  }
  return diffs;
}

function usedInvQuick(hero) {
  let used = 0;
  for (const item of hero.inventory) used += item.size;
  for (const slot of GEAR_SLOTS) {
    if (hero.gear[slot]) used += hero.gear[slot].size;
  }
  return used;
}

function renderCombatVictory(container, raid) {
  const combat = raid.combat;

  // Outnumbered bonus: more enemies than party = better rewards
  const aliveDuringFight = raid.party.map(id => getHero(id)).filter(Boolean).length;
  const enemyCount = combat.enemies.length;
  const outnumberedRatio = enemyCount / Math.max(1, aliveDuringFight);
  const rewardMult = outnumberedRatio > 1 ? 1 + (outnumberedRatio - 1) * 0.5 : 1; // +50% per extra enemy ratio
  const bonusXp = Math.round(combat.xpEarned * (rewardMult - 1));
  combat.xpEarned = Math.round(combat.xpEarned * rewardMult);

  const outnumberedText = rewardMult > 1 ? ` (${Math.round((rewardMult-1)*100)}% outnumbered bonus!)` : '';

  container.appendChild(el('div', { class: 'encounter-card' }, [
    el('div', { class: 'encounter-icon', text: '\u2694\uFE0F' }),
    el('div', { class: 'encounter-title text-success', text: 'Victory!' }),
    el('div', { class: 'encounter-desc', text: `Earned ${combat.xpEarned} XP${outnumberedText}` }),
  ]));

  // Generate victory loot — more enemies = more loot rolls
  const zone = ZONES.find(z => z.id === raid.zoneId);
  const lootItems = [];
  const baseGold = generateGold(zone?.lootLevel || 1);
  const gold = Math.round(baseGold * rewardMult);
  raid.goldCollected += gold;
  G.gold += gold;

  // Each enemy has a drop chance, outnumbered bonus adds extra roll chance
  const dropChance = Math.min(0.7, 0.4 + (rewardMult - 1) * 0.15);
  for (const enemy of combat.enemies) {
    if (Math.random() < dropChance) {
      if (Math.random() < 0.7) {
        lootItems.push(generateGear(zone?.lootLevel || 1));
      } else {
        lootItems.push(generateConsumable());
      }
    }
  }

  container.appendChild(el('div', { class: 'text-success', text: `+${gold} gold${outnumberedText}`, style: 'text-align: center; font-weight: 700; margin: 8px 0;' }));

  if (lootItems.length > 0) {
    const lootDiv = el('div', { class: 'loot-items' });
    for (const item of lootItems) {
      const lootRow = el('div', { class: 'loot-item' }, [
        el('div', { class: 'loot-item-info' }, [
          el('span', { text: item.icon }),
          el('span', { class: `rarity-text-${item.rarity}`, text: item.name, style: 'font-size: 12px;' }),
          el('span', { class: 'loot-item-size', text: `${item.size}u` }),
        ]),
      ]);

      for (const heroId of raid.party) {
        const hero = getHero(heroId);
        if (hero && hero.alive && canCarry(hero, item)) {
          lootRow.appendChild(btn(`\uD83C\uDF92 ${hero.name}`, 'btn-sm', () => {
            hero.inventory.push(item);
            raid.itemsCollected.push(item);
            lootRow.remove();
            saveGame();
            toast(`${hero.name} picked up ${item.name}`, 'success');
          }));
        }
      }
      lootDiv.appendChild(lootRow);
    }
    container.appendChild(lootDiv);
  }

  // Distribute XP and check for level ups
  const survivors = raid.party.map(id => getHero(id)).filter(h => h && h.alive);
  const leveledHeroes = [];
  if (survivors.length > 0 && combat.xpEarned > 0) {
    const xpEach = Math.floor(combat.xpEarned / survivors.length);
    for (const hero of survivors) {
      hero.xp += xpEach;
      const xpNeeded = Math.floor(50 * Math.pow(hero.level, 1.8));
      while (hero.xp >= xpNeeded) {
        hero.xp -= xpNeeded;
        hero.level++;
        hero.statPoints += 2;
        recalcHero(hero);
        hero.hp = hero.maxHp;
        hero.mp = hero.maxMp;
        leveledHeroes.push(hero);
      }
    }
  }

  if (leveledHeroes.length > 0) {
    // Show level-up screen before continuing
    container.appendChild(btn('Continue — Level Up!', 'btn-success btn-block btn-lg', () => {
      raid.combat = null;
      raid.phase = RAID_PHASE.EXPLORING;
      saveGame();
      showLevelUpScreen(leveledHeroes, 0, raid);
    }));
  } else {
    container.appendChild(btn('Continue', 'btn-primary btn-block', () => {
      raid.combat = null;
      raid.phase = RAID_PHASE.EXPLORING;
      saveGame();
      renderActiveTab();
    }));
  }

  return container;
}

function renderCombatDefeat(container, raid) {
  container.appendChild(el('div', { class: 'encounter-card' }, [
    el('div', { class: 'encounter-icon', text: '\uD83D\uDC80' }),
    el('div', { class: 'encounter-title text-danger', text: 'Defeat!' }),
    el('div', { class: 'encounter-desc', text: 'Your party has been overwhelmed...' }),
  ]));

  // Check if only some heroes died
  const party = raid.party.map(id => getHero(id)).filter(Boolean);
  const alive = party.filter(h => h.alive);

  if (alive.length > 0) {
    container.appendChild(el('p', { class: 'text-warning', text: `${alive.map(h => h.name).join(', ')} survived. Dead heroes drop all items.`, style: 'text-align: center;' }));

    // Collect all dropped items from dead heroes
    const droppedItems = [];
    for (const hero of party.filter(h => !h.alive)) {
      for (const item of hero.inventory) {
        droppedItems.push({ item, fromHero: hero.name });
      }
      for (const slot of GEAR_SLOTS) {
        if (hero.gear[slot]) {
          droppedItems.push({ item: hero.gear[slot], fromHero: hero.name });
        }
      }
      hero.inventory = [];
      hero.gear = Object.fromEntries(Object.keys(hero.gear).map(s => [s, null]));
    }

    // Show interactive pickup UI for dropped items
    if (droppedItems.length > 0) {
      container.appendChild(el('div', { class: 'text-dim', text: 'Dropped Items — pick up or leave:', style: 'font-weight: 600; margin: 8px 0 4px;' }));
      const lootDiv = el('div', { class: 'loot-items' });
      for (const drop of droppedItems) {
        const lootRow = el('div', { class: 'loot-item' }, [
          el('div', { class: 'loot-item-info' }, [
            el('span', { text: drop.item.icon }),
            el('span', { class: `rarity-text-${drop.item.rarity || 'common'}`, text: drop.item.name, style: 'font-size: 12px;' }),
            el('span', { class: 'loot-item-size', text: `${drop.item.size}u` }),
          ]),
        ]);
        for (const survivor of alive) {
          if (canCarry(survivor, drop.item)) {
            lootRow.appendChild(btn(`\uD83C\uDF92 ${survivor.name}`, 'btn-sm', () => {
              survivor.inventory.push(drop.item);
              raid.itemsCollected.push(drop.item);
              lootRow.remove();
              saveGame();
              toast(`${survivor.name} picked up ${drop.item.name}`, 'success');
            }));
          }
        }
        lootDiv.appendChild(lootRow);
      }
      container.appendChild(lootDiv);
    }

    container.appendChild(btn('Continue (weakened)', 'btn-primary btn-block', () => {
      raid.combat = null;
      raid.phase = RAID_PHASE.EXPLORING;
      saveGame();
      renderActiveTab();
    }));
  } else {
    container.appendChild(btn('Return to Town', 'btn-danger btn-block', () => endRaidFailed(raid)));
  }

  return container;
}

function renderCombatFled(container, raid) {
  container.appendChild(el('div', { class: 'encounter-card' }, [
    el('div', { class: 'encounter-icon', text: '\uD83C\uDFC3' }),
    el('div', { class: 'encounter-title', text: 'Escaped!' }),
    el('div', { class: 'encounter-desc', text: 'Your party retreats from the fight.' }),
  ]));

  container.appendChild(btn('Continue', 'btn-primary btn-block', () => {
    raid.combat = null;
    raid.phase = RAID_PHASE.EXPLORING;
    saveGame();
    renderActiveTab();
  }));

  return container;
}

// === Extraction ===
function renderExtracting(container, raid) {
  container.appendChild(el('div', { class: 'encounter-card' }, [
    el('div', { class: 'encounter-icon', text: '\u2705' }),
    el('div', { class: 'encounter-title text-success', text: 'Extraction Point' }),
    el('div', { class: 'encounter-desc', text: 'Extract safely with your loot, or push deeper for more rewards.' }),
  ]));

  // Show what you're carrying
  const party = raid.party.map(id => getHero(id)).filter(Boolean);
  container.appendChild(el('div', { class: 'text-dim', text: 'Carrying:', style: 'font-weight: 600; margin: 8px 0 4px;' }));
  let totalItems = 0;
  for (const hero of party) {
    if (hero.inventory.length > 0) {
      for (const item of hero.inventory) {
        container.appendChild(el('div', { class: 'text-dim', text: `  ${hero.name}: ${item.icon} ${item.name}`, style: 'font-size: 12px;' }));
        totalItems++;
      }
    }
  }
  if (totalItems === 0) {
    container.appendChild(el('div', { class: 'text-dim', text: '  Nothing collected yet.', style: 'font-size: 12px;' }));
  }

  container.appendChild(el('div', { class: 'text-success', text: `Gold: +${raid.goldCollected}`, style: 'font-weight: 600; margin-top: 8px;' }));

  container.appendChild(el('div', { class: 'flex-col gap-sm', style: 'margin-top: 12px;' }, [
    btn('Extract!', 'btn-success btn-block btn-lg', () => {
      extractRaid(raid);
      renderActiveTab();
    }),
    btn('Keep Going', 'btn-block', () => {
      raid.phase = RAID_PHASE.EXPLORING;
      renderActiveTab();
    }),
  ]));

  return container;
}

// === Result ===
function renderResult(container, raid) {
  const result = raid.result;

  const resultCard = el('div', { class: `extraction-result ${result.success ? 'success' : 'failure'}` });
  resultCard.appendChild(el('h2', { text: result.success ? 'Extraction Successful!' : 'Raid Failed' }));

  const summary = el('div', { class: 'extraction-summary' });
  summary.appendChild(statRow('Zone', result.zoneName));
  summary.appendChild(statRow('Steps', result.steps));
  summary.appendChild(statRow('Gold Collected', `+${result.goldCollected}`));
  summary.appendChild(statRow('XP Earned', `+${result.xpCollected}`));

  if (result.success) {
    summary.appendChild(statRow('Items Kept', result.itemsKept.length));

    // Transfer items to stash
    for (const hero of raid.party.map(id => getHero(id)).filter(Boolean)) {
      for (const item of [...hero.inventory]) {
        G.stash.push(item);
      }
      hero.inventory = [];
    }
  } else {
    if (result.itemsLost.length > 0) {
      summary.appendChild(statRow('Items Lost', result.itemsLost.length, 'text-danger'));
    }
    if (result.itemsRecovered && result.itemsRecovered.length > 0) {
      summary.appendChild(statRow('Insurance Recovered', result.itemsRecovered.length, 'text-success'));
    }
    if (result.heroesLost.length > 0) {
      summary.appendChild(el('div', { class: 'text-danger', text: `Heroes downed: ${result.heroesLost.join(', ')}`, style: 'font-size: 12px;' }));
    }
  }

  resultCard.appendChild(summary);
  container.appendChild(resultCard);

  container.appendChild(btn('Return to Town', 'btn-primary btn-block btn-lg', () => {
    // Heal and revive all heroes, give starter gear if they lost theirs
    for (const hero of G.heroes) {
      hero.alive = true;
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
      hero.buffs = [];
      hero.debuffs = [];
      hero.dots = [];
      if (!hero.gear.weapon) {
        giveStarterGear(hero);
      }
    }
    clearRaid();
    setNavVisible(true);
    renderActiveTab();
    renderHUD();
  }));

  return container;
}

function endRaidFailed(raid) {
  // Full wipe — lose all carried items and gear
  const party = raid.party.map(id => getHero(id)).filter(Boolean);
  for (const hero of party) {
    hero.inventory = [];
    hero.gear = Object.fromEntries(Object.keys(hero.gear).map(s => [s, null]));
    hero.alive = true;
    hero.hp = Math.floor(hero.maxHp * 0.5);
    giveStarterGear(hero);
  }

  raid.result = {
    success: false,
    zoneName: raid.zoneName,
    steps: raid.steps,
    goldCollected: raid.goldCollected,
    xpCollected: raid.xpCollected,
    itemsKept: [],
    itemsLost: [],
    heroesLost: party.map(h => h.name),
  };
  raid.phase = RAID_PHASE.RESULT;
  G.totalDeaths++;
  saveGame();
  renderActiveTab();
}
