// === Voidborn — Reusable UI Components ===

import { el } from '../utils.js';

// Toast notification
let toastContainer = null;

export function toast(message, type = 'info') {
  if (!toastContainer) {
    toastContainer = el('div', { class: 'toast-container' });
    document.body.appendChild(toastContainer);
  }
  const t = el('div', { class: `toast ${type}`, text: message });
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Progress bar
export function progressBar(current, max, barClass = '', showText = false) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const container = el('div', { class: `progress ${showText ? 'progress-labeled' : ''}` });
  const fill = el('div', {
    class: `progress-fill ${barClass}`,
    style: `width: ${pct}%`,
  });
  container.appendChild(fill);
  if (showText) {
    container.appendChild(el('div', { class: 'progress-text', text: `${Math.floor(current)}/${max}` }));
  }
  return container;
}

// Stat row
export function statRow(label, value, valueClass = '') {
  return el('div', { class: 'stat-row' }, [
    el('span', { class: 'stat-label', text: label }),
    el('span', { class: `stat-value ${valueClass}`, text: String(value) }),
  ]);
}

// Card container
export function card(title, content, actions = []) {
  const c = el('div', { class: 'card' });
  if (title) {
    c.appendChild(el('div', { class: 'card-header' }, [
      el('span', { class: 'card-title', text: title }),
    ]));
  }
  if (typeof content === 'string') {
    c.appendChild(el('p', { text: content, class: 'text-dim' }));
  } else if (content) {
    c.appendChild(content);
  }
  if (actions.length > 0) {
    const actionsDiv = el('div', { class: 'flex gap-sm', style: 'margin-top: 8px;' });
    for (const action of actions) actionsDiv.appendChild(action);
    c.appendChild(actionsDiv);
  }
  return c;
}

// Button
export function btn(text, className = '', onClick = null) {
  const b = el('button', { class: `btn ${className}`, text });
  if (onClick) b.onclick = onClick;
  return b;
}

// Tooltip — wraps text with a tap/hover popup
export function tip(text, title, popupContent) {
  const span = el('span', { class: 'tip-trigger', text });
  const showTip = (ev) => {
    hideAllTips();
    const popup = el('div', { class: 'tip-popup' });
    if (title) popup.appendChild(el('div', { class: 'tip-title', text: title }));
    popup.appendChild(el('div', { text: popupContent }));
    document.body.appendChild(popup);
    // Position near the trigger
    const rect = span.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    // Keep on screen
    if (left + popupRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popupRect.width - 10;
    }
    if (top + popupRect.height > window.innerHeight - 10) {
      top = rect.top - popupRect.height - 4;
    }
    popup.style.top = `${Math.max(10, top)}px`;
    popup.style.left = `${Math.max(10, left)}px`;
    // Auto-hide after 3s or on next tap
    setTimeout(() => popup.remove(), 3000);
  };
  span.addEventListener('click', (ev) => { ev.stopPropagation(); showTip(ev); });
  return span;
}

function hideAllTips() {
  document.querySelectorAll('.tip-popup').forEach(p => p.remove());
}

// Item display
export function itemDisplay(item, onClick = null) {
  const rarityClass = `rarity-${item.rarity || 'common'}`;
  const d = el('div', { class: `item-slot ${rarityClass}` }, [
    el('span', { class: 'item-icon', text: item.icon }),
    el('span', { class: `item-name rarity-text-${item.rarity || 'common'}`, text: item.name }),
    el('span', { class: 'text-dim', text: `${item.size}u`, style: 'font-size: 10px;' }),
  ]);
  if (onClick) {
    d.style.cursor = 'pointer';
    d.onclick = () => onClick(item);
  }
  return d;
}

// Item tooltip/detail
export function itemDetail(item) {
  const d = el('div', { class: 'card' });
  d.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center; margin-bottom: 8px;' }, [
    el('span', { text: item.icon, style: 'font-size: 28px;' }),
    el('div', {}, [
      el('div', { class: `rarity-text-${item.rarity || 'common'}`, text: item.name, style: 'font-weight: 700;' }),
      el('div', { class: 'text-dim', text: `${item.slot || 'item'} | ${item.size}u`, style: 'font-size: 11px;' }),
    ]),
  ]));

  // Stats
  if (item.dmgMin !== undefined) d.appendChild(statRow('Damage', `${item.dmgMin}-${item.dmgMax}`));
  if (item.accuracy) d.appendChild(statRow('Accuracy', `+${item.accuracy}`));
  if (item.armor) d.appendChild(statRow('Armor', `+${item.armor}`));
  if (item.magicResist) d.appendChild(statRow('Magic Resist', `+${item.magicResist}`));

  // Substats
  if (item.substats && item.substats.length > 0) {
    for (const sub of item.substats) {
      d.appendChild(statRow(sub.name, `+${sub.value}${sub.suffix || ''}`));
    }
  }

  // Stat requirements
  if (item.statReq) {
    for (const [stat, val] of Object.entries(item.statReq)) {
      d.appendChild(statRow(`Requires ${stat}`, val, 'text-warning'));
    }
  }

  // Consumable
  if (item.desc) {
    d.appendChild(el('p', { class: 'text-dim', text: item.desc, style: 'font-size: 12px; margin-top: 6px;' }));
  }

  return d;
}

// Hero card (compact)
export function heroCard(hero, onClick = null) {
  const { CLASSES } = getConfig();
  const cls = CLASSES[hero.classId];

  const c = el('div', { class: `combatant-card ${!hero.alive ? 'dead' : ''}` });
  c.appendChild(el('div', { class: 'combatant-header' }, [
    el('span', { class: 'combatant-icon', text: cls.icon }),
    el('div', { class: 'combatant-info' }, [
      el('span', { class: 'combatant-name', text: hero.name }),
      el('span', { class: 'combatant-class', text: `Lv.${hero.level} ${cls.name}` }),
    ]),
  ]));

  const hpBar = progressBar(hero.hp, hero.maxHp, 'hp', true);
  c.appendChild(el('div', { class: 'combatant-hp' }, [hpBar]));

  if (hero.maxMp > 0) {
    const mpBar = progressBar(hero.mp, hero.maxMp, 'mp', true);
    c.appendChild(mpBar);
  }

  if (onClick) {
    c.style.cursor = 'pointer';
    c.onclick = () => onClick(hero);
  }

  return c;
}

// Enemy card (compact)
export function enemyCard(enemy, onClick = null) {
  const c = el('div', { class: `combatant-card ${!enemy.alive ? 'dead' : ''}` });
  c.appendChild(el('div', { class: 'combatant-header' }, [
    el('span', { class: 'combatant-icon', text: enemy.icon }),
    el('div', { class: 'combatant-info' }, [
      el('span', { class: 'combatant-name', text: enemy.name }),
      el('span', { class: 'combatant-class', text: [
        enemy.elite ? 'ELITE' : '',
        ...(enemy.tags || []),
      ].filter(Boolean).join(' \u00B7 ') }),
    ]),
  ]));

  const hpBar = progressBar(enemy.hp, enemy.maxHp, 'hp', true);
  c.appendChild(el('div', { class: 'combatant-hp' }, [hpBar]));

  // Weakness/resistance indicators
  if (enemy.alive && ((enemy.weakTo && enemy.weakTo.length) || (enemy.resistTo && enemy.resistTo.length))) {
    const infoRow = el('div', { style: 'display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;' });
    for (const w of (enemy.weakTo || [])) {
      infoRow.appendChild(el('span', { class: 'text-success', text: `Weak: ${w}`, style: 'font-size: 9px; background: rgba(46,204,113,0.1); padding: 1px 4px; border-radius: 3px;' }));
    }
    for (const r of (enemy.resistTo || [])) {
      infoRow.appendChild(el('span', { class: 'text-danger', text: `Resist: ${r}`, style: 'font-size: 9px; background: rgba(231,76,60,0.1); padding: 1px 4px; border-radius: 3px;' }));
    }
    c.appendChild(infoRow);
  }

  if (onClick) {
    c.style.cursor = 'pointer';
    c.onclick = () => onClick(enemy);
  }

  return c;
}

// Corruption bar
export function corruptionBar(corruption, corruptionLevel) {
  const maxCorruption = 40; // Visual max
  const pct = Math.min(100, (corruption / maxCorruption) * 100);

  return el('div', { class: 'corruption-bar' }, [
    el('div', { class: 'corruption-header' }, [
      el('span', { text: `Corruption: ${corruptionLevel.name}` }),
      el('span', { text: `${Math.floor(corruption)}` }),
    ]),
    progressBar(corruption, maxCorruption, 'corruption'),
  ]);
}

// Lazy config import to avoid circular deps
function getConfig() {
  return {
    CLASSES: {
      berserker: { icon: '\uD83E\uDE93', name: 'Berserker' },
      rogue: { icon: '\uD83D\uDDE1\uFE0F', name: 'Rogue' },
      arcanist: { icon: '\uD83D\uDD2E', name: 'Arcanist' },
      cleric: { icon: '\u2695\uFE0F', name: 'Cleric' },
      paladin: { icon: '\uD83D\uDEE1\uFE0F', name: 'Paladin' },
      ranger: { icon: '\uD83C\uDFF9', name: 'Ranger' },
      necromancer: { icon: '\uD83D\uDC80', name: 'Necromancer' },
      bard: { icon: '\uD83C\uDFB6', name: 'Bard' },
    },
  };
}
