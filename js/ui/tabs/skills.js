// === Voidborn — Skills Tab (Phase 3) ===

import { el } from '../../utils.js';

export function renderSkillsTab() {
  const container = el('div', { class: 'flex-col gap-md' });
  container.appendChild(el('div', { class: 'section-title', text: 'Skill Training' }));
  container.appendChild(el('p', { class: 'text-dim', text: 'Coming soon — Idle skill training queues.' }));
  return container;
}
