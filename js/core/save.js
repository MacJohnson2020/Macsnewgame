import { createDefaultState, SAVE_VERSION } from './state.js';

const SAVE_KEY = 'rs_hybrid_save';

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return createDefaultState();

  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== SAVE_VERSION) {
      // No migrations defined yet for a version mismatch; start fresh
      // rather than risk loading an incompatible shape.
      return createDefaultState();
    }
    return parsed;
  } catch {
    return createDefaultState();
  }
}
