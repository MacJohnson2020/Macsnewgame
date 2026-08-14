// The Wandering Tavern — app logic + rendering. Vanilla JS, localStorage save.

const SAVE_KEY = "wandering-tavern-save-v1";

let state = loadState();

function defaultState() {
  return {
    hero: null, // { name, classId, xp, totalCompleted, currentStreak, bestStreak, gold }
    activeQuests: [],
    completedLog: [],
    pendingQuest: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function classById(id) {
  return CLASSES.find(c => c.id === id);
}

// ---------- Quest generation ----------

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollD20() {
  return 1 + Math.floor(Math.random() * 20);
}

function generateQuest(forcedType) {
  const typeId = forcedType || pickRandom(QUEST_TYPE_ORDER);
  const roll = rollD20();
  const rarity = rarityForRoll(roll);
  const type = QUEST_TYPES[typeId];

  let title, desc;
  if (typeId === "boss") {
    const boss = pickRandom(BOSSES);
    title = boss.name;
    desc = type.desc(boss.name, boss.epithet, boss.lair);
  } else {
    const target = pickRandom(type.targets);
    title = `${type.label}: ${target.replace(/^(a |an |the )/i, "")}`;
    desc = type.desc(target);
  }

  const hero = state.hero;
  const heroClass = hero ? classById(hero.classId) : null;
  const isClassBonus = heroClass && heroClass.affinity === typeId;

  const baseXp = 15;
  const baseGold = 8;
  let xp = Math.round(baseXp * rarity.mult * (0.85 + Math.random() * 0.3));
  let gold = Math.round(baseGold * rarity.mult * (0.85 + Math.random() * 0.3));
  if (isClassBonus) {
    xp = Math.round(xp * 1.5);
    gold = Math.round(gold * 1.5);
  }

  return {
    id: uid(),
    typeId,
    typeLabel: type.label,
    icon: type.icon,
    roll,
    rarity,
    title,
    desc,
    reward: { xp, gold },
    classBonus: isClassBonus,
  };
}

// ---------- Actions ----------

function rollQuest() {
  const dieFace = document.getElementById("die-face");
  dieFace.classList.add("rolling");
  setTimeout(() => {
    dieFace.classList.remove("rolling");
    state.pendingQuest = generateQuest();
    saveState();
    render();
  }, 350);
}

function acceptPending() {
  if (!state.pendingQuest) return;
  state.activeQuests.unshift(state.pendingQuest);
  state.pendingQuest = null;
  saveState();
  render();
}

function declinePending() {
  state.pendingQuest = null;
  saveState();
  render();
}

function completeQuest(id) {
  const idx = state.activeQuests.findIndex(q => q.id === id);
  if (idx === -1) return;
  const quest = state.activeQuests[idx];
  state.activeQuests.splice(idx, 1);

  state.hero.xp += quest.reward.xp;
  state.hero.gold += quest.reward.gold;
  state.hero.totalCompleted += 1;
  state.hero.currentStreak += 1;
  state.hero.bestStreak = Math.max(state.hero.bestStreak, state.hero.currentStreak);

  const prevLevel = levelFromXp(state.hero.xp - quest.reward.xp).level;
  const newLevel = levelFromXp(state.hero.xp).level;

  state.completedLog.unshift({
    id: uid(),
    title: quest.title,
    typeLabel: quest.typeLabel,
    icon: quest.icon,
    rarity: quest.rarity,
    reward: quest.reward,
    at: Date.now(),
  });
  state.completedLog = state.completedLog.slice(0, 40);

  saveState();
  render();

  if (newLevel > prevLevel) {
    showToast(`⭐ Level up! ${state.hero.name} is now level ${newLevel}.`);
  } else {
    showToast(`✅ Contract fulfilled: +${quest.reward.xp} XP, +${quest.reward.gold} gold`);
  }
}

function abandonQuest(id) {
  const idx = state.activeQuests.findIndex(q => q.id === id);
  if (idx === -1) return;
  state.activeQuests.splice(idx, 1);
  state.hero.currentStreak = 0;
  saveState();
  render();
  showToast("💔 Contract abandoned. Your streak resets.");
}

function rollBossQuest() {
  state.pendingQuest = generateQuest("boss");
  saveState();
  render();
  document.getElementById("pending-quest-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
}

function createHero(name, classId) {
  state.hero = {
    name: name.trim() || "Unnamed Adventurer",
    classId,
    xp: 0,
    totalCompleted: 0,
    currentStreak: 0,
    bestStreak: 0,
    gold: 0,
  };
  saveState();
  render();
}

function resetSave() {
  if (!confirm("This will permanently delete your hero, active contracts, and chronicle. Continue?")) return;
  state = defaultState();
  saveState();
  render();
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

// ---------- Rendering ----------

function questCardHtml(q, { showRoll = true } = {}) {
  return `
    <div class="quest-head" style="--rarity-color:${q.rarity.color}">
      <span class="quest-icon">${q.icon}</span>
      <div>
        <div class="quest-type">${q.typeLabel}</div>
        <div class="quest-rarity" style="color:${q.rarity.color}">${q.rarity.label}${showRoll ? ` · rolled ${q.roll}` : ""}${q.classBonus ? " · ★ Class Bonus" : ""}</div>
      </div>
    </div>
    <h3 class="quest-title">${q.title}</h3>
    <p class="quest-desc">${q.desc}</p>
    <div class="quest-reward">🔹 ${q.reward.xp} XP &nbsp; 🪙 ${q.reward.gold} gold</div>
  `;
}

function render() {
  const heroSetup = document.getElementById("hero-setup");
  const mainApp = document.getElementById("main-app");

  if (!state.hero) {
    heroSetup.classList.remove("hidden");
    mainApp.classList.add("hidden");
    renderHeroSetup();
    return;
  }
  heroSetup.classList.add("hidden");
  mainApp.classList.remove("hidden");

  renderHeroPanel();
  renderPendingQuest();
  renderActiveQuests();
  renderCompletedLog();
}

function renderHeroSetup() {
  const select = document.getElementById("hero-class-select");
  if (!select.dataset.filled) {
    select.innerHTML = CLASSES.map(c => `<option value="${c.id}">${c.name} (${c.style})</option>`).join("");
    select.dataset.filled = "1";
    select.addEventListener("change", updateClassFlavor);
    updateClassFlavor();
  }
}

function updateClassFlavor() {
  const select = document.getElementById("hero-class-select");
  const cls = classById(select.value);
  document.getElementById("class-flavor").textContent = cls ? cls.flavor : "";
}

function renderHeroPanel() {
  const hero = state.hero;
  const cls = classById(hero.classId);
  const { level, xpIntoLevel, xpNeeded } = levelFromXp(hero.xp);

  document.getElementById("hero-name").textContent = hero.name;
  document.getElementById("hero-class").textContent = `${cls.name} (${cls.style})`;
  document.getElementById("hero-title").textContent = titleForCount(hero.totalCompleted);
  document.getElementById("hero-level-num").textContent = level;
  document.getElementById("xp-bar-fill").style.width = `${Math.min(100, (xpIntoLevel / xpNeeded) * 100)}%`;
  document.getElementById("hero-xp-text").textContent = `${xpIntoLevel} / ${xpNeeded} XP to next level`;

  document.getElementById("stat-completed").textContent = hero.totalCompleted;
  document.getElementById("stat-streak").textContent = hero.currentStreak;
  document.getElementById("stat-best-streak").textContent = hero.bestStreak;
  document.getElementById("stat-gold").textContent = hero.gold;
}

function renderPendingQuest() {
  const wrap = document.getElementById("pending-quest-wrap");
  const card = document.getElementById("pending-quest-card");
  if (!state.pendingQuest) {
    wrap.classList.add("hidden");
    card.innerHTML = "";
    return;
  }
  wrap.classList.remove("hidden");
  card.style.setProperty("--rarity-color", state.pendingQuest.rarity.color);
  card.innerHTML = questCardHtml(state.pendingQuest);
}

function renderActiveQuests() {
  const list = document.getElementById("active-quest-list");
  if (state.activeQuests.length === 0) {
    list.innerHTML = `<p class="muted empty-msg">No active contracts. Roll one above!</p>`;
    return;
  }
  list.innerHTML = state.activeQuests.map(q => `
    <div class="quest-card active-quest" style="--rarity-color:${q.rarity.color}">
      ${questCardHtml(q, { showRoll: false })}
      <div class="quest-actions">
        <button class="btn btn-primary" onclick="completeQuest('${q.id}')">Mark Complete</button>
        <button class="btn btn-ghost" onclick="abandonQuest('${q.id}')">Abandon</button>
      </div>
    </div>
  `).join("");
}

function renderCompletedLog() {
  const log = document.getElementById("completed-log");
  if (state.completedLog.length === 0) {
    log.innerHTML = `<p class="muted empty-msg">Your legend has yet to be written.</p>`;
    return;
  }
  log.innerHTML = state.completedLog.map(entry => {
    const date = new Date(entry.at);
    return `
      <div class="log-row" style="--rarity-color:${entry.rarity.color}">
        <span class="log-icon">${entry.icon}</span>
        <span class="log-title">${entry.title}</span>
        <span class="log-rarity" style="color:${entry.rarity.color}">${entry.rarity.label}</span>
        <span class="log-reward">+${entry.reward.xp} XP</span>
        <span class="log-date muted">${date.toLocaleDateString()}</span>
      </div>
    `;
  }).join("");
}

function renderBestiary() {
  const grid = document.getElementById("bestiary-grid");
  grid.innerHTML = BOSSES.map(b => `
    <div class="boss-card" onclick="rollBossQuest()">
      <div class="boss-name">${b.name}</div>
      <div class="boss-epithet">${b.epithet}</div>
      <div class="boss-lair muted">📍 ${b.lair}</div>
    </div>
  `).join("");
}

// ---------- Wire up events ----------

document.getElementById("hero-create-btn").addEventListener("click", () => {
  const name = document.getElementById("hero-name-input").value;
  const classId = document.getElementById("hero-class-select").value;
  createHero(name, classId);
});

document.getElementById("roll-btn").addEventListener("click", rollQuest);
document.getElementById("accept-btn").addEventListener("click", acceptPending);
document.getElementById("reroll-btn").addEventListener("click", rollQuest);
document.getElementById("decline-btn").addEventListener("click", declinePending);
document.getElementById("reset-btn").addEventListener("click", resetSave);

renderBestiary();
render();
