// === Voidborn — Bounties Tab (Phase 4) ===

import { el } from '../../utils.js';

export function renderBountiesTab() {
  const container = el('div', { class: 'flex-col gap-md' });
  container.appendChild(el('div', { class: 'section-title', text: 'Bounty Board' }));
  container.appendChild(el('p', { class: 'text-dim', text: 'Coming soon — Raid bounties and faction reputation.' }));
  return container;
}
