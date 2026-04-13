// === Voidborn — Party Tab ===

import { G, getHero, recalcHero, usedInventory, refreshRecruitPool, shouldRefreshRecruits, hireRecruit, saveGame, getSkillStatBonuses } from '../../state.js';
import { CLASSES, STATS, STAT_DESC, GEAR_SLOTS, GEAR_SLOT_INFO, DAMAGE_TYPES } from '../../config.js';
import { el } from '../../utils.js';
import { heroCard, progressBar, statRow, btn, toast, itemDetail, tip } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';
import { getAccuracy, getArmor, getMagicResist, getDefense, getWeaponDamage, getDamageStat, getCritChance, getInitiative, getPenetration } from '../../raid/entities.js';

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

  // Recruitment section
  container.appendChild(el('div', { class: 'divider' }));
  container.appendChild(renderRecruitment());

  return container;
}

// Full hero profile screen — derived stats + resistances
function showHeroProfile(hero) {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const cls = CLASSES[hero.classId];
  const screen = el('div', { class: 'flex-col gap-md' });

  // Header
  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 16px;' }, [
    el('div', { text: cls.icon, style: 'font-size: 36px; text-align: center;' }),
    el('div', { class: 'text-bright', text: hero.name, style: 'font-size: 20px; font-weight: 700; text-align: center;' }),
    el('div', { class: 'text-dim', text: `Level ${hero.level} ${cls.name}`, style: 'font-size: 12px; text-align: center;' }),
  ]));

  // Core stats (base + skill bonuses)
  const statsCard = el('div', { class: 'card', style: 'padding: 12px;' });
  statsCard.appendChild(el('div', { class: 'text-dim', text: 'Stats', style: 'font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;' }));
  const skillBonuses = getSkillStatBonuses();
  for (const stat of STATS) {
    const base = hero.stats[stat];
    const bonus = skillBonuses[stat] || 0;
    const total = base + bonus;
    const row = el('div', { class: 'stat-row', style: 'font-size: 11px;' }, [
      tip(stat, stat, STAT_DESC[stat]),
      el('span', { class: 'stat-value', text: bonus > 0 ? `${total} (${base}+${bonus})` : `${total}`, style: bonus > 0 ? 'color: var(--success);' : '' }),
    ]);
    statsCard.appendChild(row);
  }
  screen.appendChild(statsCard);

  // Combat stats (derived)
  const combatCard = el('div', { class: 'card', style: 'padding: 12px;' });
  combatCard.appendChild(el('div', { class: 'text-dim', text: 'Combat', style: 'font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;' }));
  const [dmgMin, dmgMax] = getWeaponDamage(hero);
  const dmgBonus = getDamageStat(hero);
  const pen = getPenetration(hero);
  const tipRow = (label, val, title, desc) => el('div', { class: 'stat-row', style: 'font-size: 11px;' }, [
    tip(label, title, desc),
    el('span', { class: 'stat-value', text: String(val) }),
  ]);
  combatCard.appendChild(tipRow('HP', `${hero.hp} / ${hero.maxHp}`, 'Hit Points', 'Health pool. Reach 0 and your hero falls in combat. Boosted by CON.'));
  combatCard.appendChild(tipRow('MP', `${hero.mp} / ${hero.maxMp}`, 'Mana Points', 'Resource for class abilities. Boosted by INT.'));
  combatCard.appendChild(tipRow('Damage', `${dmgMin}-${dmgMax} +${dmgBonus}`, 'Damage', 'Weapon base damage range plus stat bonus. Crits deal 2x.'));
  combatCard.appendChild(tipRow('Accuracy', getAccuracy(hero), 'Accuracy', 'Hit chance = Accuracy / (Accuracy + target defense). Higher = more hits.'));
  combatCard.appendChild(tipRow('Crit Chance', `${getCritChance(hero)}%`, 'Crit Chance', 'Chance to deal double damage on a hit. Boosted by DEX and gear.'));
  combatCard.appendChild(tipRow('Initiative', getInitiative(hero), 'Initiative', 'Determines turn order in combat. Higher = act first. Based on DEX.'));
  combatCard.appendChild(tipRow('Armor Pen', `${pen.armorPen}%`, 'Armor Penetration', 'Ignores this % of target armor before hit calc.'));
  combatCard.appendChild(tipRow('Magic Pen', `${pen.magicPen}%`, 'Magic Penetration', 'Ignores this % of target magic resist before hit calc.'));
  screen.appendChild(combatCard);

  // Defenses
  const defCard = el('div', { class: 'card', style: 'padding: 12px;' });
  defCard.appendChild(el('div', { class: 'text-dim', text: 'Defenses', style: 'font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;' }));
  defCard.appendChild(statRow('Armor', getArmor(hero)));
  defCard.appendChild(statRow('Magic Resist', getMagicResist(hero)));
  defCard.appendChild(el('div', { class: 'divider', style: 'margin: 6px 0;' }));
  for (const [typeId, typeDef] of Object.entries(DAMAGE_TYPES)) {
    if (typeId === 'physical' || typeId === 'magic') continue;
    const value = getDefense(hero, typeId);
    defCard.appendChild(statRow(`${typeDef.icon} ${typeDef.name}`, value));
  }
  screen.appendChild(defCard);

  // Abilities
  const abilCard = el('div', { class: 'card', style: 'padding: 12px;' });
  abilCard.appendChild(el('div', { class: 'text-dim', text: 'Abilities', style: 'font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;' }));
  for (const ability of cls.abilities) {
    const unlocked = hero.level >= ability.level;
    const row = el('div', { style: `padding: 4px 0; ${unlocked ? '' : 'opacity: 0.4;'}` });
    row.appendChild(el('div', { class: 'text-bright', text: `${ability.name} (Lv.${ability.level})`, style: 'font-size: 11px; font-weight: 600;' }));
    row.appendChild(el('div', { class: 'text-dim', text: ability.desc, style: 'font-size: 10px;' }));
    row.appendChild(el('div', { class: 'text-accent', text: `${ability.mpCost} MP`, style: 'font-size: 10px;' }));
    abilCard.appendChild(row);
  }
  screen.appendChild(abilCard);

  // Back
  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

function renderRecruitment() {
  const section = el('div', { class: 'flex-col gap-sm' });
  section.appendChild(el('div', { class: 'section-title', text: 'Tavern — Recruit Heroes' }));

  // Auto-refresh pool if needed
  if (shouldRefreshRecruits() || G.recruitPool.length === 0) {
    refreshRecruitPool();
  }

  if (G.recruitPool.length === 0) {
    section.appendChild(el('p', { class: 'text-dim', text: 'No recruits available. Check back later.' }));
    return section;
  }

  // Refresh timer
  const elapsed = Date.now() - G.lastRecruitRefresh;
  const remaining = Math.max(0, 10 * 60 * 1000 - elapsed);
  const mins = Math.ceil(remaining / 60000);
  section.appendChild(el('div', { class: 'text-dim', text: `New recruits in ${mins} min`, style: 'font-size: 11px; margin-bottom: 4px;' }));

  for (const recruit of G.recruitPool) {
    const cls = CLASSES[recruit.classId];
    const card = el('div', { class: 'card', style: 'margin-bottom: 8px;' });

    card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 6px;' }, [
      el('span', { text: cls.icon, style: 'font-size: 24px;' }),
      el('div', { style: 'flex: 1;' }, [
        el('div', { class: 'text-bright', text: recruit.name, style: 'font-weight: 700;' }),
        el('div', { class: 'text-dim', text: `Level 1 ${cls.name}`, style: 'font-size: 12px;' }),
      ]),
      el('span', { class: 'text-warning', text: `${recruit.cost}g`, style: 'font-weight: 700;' }),
    ]));

    // Stats preview
    const statsRow = el('div', { style: 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;' });
    for (const stat of STATS) {
      const val = recruit.stats[stat];
      const diff = val - 10;
      const color = diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-dim';
      statsRow.appendChild(el('span', { class: color, text: `${stat}:${val}`, style: 'font-size: 11px;' }));
    }
    card.appendChild(statsRow);

    const canAfford = G.gold >= recruit.cost;
    card.appendChild(btn(
      canAfford ? `Hire (${recruit.cost}g)` : `Need ${recruit.cost}g`,
      canAfford ? 'btn-primary btn-sm btn-block' : 'btn-sm btn-block',
      canAfford ? () => {
        const hero = hireRecruit(recruit.id);
        if (hero) {
          toast(`${hero.name} joins your party!`, 'success');
          renderActiveTab();
          renderHUD();
        }
      } : null
    ));

    section.appendChild(card);
  }

  return section;
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

  // Full Profile button
  card.appendChild(el('div', { class: 'divider', style: 'margin: 8px 0;' }));
  card.appendChild(btn('Full Profile', 'btn-sm btn-block', () => showHeroProfile(hero)));

  // Dismiss button (not for main hero)
  if (!hero.isMain) {
    card.appendChild(btn('Dismiss Hero', 'btn-danger btn-sm btn-block', () => {
      if (!confirm(`Dismiss ${hero.name}? They will be gone forever, along with all their gear.`)) return;
      G.heroes = G.heroes.filter(h => h.id !== hero.id);
      G.raidParty = G.raidParty.filter(id => id !== hero.id);
      saveGame();
      renderActiveTab();
      renderHUD();
      toast(`${hero.name} has been dismissed`, 'info');
    }));
  }

  return card;
}
