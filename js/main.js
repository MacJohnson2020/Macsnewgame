// === Voidborn — Main Entry Point ===

import { G, loadGame, saveGame, createHero, recalcHero, newGameState, setState, calcOfflineProgress, giveStarterGear, processSkillAction } from './state.js';
import { CLASSES, STATS, STAT_DESC, STAT_DEFAULTS, STARTING_STAT_POINTS } from './config.js';
import { el, uid } from './utils.js';
import { initRouter, registerTab, switchTab, renderActiveTab } from './ui/router.js';
import { renderHUD } from './ui/hud.js';
import { toast } from './ui/components.js';
import { renderRaidTab } from './ui/tabs/raid.js';
import { renderPartyTab } from './ui/tabs/party.js';
import { renderStashTab } from './ui/tabs/stash.js';
import { renderTownTab } from './ui/tabs/town.js';
import { renderBountiesTab } from './ui/tabs/bounties.js';
import { renderSkillsTab } from './ui/tabs/skills.js';

// Initialize game
function init() {
  // Register tabs
  registerTab('raid', renderRaidTab);
  registerTab('party', renderPartyTab);
  registerTab('stash', renderStashTab);
  registerTab('skills', renderSkillsTab);
  registerTab('town', renderTownTab);
  registerTab('bounties', renderBountiesTab);

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

  // Skill training tick every 2 minutes (120 seconds)
  setInterval(() => {
    if (G.trainingQueues.length === 0) return;
    for (const queue of G.trainingQueues) {
      if (queue.actionsLeft > 0) {
        processSkillAction(queue.skillId, queue.heroId);
        queue.actionsLeft--;
      }
    }
    G.trainingQueues = G.trainingQueues.filter(q => q.actionsLeft > 0);
    saveGame();
  }, 120000);
}

// Character creation screen
function showCharacterCreation() {
  const overlay = document.getElementById('char-create-overlay');
  const container = document.getElementById('char-create');
  overlay.classList.remove('hidden');
  container.innerHTML = '';

  let selectedClass = 'berserker';
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

      // Give starter gear + 3 health potions for new characters
      giveStarterGear(hero);
      for (let i = 0; i < 3; i++) {
        hero.inventory.push({ id: uid(), consumableId: 'health_potion', name: 'Health Potion', icon: '\u2764\uFE0F', size: 1, rarity: 'common', isConsumable: true, effect: 'heal', value: 30, desc: 'Restore 30 HP' });
      }

      saveGame();
      overlay.classList.add('hidden');
      renderHUD();
      switchTab('raid');
      showTutorial(hero.name);
    };
    container.appendChild(createBtn);
  }

  render();
}

// Tutorial for new players
function showTutorial(heroName) {
  const steps = [
    { title: `Welcome, ${heroName}!`, text: 'Voidborn is an extraction RPG. Deploy into corrupted zones, fight enemies, collect loot, and extract alive to keep it all.' },
    { title: 'Raids', text: 'Select your party and a zone on the Raid tab. Step through a branching path of encounters. Mystery nodes could be chests, traps, shrines, or merchants.' },
    { title: 'Combat', text: 'Fight turn-based battles. Use abilities, items, or set auto-battle. Check enemy weaknesses — holy wrecks undead, fire kills beasts.' },
    { title: 'Extraction', text: 'Reach an extraction point to keep your loot. If you die, you lose carried items but heroes revive in town with starter gear.' },
    { title: 'Party', text: 'Hire more heroes from the Tavern on the Party tab. Up to 4 per raid. Each class has unique abilities.' },
    { title: 'Bounties', text: 'Check the Bounties tab for faction quests. Complete them for gold and reputation. Higher rep unlocks perks and faction shops.' },
    { title: 'Good luck!', text: 'Start with the Rust Crypts — undead enemies, weak to holy and fire. You have 3 health potions. Use them wisely.' },
  ];

  let step = 0;

  function showStep() {
    // Remove existing tutorial overlay
    const existing = document.querySelector('.tutorial-overlay');
    if (existing) existing.remove();

    if (step >= steps.length) return;

    const s = steps[step];
    const overlay = el('div', { class: 'tutorial-overlay' });
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;';

    const card = el('div', { class: 'card', style: 'max-width:360px;width:100%;padding:20px;text-align:center;' });
    card.appendChild(el('div', { class: 'text-bright', text: s.title, style: 'font-size: 18px; font-weight: 700; margin-bottom: 8px;' }));
    card.appendChild(el('p', { class: 'text-dim', text: s.text, style: 'font-size: 13px; margin-bottom: 16px; line-height: 1.5;' }));

    const btnRow = el('div', { class: 'flex gap-sm', style: 'justify-content: center;' });
    if (step < steps.length - 1) {
      btnRow.appendChild(el('button', { class: 'btn btn-primary', text: 'Next', onclick: () => { step++; showStep(); } }));
      btnRow.appendChild(el('button', { class: 'btn btn-sm', text: 'Skip', onclick: () => { overlay.remove(); } }));
    } else {
      btnRow.appendChild(el('button', { class: 'btn btn-success btn-lg', text: 'Start Playing', onclick: () => { overlay.remove(); } }));
    }
    card.appendChild(btnRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  showStep();
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
