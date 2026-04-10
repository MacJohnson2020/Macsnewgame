// === Voidborn — Skills Tab ===

import { G, getHero, saveGame, startTraining, stopTraining, isHeroTraining, getTrainingSlots, processSkillAction, getSkillStatBonuses } from '../../state.js';
import { SKILLS, SKILL_TIERS, SKILL_MAX_LEVEL, skillXpForLevel, MATERIALS, CLASSES, RECIPES, getRecipesForSkill, canCraftRecipe } from '../../config.js';
import { el, uid } from '../../utils.js';
import { generateGear } from '../../raid/entities.js';
import { btn, toast, progressBar, statRow } from '../components.js';
import { renderActiveTab } from '../router.js';
import { renderHUD } from '../hud.js';

export function renderSkillsTab() {
  const container = el('div', { class: 'flex-col gap-md' });

  // Training slots status
  const slots = getTrainingSlots();
  const used = G.trainingQueues.length;
  container.appendChild(el('div', { class: 'section-title', text: 'Skills' }));
  container.appendChild(el('div', { class: 'text-dim', text: `Training slots: ${used}/${slots} (upgrade Workshop for more)`, style: 'font-size: 11px; margin-bottom: 8px;' }));

  // Active training
  if (G.trainingQueues.length > 0) {
    container.appendChild(el('div', { class: 'text-dim', text: 'Active Training', style: 'font-weight: 600; margin-bottom: 4px;' }));
    for (const queue of G.trainingQueues) {
      const hero = getHero(queue.heroId);
      const skillDef = SKILLS[queue.skillId];
      if (!hero || !skillDef) continue;
      const cls = CLASSES[hero.classId];

      const card = el('div', { class: 'card rarity-rare', style: 'margin-bottom: 6px; padding: 8px;' });
      card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center;' }, [
        el('span', { text: cls.icon, style: 'font-size: 18px;' }),
        el('span', { class: 'text-bright', text: hero.name, style: 'font-weight: 600; font-size: 12px;' }),
        el('span', { class: 'text-dim', text: '\u2192', style: 'font-size: 12px;' }),
        el('span', { text: skillDef.icon, style: 'font-size: 18px;' }),
        el('span', { class: 'text-bright', text: skillDef.name, style: 'font-weight: 600; font-size: 12px; flex: 1;' }),
      ]));
      card.appendChild(el('div', { class: 'text-dim', text: `${queue.actionsLeft} actions left (~${queue.actionsLeft * 2} min)`, style: 'font-size: 10px; margin-top: 4px;' }));
      card.appendChild(btn('Stop', 'btn-sm btn-danger', () => {
        stopTraining(queue.heroId);
        saveGame();
        renderActiveTab();
        toast(`${hero.name} stopped training`, 'info');
      }));
      container.appendChild(card);
    }
    container.appendChild(el('div', { class: 'divider' }));
  }

  // Skill stat bonuses summary
  const bonuses = getSkillStatBonuses();
  const anyBonus = Object.values(bonuses).some(v => v > 0);
  if (anyBonus) {
    const bonusText = Object.entries(bonuses).filter(([,v]) => v > 0).map(([s,v]) => `+${v} ${s}`).join('  ');
    container.appendChild(el('div', { class: 'text-success', text: `Skill bonuses: ${bonusText}`, style: 'font-size: 11px; margin-bottom: 8px;' }));
  }

  // Skill list by type
  const types = [
    { key: 'gathering', label: 'Gathering' },
    { key: 'crafting', label: 'Crafting' },
    { key: 'training', label: 'Training' },
  ];

  for (const type of types) {
    container.appendChild(el('div', { class: 'text-dim', text: type.label, style: 'font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; margin-top: 8px;' }));

    const skills = Object.values(SKILLS).filter(s => s.type === type.key);
    for (const skillDef of skills) {
      const skill = G.skills[skillDef.id];
      const level = skill?.level || 1;
      const xp = skill?.xp || 0;
      const nextXp = level < SKILL_MAX_LEVEL ? skillXpForLevel(level + 1) : 0;
      const isMax = level >= SKILL_MAX_LEVEL;

      const card = el('div', { class: 'card', style: 'margin-bottom: 6px; padding: 8px; cursor: pointer;' });
      card.appendChild(el('div', { class: 'flex gap-sm', style: 'align-items: center;' }, [
        el('span', { text: skillDef.icon, style: 'font-size: 20px;' }),
        el('div', { style: 'flex: 1;' }, [
          el('div', { class: 'text-bright', text: `${skillDef.name} — Lv.${level}`, style: 'font-weight: 700; font-size: 13px;' }),
          el('div', { class: 'text-dim', text: `${skillDef.desc} | +${skillDef.statBonus} every 10 levels`, style: 'font-size: 10px;' }),
        ]),
      ]));

      if (!isMax) {
        card.appendChild(progressBar(xp, nextXp, 'xp', true));
      } else {
        card.appendChild(el('div', { class: 'text-success', text: 'MAX LEVEL', style: 'font-size: 11px; font-weight: 700;' }));
      }

      card.onclick = () => showSkillDetail(skillDef);
      container.appendChild(card);
    }
  }

  return container;
}

function showSkillDetail(skillDef) {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const screen = el('div', { class: 'flex-col gap-md' });
  const skill = G.skills[skillDef.id];
  const level = skill?.level || 1;
  const xp = skill?.xp || 0;
  const nextXp = level < SKILL_MAX_LEVEL ? skillXpForLevel(level + 1) : 0;

  // Header
  screen.appendChild(el('div', { class: 'encounter-card', style: 'padding: 12px;' }, [
    el('div', { text: skillDef.icon, style: 'font-size: 36px; text-align: center;' }),
    el('div', { class: 'text-bright', text: `${skillDef.name} — Level ${level}`, style: 'font-size: 18px; font-weight: 700; text-align: center;' }),
    el('div', { class: 'text-dim', text: skillDef.desc, style: 'font-size: 12px; text-align: center; margin-top: 4px;' }),
  ]));

  if (level < SKILL_MAX_LEVEL) {
    screen.appendChild(progressBar(xp, nextXp, 'xp', true));
  }

  // Current tier info
  const tier = [...SKILL_TIERS].reverse().find(t => level >= t.level) || SKILL_TIERS[0];
  screen.appendChild(el('div', { class: 'text-dim', text: `Tier ${tier.tier}: ${tier.xp} XP per action, ${tier.time} min`, style: 'font-size: 11px; text-align: center; margin: 4px 0;' }));

  // Assign hero to train
  screen.appendChild(el('div', { class: 'text-dim', text: 'Assign a hero to train:', style: 'font-weight: 600; margin-top: 8px; margin-bottom: 4px;' }));

  const slots = getTrainingSlots();
  const usedSlots = G.trainingQueues.length;

  for (const hero of G.heroes) {
    const cls = CLASSES[hero.classId];
    const training = isHeroTraining(hero.id);
    const inRaid = G.activeRaid && G.activeRaid.party.includes(hero.id);
    const currentQueue = G.trainingQueues.find(q => q.heroId === hero.id);

    const row = el('div', { class: 'card', style: 'margin-bottom: 4px; padding: 8px; display: flex; align-items: center; gap: 8px;' });
    row.appendChild(el('span', { text: cls.icon, style: 'font-size: 18px;' }));
    row.appendChild(el('div', { style: 'flex: 1;' }, [
      el('span', { class: 'text-bright', text: hero.name, style: 'font-weight: 600; font-size: 12px;' }),
      training && currentQueue
        ? el('span', { class: 'text-dim', text: ` (training ${SKILLS[currentQueue.skillId]?.name})`, style: 'font-size: 10px;' })
        : inRaid
          ? el('span', { class: 'text-danger', text: ' (in raid)', style: 'font-size: 10px;' })
          : el('span', { class: 'text-success', text: ' (available)', style: 'font-size: 10px;' }),
    ]));

    if (training) {
      row.appendChild(btn('Stop', 'btn-sm btn-danger', () => {
        stopTraining(hero.id);
        saveGame();
        showSkillDetail(skillDef);
        toast(`${hero.name} stopped training`, 'info');
      }));
    } else if (!inRaid && usedSlots < slots) {
      row.appendChild(btn('Train', 'btn-sm btn-success', () => {
        if (startTraining(hero.id, skillDef.id)) {
          saveGame();
          showSkillDetail(skillDef);
          toast(`${hero.name} started training ${skillDef.name}`, 'success');
        } else {
          toast('Cannot start training', 'danger');
        }
      }));
    } else if (!inRaid) {
      row.appendChild(el('span', { class: 'text-dim', text: 'No slots', style: 'font-size: 10px;' }));
    }

    screen.appendChild(row);
  }

  // What this skill produces (gathering)
  if (skillDef.type === 'gathering') {
    screen.appendChild(el('div', { class: 'divider' }));
    screen.appendChild(el('div', { class: 'text-dim', text: 'Materials at your level:', style: 'font-weight: 600; margin-bottom: 4px;' }));

    const allMats = Object.entries(MATERIALS)
      .filter(([, m]) => m.skill === skillDef.id && !m.rare && m.level <= level);
    for (const [matId, mat] of allMats) {
      const count = G.materials[matId] || 0;
      screen.appendChild(el('div', { style: 'display: flex; align-items: center; gap: 6px; margin-bottom: 2px;' }, [
        el('span', { text: mat.icon }),
        el('span', { class: 'text-bright', text: mat.name, style: 'font-size: 12px; flex: 1;' }),
        el('span', { class: level >= mat.level ? 'text-success' : 'text-dim', text: `Lv.${mat.level}`, style: 'font-size: 10px;' }),
        el('span', { class: 'text-warning', text: `x${count}`, style: 'font-size: 12px; font-weight: 700;' }),
      ]));
    }

    // Rare drops
    const rares = Object.entries(MATERIALS)
      .filter(([, m]) => m.skill === skillDef.id && m.rare && m.level <= level);
    if (rares.length > 0) {
      screen.appendChild(el('div', { class: 'text-dim', text: 'Rare drops:', style: 'font-weight: 600; margin-top: 6px; margin-bottom: 4px;' }));
      for (const [matId, mat] of rares) {
        const count = G.materials[matId] || 0;
        screen.appendChild(el('div', { style: 'display: flex; align-items: center; gap: 6px; margin-bottom: 2px;' }, [
          el('span', { text: mat.icon }),
          el('span', { class: 'text-bright', text: mat.name, style: 'font-size: 12px; flex: 1;' }),
          el('span', { class: 'text-dim', text: `${mat.dropPct}%`, style: 'font-size: 10px;' }),
          el('span', { class: 'text-warning', text: `x${count}`, style: 'font-size: 12px; font-weight: 700;' }),
        ]));
      }
    }
  }

  // Recipes (crafting skills)
  if (skillDef.type === 'crafting') {
    screen.appendChild(el('div', { class: 'divider' }));
    screen.appendChild(el('div', { class: 'text-dim', text: 'Recipes:', style: 'font-weight: 600; margin-bottom: 4px;' }));

    const recipes = getRecipesForSkill(skillDef.id, level);
    if (recipes.length === 0) {
      screen.appendChild(el('div', { class: 'text-dim', text: 'No recipes available at this level.', style: 'font-size: 11px;' }));
    }

    for (const [recipeId, recipe] of recipes) {
      const canCraft = canCraftRecipe(recipeId, G.materials);
      const card = el('div', { class: `card ${canCraft ? '' : ''}`, style: `margin-bottom: 4px; padding: 8px; ${canCraft ? '' : 'opacity: 0.5;'}` });

      card.appendChild(el('div', { class: 'text-bright', text: `${recipe.name} (Lv.${recipe.level})`, style: 'font-size: 12px; font-weight: 600;' }));

      // Material costs
      const matRow = el('div', { style: 'display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px;' });
      for (const [matId, needed] of Object.entries(recipe.materials)) {
        const mat = MATERIALS[matId];
        const have = G.materials[matId] || 0;
        const enough = have >= needed;
        matRow.appendChild(el('span', {
          class: enough ? 'text-success' : 'text-danger',
          text: `${mat ? mat.icon : ''} ${mat ? mat.name : matId}: ${have}/${needed}`,
          style: 'font-size: 10px; background: var(--bg-dark); padding: 1px 4px; border-radius: 3px;',
        }));
      }
      if (recipe.fuel) {
        matRow.appendChild(el('span', { class: 'text-dim', text: `+ 1 fuel (log)`, style: 'font-size: 10px;' }));
      }
      card.appendChild(matRow);

      // Output description
      if (recipe.output) {
        const desc = recipe.type === 'consumable' ? `${recipe.output.effect}: ${recipe.output.value || ''}${recipe.doses ? ` (${recipe.doses} doses)` : ''}`
          : recipe.type === 'food' ? `${recipe.output.effect}: ${recipe.output.value || ''}`
          : recipe.type === 'ammo' ? Object.entries(recipe.output).filter(([k]) => k !== 'subtype').map(([k,v]) => `+${v} ${k}`).join(', ')
          : '';
        if (desc) card.appendChild(el('div', { class: 'text-dim', text: desc, style: 'font-size: 10px; margin-top: 2px;' }));
      }
      if (recipe.substats) {
        const subText = recipe.substats.map(s => `+${s.value} ${s.id}`).join(', ');
        card.appendChild(el('div', { class: 'text-accent', text: subText, style: 'font-size: 10px; margin-top: 2px;' }));
      }

      if (canCraft) {
        card.appendChild(btn('Craft', 'btn-sm btn-success', () => {
          craftRecipe(recipeId, skillDef);
          showSkillDetail(skillDef);
        }));
      }

      screen.appendChild(card);
    }

    // Locked recipes preview
    const locked = Object.entries(RECIPES)
      .filter(([, r]) => r.skill === skillDef.id && r.level > level)
      .sort((a, b) => a[1].level - b[1].level)
      .slice(0, 3);
    if (locked.length > 0) {
      screen.appendChild(el('div', { class: 'text-dim', text: 'Upcoming:', style: 'font-weight: 600; margin-top: 8px; margin-bottom: 4px;' }));
      for (const [, recipe] of locked) {
        screen.appendChild(el('div', { class: 'text-dim', text: `Lv.${recipe.level}: ${recipe.name}`, style: 'font-size: 10px; opacity: 0.5;' }));
      }
    }
  }

  // Back button
  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}

// Execute a crafting recipe
function craftRecipe(recipeId, skillDef) {
  const recipe = RECIPES[recipeId];
  if (!recipe || !canCraftRecipe(recipeId, G.materials)) return;

  // Consume materials
  for (const [matId, needed] of Object.entries(recipe.materials)) {
    G.materials[matId] -= needed;
  }

  // Consume fuel for cooking
  if (recipe.fuel) {
    const fuelUsed = consumeFuel();
    if (!fuelUsed) { toast('No logs for fuel!', 'danger'); return; }
  }

  // Award XP
  const skill = G.skills[skillDef.id];
  if (skill && skill.level < SKILL_MAX_LEVEL) {
    skill.xp += recipe.xp;
    while (skill.level < SKILL_MAX_LEVEL) {
      const needed = skillXpForLevel(skill.level + 1);
      if (skill.xp < needed) break;
      skill.xp -= needed;
      skill.level++;
      toast(`${skillDef.name} leveled to ${skill.level}!`, 'success');
    }
  }

  // Produce output
  const qty = recipe.doses || recipe.qty || 1;
  for (let i = 0; i < qty; i++) {
    if (recipe.type === 'consumable' || recipe.type === 'food' || recipe.type === 'throwable') {
      G.stash.push({
        id: uid(), name: recipe.name.replace(/ \(\d\)/, ''), icon: getRecipeIcon(recipe),
        size: 1, rarity: 'common', isConsumable: true,
        effect: recipe.output.effect, value: recipe.output.value || 0,
        desc: `${recipe.output.effect}: ${recipe.output.value || ''}`,
      });
    } else if (recipe.type === 'ammo') {
      G.stash.push({
        id: uid(), name: recipe.name, icon: getRecipeIcon(recipe),
        slot: 'ammo', size: 1, rarity: 'common', substats: [],
        ...recipe.output,
      });
    } else if (recipe.type === 'weapon' || recipe.type === 'armor') {
      // Smithing generates random gear at the recipe's tier
      const item = generateGear(Math.ceil(recipe.level / 10));
      // Force the correct slot type
      if (recipe.type === 'armor' && !['body','head','legs','hands','feet','cape'].includes(item.slot)) {
        item.slot = 'body'; // fallback
      }
      item.name = recipe.name.replace(' Weapon', '').replace(' Armor', '') + ' ' + (item.name.split(' ').pop());
      G.stash.push(item);
    } else if (recipe.type === 'enchant') {
      // Enchants are stored as items in stash, applied later
      G.stash.push({
        id: uid(), name: recipe.name, icon: '\u2728',
        size: 1, rarity: 'rare', isEnchant: true,
        enchantSlots: recipe.slots, substats: recipe.substats,
        desc: recipe.substats.map(s => `+${s.value} ${s.id}`).join(', '),
      });
    }
  }

  saveGame();
  toast(`Crafted ${recipe.name}!`, 'success');
}

function getRecipeIcon(recipe) {
  if (recipe.type === 'food') return '\uD83C\uDF73';
  if (recipe.type === 'consumable') return '\u2697\uFE0F';
  if (recipe.type === 'throwable') return '\uD83D\uDCA3';
  if (recipe.type === 'ammo') return '\uD83C\uDFF9';
  return '\uD83D\uDD28';
}

function consumeFuel() {
  // Find best available log (highest fuel uses first)
  const logMats = Object.entries(MATERIALS)
    .filter(([, m]) => m.skill === 'woodcutting' && !m.rare && m.fuelUses)
    .sort((a, b) => b[1].fuelUses - a[1].fuelUses);

  for (const [matId] of logMats) {
    if ((G.materials[matId] || 0) > 0) {
      G.materials[matId]--;
      return true;
    }
  }
  return false;
}

