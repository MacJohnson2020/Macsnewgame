// === Voidborn — Raid Tab (Main Gameplay View) ===

import { G, getHero, saveGame, canCarry } from '../../state.js';
import { ZONES, CLASSES } from '../../config.js';
import { el } from '../../utils.js';
import { btn, card, heroCard, enemyCard, itemDisplay, itemDetail, corruptionBar, progressBar, statRow, toast } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';
import { setNavVisible } from '../router.js';
import { startRaid, getAvailableNodes, stepToNode, resolveEncounter, extractRaid, clearRaid, isPartyWiped, RAID_PHASE } from '../../raid/loop.js';
import { renderPath, renderPathOverview } from '../../raid/pathRenderer.js';
import { getCurrentCombatant, nextTurn, attackAction, abilityAction, useItemAction, fleeAction, previewAttack, enemyAI } from '../../raid/combat.js';
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

  // Party status with equip buttons
  container.appendChild(el('div', { class: 'divider' }));
  container.appendChild(el('div', { class: 'text-dim', text: 'Party', style: 'font-weight: 600; margin-bottom: 4px;' }));
  for (const heroId of raid.party) {
    const hero = getHero(heroId);
    if (!hero) continue;
    const cardEl = heroCard(hero);
    // Add equip button per hero
    const gearCount = hero.inventory.filter(i => i.slot && !i.isConsumable).length;
    if (gearCount > 0 || hero.inventory.length > 0) {
      const equipRow = el('div', { style: 'margin-top: 4px; display: flex; gap: 4px;' });
      equipRow.appendChild(btn(`\uD83D\uDEE1\uFE0F Equip (${gearCount})`, 'btn-sm', () => {
        showRaidEquipMenu(container, hero, raid);
      }));
      cardEl.appendChild(equipRow);
    }
    container.appendChild(cardEl);
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
    container.appendChild(renderHeroActions(raid, combat, current.entity));
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
    } else if (ability.aoe) {
      // AoE — no target needed
      abilBtn.onclick = () => {
        abilityAction(combat, hero, ability.id, null);
        nextTurn(combat);
        saveGame();
        renderActiveTab();
      };
    } else {
      // Single target — show target picker
      abilBtn.onclick = () => showAbilityTargetPicker(actions, combat, hero, ability, raid);
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
  equipBtn.onclick = () => showRaidEquipMenu(actions, hero, raid);
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

  return actions;
}

// Ability target picker for single-target abilities
function showAbilityTargetPicker(parent, combat, hero, ability, raid) {
  // Remove existing picker
  const old = parent.querySelector('.target-picker');
  if (old) old.remove();

  const picker = el('div', { class: 'target-picker card', style: 'margin-top: 6px;' });
  picker.appendChild(el('div', { class: 'text-bright', text: `${ability.name} — Pick target:`, style: 'font-size: 12px; font-weight: 700; margin-bottom: 4px;' }));

  for (const enemy of combat.enemies.filter(e => e.alive)) {
    const tBtn = el('button', { class: 'combat-action-btn' });
    tBtn.appendChild(el('span', { text: `${enemy.icon} ${enemy.name} (${enemy.hp}/${enemy.maxHp})` }));
    tBtn.onclick = () => {
      abilityAction(combat, hero, ability.id, enemy);
      nextTurn(combat);
      saveGame();
      renderActiveTab();
    };
    picker.appendChild(tBtn);
  }

  picker.appendChild(btn('Cancel', 'btn-sm', () => picker.remove()));
  parent.appendChild(picker);
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
    row.onclick = () => {
      if (item.effect === 'revive') {
        // Pick a dead hero to revive
        const dead = combat.party.filter(h => !h.alive);
        if (dead.length === 0) { toast('No one to revive', 'info'); return; }
        useItemAction(combat, hero, item, dead[0]);
      } else {
        useItemAction(combat, hero, item);
      }
      nextTurn(combat);
      saveGame();
      renderActiveTab();
    };
    picker.appendChild(row);
  }

  picker.appendChild(btn('Cancel', 'btn-sm', () => picker.remove()));
  parent.appendChild(picker);
}

// Equip menu during raid (combat or exploration)
function showRaidEquipMenu(parent, hero, raid) {
  const old = parent.querySelector('.equip-picker');
  if (old) old.remove();

  const picker = el('div', { class: 'equip-picker card', style: 'margin-top: 6px;' });
  picker.appendChild(el('div', { class: 'text-bright', text: `${hero.name} — Equipment`, style: 'font-size: 12px; font-weight: 700; margin-bottom: 4px;' }));

  // Current gear
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const equipped = hero.gear[slot];
    const available = hero.inventory.filter(i => i.slot === slot && !i.isConsumable);

    const row = el('div', { style: 'margin-bottom: 6px;' });
    row.appendChild(el('div', { class: 'text-dim', text: slot.toUpperCase(), style: 'font-size: 10px; font-weight: 700;' }));

    if (equipped) {
      row.appendChild(el('div', { class: 'text-dim', text: `  Equipped: ${equipped.icon} ${equipped.name}`, style: 'font-size: 11px;' }));
    }

    // Show equippable items from backpack
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

    picker.appendChild(row);
  }

  picker.appendChild(btn('Close', 'btn-sm', () => picker.remove()));
  parent.appendChild(picker);
}

function renderCombatVictory(container, raid) {
  const combat = raid.combat;

  container.appendChild(el('div', { class: 'encounter-card' }, [
    el('div', { class: 'encounter-icon', text: '\u2694\uFE0F' }),
    el('div', { class: 'encounter-title text-success', text: 'Victory!' }),
    el('div', { class: 'encounter-desc', text: `Earned ${combat.xpEarned} XP` }),
  ]));

  // Generate victory loot
  const zone = ZONES.find(z => z.id === raid.zoneId);
  const lootItems = [];
  const gold = generateGold(zone?.lootLevel || 1);
  raid.goldCollected += gold;
  G.gold += gold;

  for (const enemy of combat.enemies) {
    if (Math.random() < 0.4) {
      if (Math.random() < 0.7) {
        lootItems.push(generateGear(zone?.lootLevel || 1));
      } else {
        lootItems.push(generateConsumable());
      }
    }
  }

  container.appendChild(el('div', { class: 'text-success', text: `+${gold} gold`, style: 'text-align: center; font-weight: 700; margin: 8px 0;' }));

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

  // Distribute XP
  const survivors = raid.party.map(id => getHero(id)).filter(h => h && h.alive);
  if (survivors.length > 0 && combat.xpEarned > 0) {
    const xpEach = Math.floor(combat.xpEarned / survivors.length);
    for (const hero of survivors) {
      hero.xp += xpEach;
      const xpNeeded = Math.floor(50 * Math.pow(hero.level, 1.8));
      while (hero.xp >= xpNeeded) {
        hero.xp -= xpNeeded;
        hero.level++;
        hero.statPoints += 2;
        toast(`${hero.name} leveled up to ${hero.level}!`, 'success');
      }
    }
  }

  container.appendChild(btn('Continue', 'btn-primary btn-block', () => {
    raid.combat = null;
    raid.phase = RAID_PHASE.EXPLORING;
    saveGame();
    renderActiveTab();
  }));

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

    // Drop dead heroes' items
    for (const hero of party.filter(h => !h.alive)) {
      for (const item of hero.inventory) {
        container.appendChild(el('p', { class: 'text-danger', text: `${hero.name} dropped: ${item.name}`, style: 'font-size: 12px;' }));
      }
      hero.inventory = [];
      hero.gear = { weapon: null, armor: null, accessory: null };
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
    if (result.heroesLost.length > 0) {
      summary.appendChild(el('div', { class: 'text-danger', text: `Heroes downed: ${result.heroesLost.join(', ')}`, style: 'font-size: 12px;' }));
    }
  }

  resultCard.appendChild(summary);
  container.appendChild(resultCard);

  container.appendChild(btn('Return to Town', 'btn-primary btn-block btn-lg', () => {
    // Heal and revive all heroes
    for (const hero of G.heroes) {
      hero.alive = true;
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
      hero.buffs = [];
      hero.debuffs = [];
      hero.dots = [];
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
    hero.gear = { weapon: null, armor: null, accessory: null };
    hero.alive = true;
    hero.hp = Math.floor(hero.maxHp * 0.5);
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
