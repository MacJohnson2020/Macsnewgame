// === Voidborn — Raid State Machine ===

import { G, getHero, saveGame } from '../state.js';
import { ZONES, CORRUPTION_LEVELS, xpForLevel } from '../config.js';
import { generateRaidPath, getChildren } from './generator.js';
import { generateEncounter, resolveEventChoice, applyTrap, applyShrine } from './encounter.js';
import { createCombatState } from './combat.js';
import { generateGold } from './entities.js';

// Raid phases
export const RAID_PHASE = {
  PREP: 'prep',
  EXPLORING: 'exploring',
  ENCOUNTER: 'encounter',
  COMBAT: 'combat',
  EXTRACTING: 'extracting',
  RESULT: 'result',
};

// Start a new raid
export function startRaid(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) return null;

  if (G.energy < zone.energyCost) return null;
  G.energy -= zone.energyCost;

  const path = generateRaidPath(zoneId);
  const party = G.raidParty.map(id => getHero(id)).filter(h => h && h.alive);
  if (party.length === 0) return null;

  const avgLevel = Math.round(party.reduce((s, h) => s + h.level, 0) / party.length);

  const raid = {
    phase: RAID_PHASE.EXPLORING,
    zoneId,
    zoneName: zone.name,
    path,
    currentNodeId: path.nodes[0].id,
    party: party.map(h => h.id),
    partyLevel: avgLevel,
    steps: 0,
    corruption: 0,
    corruptionLevel: CORRUPTION_LEVELS[0],
    goldCollected: 0,
    xpCollected: 0,
    itemsCollected: [],
    encounter: null,
    combat: null,
    result: null,
  };

  path.nodes[0].visited = true;
  path.currentFloor = 0;

  G.activeRaid = raid;
  G.totalRaids++;
  saveGame();

  return raid;
}

// Get available next nodes from current position
export function getAvailableNodes(raid) {
  if (!raid) return [];
  return getChildren(raid.path, raid.currentNodeId);
}

// Step to a node
export function stepToNode(raid, nodeId) {
  const node = raid.path.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const available = getAvailableNodes(raid);
  if (!available.find(n => n.id === nodeId)) return null;

  raid.currentNodeId = nodeId;
  node.visited = true;
  raid.steps++;
  raid.path.currentFloor = node.floor;
  raid.corruption += ZONES.find(z => z.id === raid.zoneId)?.corruptionRate || 1;

  raid.corruptionLevel = [...CORRUPTION_LEVELS]
    .reverse()
    .find(c => raid.corruption >= c.threshold) || CORRUPTION_LEVELS[0];

  const zone = ZONES.find(z => z.id === raid.zoneId);
  const encounter = generateEncounter(node, zone, raid.partyLevel, raid.corruption);

  if (encounter.type === 'combat') {
    const party = raid.party.map(id => getHero(id)).filter(h => h && h.alive);
    raid.combat = createCombatState(party, encounter.enemies);
    raid.phase = RAID_PHASE.COMBAT;
    raid.encounter = encounter;
  } else if (encounter.type === 'extraction') {
    raid.phase = RAID_PHASE.EXTRACTING;
    raid.encounter = encounter;
  } else {
    raid.phase = RAID_PHASE.ENCOUNTER;
    raid.encounter = encounter;
  }

  return encounter;
}

// Resolve the current non-combat encounter
export function resolveEncounter(raid, action = null) {
  if (!raid.encounter) return null;
  const enc = raid.encounter;
  const party = raid.party.map(id => getHero(id)).filter(h => h && h.alive);
  const zone = ZONES.find(z => z.id === raid.zoneId);
  const results = [];

  switch (enc.type) {
    case 'chest': {
      raid.goldCollected += enc.gold;
      G.gold += enc.gold;
      results.push(`Found ${enc.gold} gold!`);
      raid.encounter.pendingItems = enc.items;
      return { type: 'chest', results, items: enc.items, gold: enc.gold };
    }

    case 'trap': {
      const trapResults = applyTrap(enc, party);
      for (const r of trapResults) results.push(r.text);
      if (!party.some(h => h.alive)) {
        return endRaid(raid, false);
      }
      return { type: 'trap', results };
    }

    case 'shrine': {
      const shrineResults = applyShrine(enc, party);
      for (const r of shrineResults) results.push(r);
      if (enc.effect === 'gold') {
        raid.goldCollected += enc.value;
        G.gold += enc.value;
      }
      return { type: 'shrine', results };
    }

    case 'merchant': {
      return { type: 'merchant', items: enc.items };
    }

    case 'event': {
      if (action !== null && action !== undefined) {
        const eventResults = resolveEventChoice(enc, action, party, zone);
        if (eventResults.gold) {
          raid.goldCollected += eventResults.gold;
          G.gold += eventResults.gold;
        }
        if (eventResults.damage) {
          for (const hero of party) {
            if (!hero.alive) continue;
            hero.hp -= Math.floor(eventResults.damage / party.length);
            if (hero.hp <= 0) { hero.hp = 0; hero.alive = false; }
          }
        }
        return { type: 'event', results: [eventResults.text], items: eventResults.items, gold: eventResults.gold };
      }
      return { type: 'event', choices: enc.choices };
    }

    case 'empty':
    case 'start':
      return { type: enc.type, results: [enc.desc] };

    default:
      return { type: 'unknown', results: [] };
  }
}

// Extract successfully
export function extractRaid(raid) {
  return endRaid(raid, true);
}

// End the raid
export function endRaid(raid, success) {
  const party = raid.party.map(id => getHero(id)).filter(Boolean);

  const result = {
    success,
    zoneName: raid.zoneName,
    steps: raid.steps,
    goldCollected: raid.goldCollected,
    xpCollected: raid.xpCollected,
    itemsKept: [],
    itemsLost: [],
    heroesLost: [],
  };

  if (success) {
    G.totalExtractions++;
    result.itemsKept = party
      .filter(h => h.alive)
      .flatMap(h => [...h.inventory]);
  } else {
    G.totalDeaths++;
    for (const hero of party) {
      if (!hero.alive) {
        result.heroesLost.push(hero.name);
        result.itemsLost.push(...hero.inventory, ...Object.values(hero.gear).filter(Boolean));
        hero.inventory = [];
        hero.gear = { weapon: null, armor: null, accessory: null };
      }
    }
    if (!party.some(h => h.alive)) {
      for (const hero of party) {
        result.itemsLost.push(...hero.inventory, ...Object.values(hero.gear).filter(Boolean));
        hero.inventory = [];
        hero.gear = { weapon: null, armor: null, accessory: null };
      }
    }
  }

  // Distribute XP
  const survivors = party.filter(h => h.alive);
  if (survivors.length > 0 && raid.xpCollected > 0) {
    const xpEach = Math.floor(raid.xpCollected / survivors.length);
    for (const hero of survivors) {
      hero.xp += xpEach;
      while (hero.xp >= xpForLevel(hero.level)) {
        hero.xp -= xpForLevel(hero.level);
        hero.level++;
        hero.statPoints += 2;
      }
    }
  }

  // Revive dead heroes
  for (const hero of party) {
    hero.alive = true;
    if (hero.hp <= 0) hero.hp = Math.floor(hero.maxHp * 0.5);
    hero.buffs = [];
    hero.debuffs = [];
    hero.dots = [];
  }

  raid.phase = RAID_PHASE.RESULT;
  raid.result = result;

  saveGame();
  return result;
}

// Clear the active raid
export function clearRaid() {
  G.activeRaid = null;
  saveGame();
}

// Check if party is wiped
export function isPartyWiped(raid) {
  const party = raid.party.map(id => getHero(id)).filter(Boolean);
  return !party.some(h => h.alive);
}
