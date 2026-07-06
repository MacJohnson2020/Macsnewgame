// Full 19-skill roster from the design doc. Only Woodcutting, Melee,
// Defence, and Hitpoints are wired up to gameplay in this first slice;
// the rest exist here so state/UI code doesn't need to special-case
// "skills that don't exist yet".
export const SKILLS = {
  melee: { id: 'melee', name: 'Melee', category: 'combat', maxLevel: 99 },
  ranged: { id: 'ranged', name: 'Ranged', category: 'combat', maxLevel: 99 },
  magic: { id: 'magic', name: 'Magic', category: 'combat', maxLevel: 99 },
  defence: { id: 'defence', name: 'Defence', category: 'combat', maxLevel: 99 },
  hitpoints: { id: 'hitpoints', name: 'Hitpoints', category: 'combat', maxLevel: 99 },

  woodcutting: { id: 'woodcutting', name: 'Woodcutting', category: 'gathering', maxLevel: 99 },
  mining: { id: 'mining', name: 'Mining', category: 'gathering', maxLevel: 99 },
  fishing: { id: 'fishing', name: 'Fishing', category: 'gathering', maxLevel: 99 },
  farming: { id: 'farming', name: 'Farming', category: 'gathering', maxLevel: 99 },
  hunter: { id: 'hunter', name: 'Hunter', category: 'gathering', maxLevel: 99 },

  cooking: { id: 'cooking', name: 'Cooking', category: 'production', maxLevel: 99 },
  firemaking: { id: 'firemaking', name: 'Firemaking', category: 'production', maxLevel: 99 },
  smithing: { id: 'smithing', name: 'Smithing', category: 'production', maxLevel: 99 },
  crafting: { id: 'crafting', name: 'Crafting', category: 'production', maxLevel: 99 },
  fletching: { id: 'fletching', name: 'Fletching', category: 'production', maxLevel: 99 },

  herblore: { id: 'herblore', name: 'Herblore', category: 'support', maxLevel: 99 },
  slayer: { id: 'slayer', name: 'Slayer', category: 'support', maxLevel: 99 },

  runecrafting: { id: 'runecrafting', name: 'Runecrafting', category: 'complex', maxLevel: 120 },
  construction: { id: 'construction', name: 'Construction', category: 'complex', maxLevel: 120 },
};

export const SKILL_IDS = Object.keys(SKILLS);
