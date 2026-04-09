// === Voidborn — View Router ===

const tabs = {};
let activeTab = 'raid';
let navButtons = null;
let contentEl = null;

// Register a tab renderer
export function registerTab(name, renderFn) {
  tabs[name] = renderFn;
}

// Initialize router
export function initRouter() {
  contentEl = document.getElementById('content');
  navButtons = document.querySelectorAll('.nav-btn');

  for (const btn of navButtons) {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  }
}

// Switch to a tab
export function switchTab(tabName) {
  if (!tabs[tabName]) return;

  activeTab = tabName;

  // Update nav buttons
  for (const btn of navButtons) {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  }

  renderActiveTab();
}

// Re-render the currently active tab
export function renderActiveTab() {
  if (!contentEl || !tabs[activeTab]) return;
  contentEl.innerHTML = '';
  const content = tabs[activeTab]();
  if (typeof content === 'string') {
    contentEl.innerHTML = content;
  } else if (content) {
    contentEl.appendChild(content);
  }
}

// Get active tab name
export function getActiveTab() {
  return activeTab;
}

// Show/hide nav during raid
export function setNavVisible(visible) {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('hidden', !visible);
}
