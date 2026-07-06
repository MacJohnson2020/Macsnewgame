// OSRS-style XP curve: each level costs ~1.104x the previous level's XP.
export function generateXpTable(maxLevel) {
  const table = [0, 0]; // index 0 unused, level 1 = 0 xp
  let points = 0;
  for (let level = 1; level < maxLevel; level++) {
    points += Math.floor(level + 300 * Math.pow(2, level / 7));
    table[level + 1] = Math.floor(points / 4);
  }
  return table;
}

export const XP_TABLE_99 = generateXpTable(99);
export const XP_TABLE_120 = generateXpTable(120);

export function levelForXp(xp, table) {
  let level = 1;
  for (let i = table.length - 1; i >= 1; i--) {
    if (xp >= table[i]) {
      level = i;
      break;
    }
  }
  return level;
}

export function xpForLevel(level, table) {
  return table[level] ?? 0;
}
