// === Voidborn — Procedural Branching Path Generator ===

import { ENCOUNTER_WEIGHTS, ZONES } from '../config.js';
import { randInt, rand, weightedPick, uid } from '../utils.js';

// Node types
const NODE_TYPES = ['enemy', 'chest', 'trap', 'shrine', 'merchant', 'event', 'empty'];

// Generate a raid path for a given zone
export function generateRaidPath(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) throw new Error(`Unknown zone: ${zoneId}`);

  const totalNodes = randInt(zone.nodes[0], zone.nodes[1]);

  // Build a linear path with forks
  const path = buildPath(totalNodes, zone.forkChance);

  // Assign encounter types to each node
  assignEncounters(path, zone);

  // Set start and extraction nodes
  path.nodes[0].type = 'start';
  path.nodes[0].icon = '\uD83D\uDEAA';
  path.nodes[0].label = 'Entry Point';

  // Mark extraction points at the end of each branch
  const leaves = getLeafNodes(path);
  for (const leaf of leaves) {
    leaf.type = 'extraction';
    leaf.icon = '\u2705';
    leaf.label = 'Extraction Point';
  }

  return path;
}

// Build path structure with forks
function buildPath(totalNodes, forkChance) {
  const nodes = [];
  const edges = []; // { from, to }

  // Create start node
  const start = createNode(0);
  nodes.push(start);

  // Tracks which nodes are "tips" (can have children added)
  let tips = [start];
  let nodesCreated = 1;

  while (nodesCreated < totalNodes && tips.length > 0) {
    const newTips = [];

    for (const tip of tips) {
      if (nodesCreated >= totalNodes) break;

      // Should this node fork?
      const remainingNodes = totalNodes - nodesCreated;
      const shouldFork = remainingNodes >= 3 && rand() < forkChance && tip.depth < 8;

      if (shouldFork) {
        // Create 2 branches
        tip.isFork = true;
        for (let b = 0; b < 2; b++) {
          if (nodesCreated >= totalNodes) break;
          const child = createNode(tip.depth + 1);
          child.branch = b === 0 ? 'safe' : 'risky';
          nodes.push(child);
          edges.push({ from: tip.id, to: child.id });
          newTips.push(child);
          nodesCreated++;
        }
      } else {
        // Single path forward
        const child = createNode(tip.depth + 1);
        child.branch = tip.branch;
        nodes.push(child);
        edges.push({ from: tip.id, to: child.id });
        newTips.push(child);
        nodesCreated++;
      }
    }

    tips = newTips;
  }

  return { nodes, edges, zoneId: null };
}

function createNode(depth) {
  return {
    id: uid(),
    depth,
    type: 'empty',
    icon: '?',
    label: '',
    isFork: false,
    branch: null, // 'safe' or 'risky'
    visited: false,
    revealed: false, // shown on path but not visited
    data: null, // encounter-specific data
  };
}

// Assign encounter types to nodes
function assignEncounters(path, zone) {
  const weights = Object.entries(ENCOUNTER_WEIGHTS).map(([type, weight]) => ({ type, weight }));

  for (const node of path.nodes) {
    if (node.type !== 'empty' || node.depth === 0) continue;

    // Risky branches get more enemies and better loot
    let adjustedWeights = weights.map(w => {
      if (node.branch === 'risky') {
        if (w.type === 'enemy') return { ...w, weight: w.weight * 1.5 };
        if (w.type === 'chest') return { ...w, weight: w.weight * 1.3 };
        if (w.type === 'empty') return { ...w, weight: w.weight * 0.5 };
      }
      return w;
    });

    const encounter = weightedPick(adjustedWeights);
    node.type = encounter.type;
    assignNodeVisuals(node);
  }

  path.zoneId = zone.id;
}

function assignNodeVisuals(node) {
  switch (node.type) {
    case 'enemy':
      node.icon = '\uD83D\uDC80';
      node.label = 'Enemy';
      break;
    case 'chest':
      node.icon = '\uD83D\uDCE6';
      node.label = 'Chest';
      break;
    case 'trap':
      node.icon = '\u26A0\uFE0F';
      node.label = 'Trap';
      break;
    case 'shrine':
      node.icon = '\u2728';
      node.label = 'Shrine';
      break;
    case 'merchant':
      node.icon = '\uD83D\uDED2';
      node.label = 'Merchant';
      break;
    case 'event':
      node.icon = '\u2753';
      node.label = 'Event';
      break;
    case 'empty':
      node.icon = '\u00B7';
      node.label = 'Empty';
      break;
    case 'extraction':
      node.icon = '\u2705';
      node.label = 'Extraction';
      break;
    case 'start':
      node.icon = '\uD83D\uDEAA';
      node.label = 'Start';
      break;
  }
}

// Get children of a node
export function getChildren(path, nodeId) {
  return path.edges
    .filter(e => e.from === nodeId)
    .map(e => path.nodes.find(n => n.id === e.to))
    .filter(Boolean);
}

// Get parent of a node
export function getParent(path, nodeId) {
  const edge = path.edges.find(e => e.to === nodeId);
  if (!edge) return null;
  return path.nodes.find(n => n.id === edge.from);
}

// Get all leaf nodes (no children)
function getLeafNodes(path) {
  const parentIds = new Set(path.edges.map(e => e.from));
  return path.nodes.filter(n => !parentIds.has(n.id));
}

// Reveal nodes adjacent to a given node (for partial visibility)
export function revealAdjacent(path, nodeId, depth = 2) {
  const node = path.nodes.find(n => n.id === nodeId);
  if (!node) return;

  node.revealed = true;
  if (depth <= 0) return;

  const children = getChildren(path, nodeId);
  for (const child of children) {
    child.revealed = true;
    if (depth > 1) revealAdjacent(path, child.id, depth - 1);
  }
}
