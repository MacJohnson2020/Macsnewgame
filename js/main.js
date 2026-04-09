// === Voidborn — Main Entry Point ===

import { G, loadGame, saveGame, createHero, recalcHero, newGameState, setState, calcOfflineProgress } from './state.js';
import { CLASSES, STATS, STAT_DESC, STAT_DEFAULTS, STARTING_STAT_POINTS } from './config.js';
import { el } from './utils.js';
import { initRouter, registerTab, switchTab, renderActiveTab } from './ui/router.js';
import { renderHUD } from './ui/hud.js';
import { toast } from './ui/components.js';
import { renderRaidTab } from './ui/tabs/raid.js';
import { renderPartyTab } from './ui/tabs/party.js';
import { renderStashTab } from './ui/tabs/stash.js';
import { renderTownTab } from './ui/tabs/town.js';

// Initialize game
function init() {
  // Register tabs
  registerTab('raid', renderRaidTab);
  registerTab('party', renderPartyTab);
  registerTab('stash', renderStashTab);
  registerTab('town', renderTownTab);

  // Init router
  initRouter();

  // Try loading save
  const loaded = loadGame();

  if (loaded && G.heroes.length > 0) {
    // Existing save — calc offline progress
    const progress = calcOfflineProgress();
    renderHUD();
    switchTab('raid');

    // Show welcome back
    if (progress.minutes > 1) {
      const msgs = [];
      if (progress.gold > 0) msgs.push(`+${progress.gold} gold`);
      if (progress.energy > 0) msgs.push(`+${progress.energy} energy`);
      if (msgs.length > 0) {
        toast(`Welcome back! (${progress.minutes}m) ${msgs.join(', ')}`, 'info');
      }
    }
  } else {
    // New game — show character creation
    showCharacterCreation();
  }

  // Auto-save every 30 seconds
  setInterval(() => {
    if (G.heroes.length > 0) {
      saveGame();
    }
  }, 30000);

  // Energy regen tick every 60 seconds
  setInterval(() => {
    if (G.heroes.length > 0) {
      const rate = 1 + (G.buildings.generator || 0) * 0.5;
      G.energy = Math.min(G.maxEnergy, G.energy + rate);
      renderHUD();
    }
  }, 60000);
}

// Character creation screen
function showCharacterCreation() {
  const overlay = document.getElementById('char-create-overlay');
  const container = document.getElementById('char-create');
  overlay.classList.remove('hidden');
  container.innerHTML = '';

  let selectedClass = 'fighter';
  let stats = { ...STAT_DEFAULTS };
  let statPoints = STARTING_STAT_POINTS;
  let heroName = '';

  function render() {
    container.innerHTML = '';

    // Name input
    container.appendChild(el('div', { class: 'flex-col gap-sm', style: 'margin-bottom: 12px;' }, [
      el('label', { text: 'Hero Name', class: 'text-dim', style: 'font-size: 12px; font-weight: 600;' }),
      (() => {
        const input = el('input', {
          type: 'text',
          class: 'btn',
          style: 'background: var(--bg-dark); text-align: left; cursor: text;',
          value: heroName,
          placeholder: 'Enter name...',
        });
        input.oninput = (e) => { heroName = e.target.value; };
        return input;
      })(),
    ]));

    // Class selection
    container.appendChild(el('div', { class: 'text-dim', text: 'Choose Class', style: 'font-size: 12px; font-weight: 600; margin-bottom: 6px;' }));
    const classGrid = el('div', { class: 'grid-3', style: 'margin-bottom: 12px;' });

    for (const [id, cls] of Object.entries(CLASSES)) {
      const opt = el('div', {
        class: `class-option ${selectedClass === id ? 'selected' : ''}`,
      }, [
        el('div', { class: 'class-icon', text: cls.icon }),
        el('div', { class: 'class-name', text: cls.name }),
        el('div', { class: 'class-desc', text: cls.desc }),
      ]);
      opt.onclick = () => { selectedClass = id; render(); };
      classGrid.appendChild(opt);
    }
    container.appendChild(classGrid);

    // Stat allocation
    container.appendChild(el('div', { class: 'text-dim', text: `Allocate Stats (${statPoints} points remaining)`, style: 'font-size: 12px; font-weight: 600; margin-bottom: 6px;' }));

    const statsDiv = el('div', { style: 'margin-bottom: 12px;' });
    for (const stat of STATS) {
      const row = el('div', { class: 'stat-alloc' });
      row.appendChild(el('span', { class: 'stat-alloc-name', text: stat }));
      row.appendChild(el('span', { class: 'stat-alloc-desc', text: STAT_DESC[stat] }));

      const controls = el('div', { class: 'stat-alloc-controls' });

      const minusBtn = el('button', { class: 'stat-alloc-btn', text: '-' });
      minusBtn.disabled = stats[stat] <= STAT_DEFAULTS[stat];
      minusBtn.onclick = () => {
        if (stats[stat] > STAT_DEFAULTS[stat]) {
          stats[stat]--;
          statPoints++;
          render();
        }
      };

      const plusBtn = el('button', { class: 'stat-alloc-btn', text: '+' });
      plusBtn.disabled = statPoints <= 0;
      plusBtn.onclick = () => {
        if (statPoints > 0) {
          stats[stat]++;
          statPoints--;
          render();
        }
      };

      controls.appendChild(minusBtn);
      controls.appendChild(el('span', { class: 'stat-alloc-val', text: String(stats[stat]) }));
      controls.appendChild(plusBtn);

      row.appendChild(controls);
      statsDiv.appendChild(row);
    }
    container.appendChild(statsDiv);

    // Create button
    const createBtn = el('button', {
      class: 'btn btn-primary btn-block btn-lg',
      text: 'Begin Your Journey',
    });
    createBtn.disabled = !heroName.trim() || statPoints > 0;
    createBtn.onclick = () => {
      if (!heroName.trim()) { toast('Enter a name!', 'warning'); return; }
      if (statPoints > 0) { toast('Allocate all stat points!', 'warning'); return; }

      // Create hero and start game
      const freshState = newGameState();
      setState(freshState);

      const hero = createHero(heroName.trim(), selectedClass, stats);
      hero.isMain = true;
      recalcHero(hero);
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
      G.heroes.push(hero);
      G.raidParty = [hero.id];

      // Give starter gear
      giveStarterGear(hero);

      saveGame();
      overlay.classList.add('hidden');
      renderHUD();
      switchTab('raid');
      toast(`Welcome, ${hero.name}! Prepare for your first extraction.`, 'success');
    };
    container.appendChild(createBtn);
  }

  render();
}

function giveStarterGear(hero) {
  const { uid } = getUidHelper();
  const classId = hero.classId;

  let weapon, body;

  switch (classId) {
    case 'fighter':
      weapon = { id: uid(), name: 'Rusty Sword', icon: '\u2694\uFE0F', slot: 'weapon', weaponType: 'sword', size: 3, rarity: 'common', damageType: 'physical', twoHanded: false, dmgMin: 5, dmgMax: 9, accuracy: 12, statReq: {}, substats: [] };
      body = { id: uid(), name: 'Worn Chainmail', icon: '\uD83E\uDDE5', slot: 'body', size: 4, rarity: 'common', armor: 8, magicResist: 3, statReq: {}, substats: [] };
      break;
    case 'rogue':
      weapon = { id: uid(), name: 'Chipped Dagger', icon: '\uD83D\uDDE1\uFE0F', slot: 'weapon', weaponType: 'dagger', size: 1, rarity: 'common', damageType: 'physical', twoHanded: false, dmgMin: 4, dmgMax: 7, accuracy: 18, statReq: {}, substats: [] };
      body = { id: uid(), name: 'Tattered Leather', icon: '\uD83E\uDDE5', slot: 'body', size: 3, rarity: 'common', armor: 5, magicResist: 2, statReq: {}, substats: [] };
      break;
    case 'mage':
      weapon = { id: uid(), name: 'Cracked Wand', icon: '\uD83E\uDE84', slot: 'weapon', weaponType: 'wand', size: 1, rarity: 'common', damageType: 'magic', twoHanded: false, dmgMin: 5, dmgMax: 10, accuracy: 16, statReq: {}, substats: [] };
      body = { id: uid(), name: 'Faded Robes', icon: '\uD83E\uDDE5', slot: 'body', size: 2, rarity: 'common', armor: 2, magicResist: 8, statReq: {}, substats: [] };
      break;
  }

  const potion = { id: uid(), consumableId: 'health_potion', name: 'Health Potion', icon: '\u2764\uFE0F', size: 1, rarity: 'common', isConsumable: true, effect: 'heal', value: 30, desc: 'Restore 30 HP' };

  hero.gear.weapon = weapon;
  hero.gear.body = body;
  hero.inventory.push(potion);
}

function getUidHelper() {
  let counter = 0;
  return {
    uid: () => `starter_${Date.now().toString(36)}_${(++counter).toString(36)}`,
  };
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
