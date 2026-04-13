// === Voidborn — HUD (Top Bar) ===

import { G, getMainHero, deleteSave, saveGame, listSaveSlots, getActiveSlot, setActiveSlot, loadGame, setState, newGameState, MAX_SAVE_SLOTS } from '../state.js';
import { ACHIEVEMENTS, CLASSES } from '../config.js';
import { el, fmtNum } from '../utils.js';

export function renderHUD() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.innerHTML = '';

  const main = getMainHero();

  // Gold
  hud.appendChild(hudStat('\uD83D\uDCB0', fmtNum(G.gold)));

  // Energy
  hud.appendChild(hudStat('\u26A1', `${G.energy}/${G.maxEnergy}`));

  // Main hero level
  if (main) {
    hud.appendChild(hudStat('\u2B50', `Lv.${main.level}`));
  }

  // In-raid indicator
  if (G.activeRaid) {
    const badge = el('span', {
      class: 'tag',
      text: `\uD83D\uDDE1\uFE0F ${G.activeRaid.zoneName}`,
      style: 'color: var(--danger); border-color: var(--danger); margin-left: auto;',
    });
    hud.appendChild(badge);
  }

  // Settings button
  const settingsBtn = el('button', {
    text: '\u2699\uFE0F',
    style: 'background:none;border:none;font-size:18px;cursor:pointer;margin-left:auto;padding:4px;',
  });
  settingsBtn.onclick = showSettings;
  hud.appendChild(settingsBtn);
}

// Settings overlay
function showSettings() {
  // Remove any existing
  document.querySelectorAll('.settings-overlay').forEach(o => o.remove());

  const overlay = el('div', { class: 'settings-overlay' });
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const card = el('div', { class: 'card', style: 'max-width:380px;width:100%;padding:18px;max-height:80vh;overflow-y:auto;' });
  card.appendChild(el('div', { class: 'text-bright', text: 'Settings', style: 'font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 12px;' }));

  // Save slots
  const slotsBtn = el('button', {
    class: 'btn btn-block', text: `\uD83D\uDCBF Save Slots (Slot ${getActiveSlot() + 1})`,
    style: 'margin-bottom: 8px;',
  });
  slotsBtn.onclick = () => {
    overlay.remove();
    showSaveSlots();
  };
  card.appendChild(slotsBtn);

  // Game stats summary
  const statsCard = el('div', { class: 'card', style: 'padding: 10px; margin-bottom: 8px; background: var(--bg-dark);' });
  statsCard.appendChild(el('div', { class: 'text-dim', text: 'Game Stats', style: 'font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;' }));
  statsCard.appendChild(el('div', { class: 'text-dim', text: `Total raids: ${G.totalRaids || 0}`, style: 'font-size: 11px;' }));
  statsCard.appendChild(el('div', { class: 'text-dim', text: `Extractions: ${G.totalExtractions || 0}`, style: 'font-size: 11px;' }));
  statsCard.appendChild(el('div', { class: 'text-dim', text: `Deaths: ${G.totalDeaths || 0}`, style: 'font-size: 11px;' }));
  statsCard.appendChild(el('div', { class: 'text-dim', text: `Heroes: ${G.heroes?.length || 0}`, style: 'font-size: 11px;' }));
  statsCard.appendChild(el('div', { class: 'text-dim', text: `Achievements: ${(G.achievements || []).length}/${ACHIEVEMENTS.length}`, style: 'font-size: 11px;' }));
  if (G.created) {
    const days = Math.floor((Date.now() - G.created) / (1000 * 60 * 60 * 24));
    statsCard.appendChild(el('div', { class: 'text-dim', text: `Playing for: ${days} day${days !== 1 ? 's' : ''}`, style: 'font-size: 11px;' }));
  }
  card.appendChild(statsCard);

  // Achievements button
  const achBtn = el('button', {
    class: 'btn btn-block', text: '\uD83C\uDFC6 View Achievements',
    style: 'margin-bottom: 6px;',
  });
  achBtn.onclick = () => {
    overlay.remove();
    showAchievements();
  };
  card.appendChild(achBtn);

  // Replay tutorial
  const tutBtn = el('button', {
    class: 'btn btn-block', text: '\uD83D\uDCD6 Replay Tutorial',
    style: 'margin-bottom: 6px;',
  });
  tutBtn.onclick = () => {
    overlay.remove();
    if (window._voidbornShowTutorial) window._voidbornShowTutorial();
  };
  card.appendChild(tutBtn);

  // Reset contextual tips
  const tipsBtn = el('button', {
    class: 'btn btn-block', text: '\uD83D\uDCA1 Reset Contextual Tips',
    style: 'margin-bottom: 6px;',
  });
  tipsBtn.onclick = () => {
    G.seenTips = [];
    saveGame();
    overlay.remove();
    // Show toast
    const t = el('div', { text: 'Tips will show again next time they trigger', style: 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--success);color:#000;padding:8px 16px;border-radius:4px;z-index:101;font-size:12px;' });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };
  card.appendChild(tipsBtn);

  // Keyboard shortcuts info
  const kbCard = el('div', { class: 'card', style: 'padding: 8px; margin-bottom: 8px; background: var(--bg-dark);' });
  kbCard.appendChild(el('div', { class: 'text-dim', text: 'Keyboard Shortcuts', style: 'font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;' }));
  kbCard.appendChild(el('div', { class: 'text-dim', text: '1-6: Switch tabs  ·  S: Settings  ·  Esc: Close modal', style: 'font-size: 10px;' }));
  card.appendChild(kbCard);

  // Save management
  card.appendChild(el('div', { class: 'text-dim', text: 'Save Management', style: 'font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;' }));

  // Manual save
  const saveBtn = el('button', {
    class: 'btn btn-primary btn-block', text: '\uD83D\uDCBE Save Now',
    style: 'margin-bottom: 6px;',
  });
  saveBtn.onclick = () => {
    saveGame();
    const toast = el('div', { class: 'text-success', text: 'Saved!', style: 'text-align: center; font-size: 11px; margin-top: 4px;' });
    saveBtn.parentNode.insertBefore(toast, saveBtn.nextSibling);
    setTimeout(() => toast.remove(), 1500);
  };
  card.appendChild(saveBtn);

  // Export save
  const exportBtn = el('button', {
    class: 'btn btn-block', text: '\uD83D\uDCE4 Export Save',
    style: 'margin-bottom: 6px;',
  });
  exportBtn.onclick = () => {
    const slot = getActiveSlot();
    const key = slot === 0 ? 'voidborn_save' : `voidborn_save_${slot}`;
    const data = localStorage.getItem(key);
    if (!data) return;
    // Copy to clipboard
    navigator.clipboard?.writeText(data).then(() => {
      const t = el('div', { class: 'text-success', text: 'Save copied to clipboard!', style: 'text-align: center; font-size: 11px; margin-top: 4px;' });
      exportBtn.parentNode.insertBefore(t, exportBtn.nextSibling);
      setTimeout(() => t.remove(), 2000);
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'voidborn_save.json'; a.click();
      URL.revokeObjectURL(url);
    });
  };
  card.appendChild(exportBtn);

  // Import save
  const importBtn = el('button', {
    class: 'btn btn-block', text: '\uD83D\uDCE5 Import Save',
    style: 'margin-bottom: 6px;',
  });
  importBtn.onclick = () => {
    const text = prompt('Paste your save data here:');
    if (!text) return;
    try {
      JSON.parse(text); // validate
      const slot = getActiveSlot();
      const key = slot === 0 ? 'voidborn_save' : `voidborn_save_${slot}`;
      localStorage.setItem(key, text);
      alert('Save imported! Reloading...');
      location.reload();
    } catch (e) {
      alert('Invalid save data.');
    }
  };
  card.appendChild(importBtn);

  card.appendChild(el('div', { class: 'divider', style: 'margin: 8px 0;' }));

  // Danger zone
  card.appendChild(el('div', { class: 'text-danger', text: 'Danger Zone', style: 'font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;' }));

  const resetBtn = el('button', {
    class: 'btn btn-danger btn-block', text: '\uD83D\uDDD1\uFE0F Reset Game',
    style: 'margin-bottom: 6px;',
  });
  resetBtn.onclick = () => {
    if (confirm('Reset game? This deletes ALL progress permanently.')) {
      if (confirm('Are you ABSOLUTELY sure? This cannot be undone.')) {
        deleteSave();
        location.reload();
      }
    }
  };
  card.appendChild(resetBtn);

  // Close
  const closeBtn = el('button', {
    class: 'btn btn-block', text: 'Close',
    style: 'margin-top: 8px;',
  });
  closeBtn.onclick = () => overlay.remove();
  card.appendChild(closeBtn);

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// Save slot picker overlay
function showSaveSlots() {
  document.querySelectorAll('.slots-overlay').forEach(o => o.remove());

  const overlay = el('div', { class: 'slots-overlay' });
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const card = el('div', { class: 'card', style: 'max-width:400px;width:100%;padding:16px;max-height:85vh;overflow-y:auto;' });
  card.appendChild(el('div', { class: 'text-bright', text: 'Save Slots', style: 'font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 8px;' }));
  card.appendChild(el('div', { class: 'text-dim', text: 'Switch between saves. Progress in the current slot is saved automatically before switching.', style: 'font-size: 11px; text-align: center; margin-bottom: 12px;' }));

  const slots = listSaveSlots();
  const activeSlot = getActiveSlot();

  for (const info of slots) {
    const isActive = info.slot === activeSlot;
    const row = el('div', { class: `card ${isActive ? 'rarity-rare' : ''}`, style: `padding: 10px; margin-bottom: 6px; ${isActive ? 'border-color: var(--accent);' : ''}` });

    const header = el('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;' });
    header.appendChild(el('span', { class: 'text-bright', text: `Slot ${info.slot + 1}`, style: 'font-weight: 700; font-size: 13px;' }));
    if (isActive) {
      header.appendChild(el('span', { class: 'text-success', text: '(Active)', style: 'font-size: 10px;' }));
    }
    row.appendChild(header);

    if (info.empty) {
      row.appendChild(el('div', { class: 'text-dim', text: 'Empty slot', style: 'font-size: 11px; margin-bottom: 4px;' }));
      row.appendChild(el('button', {
        class: 'btn btn-sm btn-block', text: 'Start New Game',
        onclick: () => {
          if (!confirm(`Start a new game in Slot ${info.slot + 1}?`)) return;
          // Save current slot first
          if (G.heroes && G.heroes.length > 0) saveGame();
          setActiveSlot(info.slot);
          overlay.remove();
          // Reset state and show character creation
          setState(newGameState());
          location.reload();
        },
      }));
    } else {
      const cls = CLASSES[info.className] || { name: 'Unknown', icon: '?' };
      row.appendChild(el('div', { class: 'text-dim', text: `${cls.icon} ${info.heroName} — Lv.${info.level} ${cls.name}`, style: 'font-size: 11px;' }));
      row.appendChild(el('div', { class: 'text-dim', text: `${info.heroCount} heroes · ${info.gold}g · ${info.raids} raids`, style: 'font-size: 10px;' }));
      if (info.lastSave) {
        const ago = Math.floor((Date.now() - info.lastSave) / 60000);
        const agoText = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
        row.appendChild(el('div', { class: 'text-dim', text: `Last save: ${agoText}`, style: 'font-size: 10px;' }));
      }

      if (!isActive) {
        const btnRow = el('div', { style: 'display: flex; gap: 4px; margin-top: 6px;' });
        btnRow.appendChild(el('button', {
          class: 'btn btn-primary btn-sm', text: 'Load',
          onclick: () => {
            if (G.heroes && G.heroes.length > 0) saveGame();
            setActiveSlot(info.slot);
            overlay.remove();
            location.reload();
          },
        }));
        btnRow.appendChild(el('button', {
          class: 'btn btn-danger btn-sm', text: 'Delete',
          onclick: () => {
            if (!confirm(`Delete Slot ${info.slot + 1}? This cannot be undone.`)) return;
            const key = info.slot === 0 ? 'voidborn_save' : `voidborn_save_${info.slot}`;
            localStorage.removeItem(key);
            overlay.remove();
            showSaveSlots();
          },
        }));
        row.appendChild(btnRow);
      }
    }
    card.appendChild(row);
  }

  card.appendChild(el('button', {
    class: 'btn btn-block', text: 'Close',
    onclick: () => overlay.remove(),
    style: 'margin-top: 8px;',
  }));

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// Achievements list overlay
function showAchievements() {
  document.querySelectorAll('.achievements-overlay').forEach(o => o.remove());

  const overlay = el('div', { class: 'achievements-overlay' });
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const card = el('div', { class: 'card', style: 'max-width:420px;width:100%;padding:16px;max-height:85vh;overflow-y:auto;' });
  const unlocked = (G.achievements || []).length;
  card.appendChild(el('div', { class: 'text-bright', text: `Achievements ${unlocked}/${ACHIEVEMENTS.length}`, style: 'font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 12px;' }));

  for (const ach of ACHIEVEMENTS) {
    const isUnlocked = (G.achievements || []).includes(ach.id);
    const row = el('div', { class: 'card', style: `padding: 8px; margin-bottom: 4px; ${isUnlocked ? '' : 'opacity: 0.4;'}` });
    row.appendChild(el('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
      el('span', { text: ach.icon, style: 'font-size: 22px;' }),
      el('div', { style: 'flex: 1;' }, [
        el('div', { class: isUnlocked ? 'text-bright' : 'text-dim', text: ach.name, style: 'font-weight: 700; font-size: 12px;' }),
        el('div', { class: 'text-dim', text: ach.desc, style: 'font-size: 10px;' }),
        ach.rewardGold ? el('div', { class: 'text-warning', text: `Reward: +${ach.rewardGold} gold`, style: 'font-size: 9px;' }) : null,
      ]),
      isUnlocked ? el('span', { text: '\u2705', style: 'font-size: 16px;' }) : el('span', { class: 'text-dim', text: '\uD83D\uDD12', style: 'font-size: 14px;' }),
    ]));
    card.appendChild(row);
  }

  card.appendChild(el('button', {
    class: 'btn btn-block', text: 'Close',
    onclick: () => overlay.remove(),
    style: 'margin-top: 8px;',
  }));

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function hudStat(icon, value) {
  return el('div', { class: 'hud-stat' }, [
    el('span', { class: 'label', text: icon }),
    el('span', { class: 'value', text: value }),
  ]);
}
