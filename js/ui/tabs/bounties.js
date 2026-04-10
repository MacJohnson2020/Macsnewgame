// === Voidborn — Bounties & Faction Reputation ===

import { G, saveGame } from '../../state.js';
import { FACTIONS, BOUNTY_TEMPLATES, ZONES, ENEMIES } from '../../config.js';
import { el, uid, pick, randInt } from '../../utils.js';
import { btn, toast, progressBar, statRow } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';

export function renderBountiesTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  // Faction reputation overview
  container.appendChild(el('div', { class: 'section-title', text: 'Factions' }));

  for (const [fId, faction] of Object.entries(FACTIONS)) {
    const rep = G.factionRep[fId] || 0;
    const ranks = faction.ranks;
    const currentRank = [...ranks].reverse().find(r => rep >= r.rep) || ranks[0];
    const nextRank = ranks.find(r => r.rep > rep);

    const card = el('div', { class: 'card', style: 'margin-bottom: 8px;' });

    card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 6px;' }, [
      el('span', { text: faction.icon, style: 'font-size: 22px;' }),
      el('div', { style: 'flex: 1;' }, [
        el('div', { class: 'text-bright', text: faction.name, style: 'font-weight: 700;' }),
        el('div', { class: 'text-dim', text: `${currentRank.name} — ${rep} rep`, style: 'font-size: 11px;' }),
      ]),
    ]));

    card.appendChild(el('div', { class: 'text-dim', text: faction.desc, style: 'font-size: 11px; margin-bottom: 4px;' }));

    if (nextRank) {
      card.appendChild(progressBar(rep, nextRank.rep, '', true));
      card.appendChild(el('div', { class: 'text-dim', text: `Next: ${nextRank.name} (${nextRank.rep} rep) — ${nextRank.perk}`, style: 'font-size: 10px; margin-top: 2px;' }));
    } else {
      card.appendChild(el('div', { class: 'text-success', text: 'MAX RANK', style: 'font-size: 11px; font-weight: 700;' }));
    }

    if (currentRank.perk) {
      card.appendChild(el('div', { class: 'text-accent', text: `Active: ${currentRank.perk}`, style: 'font-size: 10px; margin-top: 4px;' }));
    }

    // Faction shop button
    card.appendChild(btn(`${faction.icon} Shop`, 'btn-sm', () => showFactionShop(faction, currentRank)));

    container.appendChild(card);
  }

  // Divider
  container.appendChild(el('div', { class: 'divider' }));

  // Active bounties
  container.appendChild(el('div', { class: 'section-title', text: 'Active Bounties' }));

  // Generate bounties if empty
  if (G.activeBounties.length === 0) {
    generateBounties();
  }

  for (const bounty of G.activeBounties) {
    const faction = FACTIONS[bounty.factionId];
    const done = bounty.progress >= bounty.count;

    const bCard = el('div', { class: `card ${done ? 'rarity-rare' : ''}`, style: 'margin-bottom: 6px; padding: 8px;' });
    bCard.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center;' }, [
      el('span', { text: faction.icon, style: 'font-size: 16px;' }),
      el('div', { style: 'flex: 1;' }, [
        el('div', { class: 'text-bright', text: bounty.desc, style: 'font-size: 12px; font-weight: 600;' }),
        el('div', { class: 'text-dim', text: `${bounty.progress}/${bounty.count} — ${bounty.rep} rep, ${bounty.gold}g`, style: 'font-size: 10px;' }),
      ]),
    ]));

    if (done) {
      bCard.appendChild(btn('Claim', 'btn-sm btn-success', () => {
        G.gold += bounty.gold;
        G.factionRep[bounty.factionId] = (G.factionRep[bounty.factionId] || 0) + bounty.rep;
        G.completedBounties++;
        G.activeBounties = G.activeBounties.filter(b => b.id !== bounty.id);
        saveGame();
        toast(`+${bounty.gold}g, +${bounty.rep} ${faction.name} rep`, 'success');
        renderActiveTab();
        renderHUD();
      }));
    } else {
      bCard.appendChild(progressBar(bounty.progress, bounty.count, '', false));
    }

    container.appendChild(bCard);
  }

  // Refresh bounties button
  container.appendChild(btn('Refresh Bounties (50g)', 'btn-block btn-sm', () => {
    if (G.gold < 50) { toast('Not enough gold', 'danger'); return; }
    G.gold -= 50;
    generateBounties();
    saveGame();
    renderActiveTab();
    renderHUD();
  }));

  container.appendChild(el('div', { class: 'text-dim', text: `${G.completedBounties} bounties completed`, style: 'font-size: 10px; text-align: center; margin-top: 4px;' }));

  return container;
}

function generateBounties() {
  const factionIds = Object.keys(FACTIONS);
  const zoneNames = ZONES.map(z => z.name);
  const enemyNames = Object.values(ENEMIES).map(e => e.name);
  const bounties = [];

  for (let i = 0; i < 5; i++) {
    const template = pick(BOUNTY_TEMPLATES);
    const factionId = pick(factionIds);

    let desc = template.desc;
    let count = 1;

    if (template.countRange) {
      count = randInt(template.countRange[0], template.countRange[1]);
    }

    desc = desc.replace('{count}', count);
    desc = desc.replace('{zone}', pick(zoneNames));
    desc = desc.replace('{enemy}', pick(enemyNames));

    // Scale rewards by count
    const repReward = Math.round(template.rep * (1 + (count - 1) * 0.3));
    const goldReward = Math.round(template.gold * (1 + (count - 1) * 0.3));

    bounties.push({
      id: uid(),
      factionId,
      type: template.type,
      desc,
      count,
      progress: 0,
      rep: repReward,
      gold: goldReward,
    });
  }

  G.activeBounties = bounties;
}

function showFactionShop(faction, rank) {
  const SHOP_ITEMS = {
    health_potion: { name: 'Health Potion', icon: '\u2764\uFE0F', price: 15, effect: 'heal', value: 30, desc: 'Restore 30 HP', size: 1 },
    mana_potion: { name: 'Mana Potion', icon: '\uD83D\uDCA7', price: 20, effect: 'mana', value: 15, desc: 'Restore 15 MP', size: 1 },
    antidote: { name: 'Antidote', icon: '\uD83C\uDF3F', price: 12, effect: 'cure', value: 0, desc: 'Remove DoT effects', size: 1 },
    revival_scroll: { name: 'Revival Scroll', icon: '\uD83D\uDCDC', price: 100, effect: 'revive', value: 50, desc: 'Revive hero at 50% HP', size: 2 },
  };

  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });
  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { class: 'text-bright', text: `${faction.icon} ${faction.name} Shop`, style: 'font-size: 18px; font-weight: 700;' }),
    el('div', { class: 'text-dim', text: `Rank: ${rank.name}`, style: 'font-size: 12px; margin-top: 4px;' }),
  ]));

  for (const itemId of faction.shopItems) {
    const item = SHOP_ITEMS[itemId];
    if (!item) continue;

    const row = el('div', { class: 'card', style: 'padding: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;' });
    row.appendChild(el('span', { text: item.icon, style: 'font-size: 22px;' }));
    row.appendChild(el('div', { style: 'flex: 1;' }, [
      el('div', { class: 'text-bright', text: item.name, style: 'font-size: 13px; font-weight: 600;' }),
      el('div', { class: 'text-dim', text: item.desc, style: 'font-size: 11px;' }),
    ]));
    row.appendChild(el('span', { class: 'text-warning', text: `${item.price}g`, style: 'font-weight: 700;' }));
    row.appendChild(btn('Buy', 'btn-sm btn-success', () => {
      if (G.gold < item.price) { toast('Not enough gold', 'danger'); return; }
      G.gold -= item.price;
      G.stash.push({
        id: uid(), consumableId: itemId, name: item.name, icon: item.icon,
        size: item.size, rarity: 'common', isConsumable: true,
        effect: item.effect, value: item.value, desc: item.desc,
      });
      saveGame();
      renderHUD();
      toast(`Bought ${item.name}`, 'success');
    }));
    screen.appendChild(row);
  }

  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

// Called from raid loop to track bounty progress
export function trackBountyProgress(type, detail = {}) {
  for (const bounty of G.activeBounties) {
    if (bounty.progress >= bounty.count) continue;

    switch (bounty.type) {
      case 'kill':
        if (type === 'kill') bounty.progress++;
        break;
      case 'extract':
        if (type === 'extract') bounty.progress = bounty.count;
        break;
      case 'extract_loot':
        if (type === 'extract_loot') bounty.progress = Math.min(bounty.count, detail.itemCount || 0);
        break;
      case 'clear_floor':
        if (type === 'floor' && detail.floor >= bounty.count) bounty.progress = bounty.count;
        break;
      case 'no_death':
        if (type === 'extract_no_death') bounty.progress = bounty.count;
        break;
    }
  }
}
