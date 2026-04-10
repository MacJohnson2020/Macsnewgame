// === Voidborn — Skills Tab ===

import { G, getHero, saveGame, startTraining, stopTraining, isHeroTraining, getTrainingSlots, processSkillAction, getSkillStatBonuses } from '../../state.js';
import { SKILLS, SKILL_TIERS, SKILL_MAX_LEVEL, skillXpForLevel, MATERIALS, CLASSES } from '../../config.js';
import { el } from '../../utils.js';
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

  // Back button
  screen.appendChild(btn('\u2190 Back', 'btn-block', () => renderActiveTab()));
  content.appendChild(screen);
}
