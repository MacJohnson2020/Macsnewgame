import { SKILLS } from '../data/skills.js';
import { MONSTERS } from '../data/monsters.js';
import { getLevel, getXp, getMaxHp } from '../core/state.js';
import { xpForLevel, XP_TABLE_99 } from '../core/xp.js';

const CATEGORY_LABELS = {
  combat: 'Combat',
  gathering: 'Gathering',
  production: 'Production',
  support: 'Support',
  complex: 'Complex',
};

function renderSkillsPanel(state) {
  const byCategory = {};
  for (const skill of Object.values(SKILLS)) {
    (byCategory[skill.category] ??= []).push(skill);
  }

  const sections = Object.entries(byCategory)
    .map(([category, skills]) => {
      const rows = skills
        .map((skill) => {
          const level = getLevel(state, skill.id);
          return `<li class="skill-row"><span>${skill.name}</span><span>${level}</span></li>`;
        })
        .join('');
      return `<div class="skill-category"><h3>${CATEGORY_LABELS[category]}</h3><ul>${rows}</ul></div>`;
    })
    .join('');

  return `<div class="panel skills-panel"><h2>Skills</h2>${sections}</div>`;
}

function renderActivityPanel(state) {
  const maxHp = getMaxHp(state);
  const currentHp = state.combat.currentHp;
  const hpPercent = Math.round((currentHp / maxHp) * 100);

  const inCombat = state.activity.type === 'combat';
  const isChopping = state.activity.type === 'woodcutting';
  const monster = inCombat ? MONSTERS[state.combat.monsterId] : null;

  const woodcuttingXp = getXp(state, 'woodcutting');
  const woodcuttingLevel = getLevel(state, 'woodcutting');
  const wcProgress = renderXpBar(woodcuttingXp, woodcuttingLevel, XP_TABLE_99);

  return `
    <div class="panel activity-panel">
      <h2>Millbrook</h2>
      <div class="stat-row">
        <span>Logs: ${state.inventory.logs || 0}</span>
        <span>Gold: ${state.inventory.gold || 0}</span>
      </div>
      <div class="hp-bar-wrap">
        <div class="hp-bar-label">HP: ${currentHp} / ${maxHp}</div>
        <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpPercent}%"></div></div>
      </div>
      <div class="actions">
        <button data-action="chop" ${isChopping ? 'disabled' : ''}>Chop Trees (Woodcutting)</button>
        <button data-action="fight" ${inCombat ? 'disabled' : ''}>Fight Wild Boar</button>
        <button data-action="stop" ${state.activity.type ? '' : 'disabled'}>Stop</button>
      </div>
      ${isChopping ? `<div class="progress-note">Woodcutting: ${wcProgress}</div>` : ''}
      ${inCombat && monster ? `<div class="progress-note">Fighting ${monster.name}: ${state.combat.monsterHp} / ${monster.maxHp} HP</div>` : ''}
    </div>
  `;
}

function renderXpBar(xp, level, table) {
  const nextLevelXp = xpForLevel(level + 1, table);
  const currentLevelXp = xpForLevel(level, table);
  if (!nextLevelXp) return `Level ${level} (max)`;
  const progress = Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
  return `Level ${level}, ${progress}% to ${level + 1}`;
}

function renderLogPanel(state) {
  const entries = state.log.map((message) => `<li>${message}</li>`).join('');
  return `<div class="panel log-panel"><h2>Activity Log</h2><ul id="log-list">${entries}</ul></div>`;
}

export function renderApp(state) {
  return `
    <div class="game-layout">
      ${renderSkillsPanel(state)}
      <div class="main-column">
        ${renderActivityPanel(state)}
        ${renderLogPanel(state)}
      </div>
    </div>
  `;
}

export function scrollLogToBottom() {
  const logList = document.getElementById('log-list');
  if (logList) {
    logList.scrollTop = logList.scrollHeight;
  }
}
