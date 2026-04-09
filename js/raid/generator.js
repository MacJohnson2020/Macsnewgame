// === Voidborn — Slay the Spire Style Map Generator ===

import { ENCOUNTER_WEIGHTS, ZONES } from '../config.js';
import { randInt, rand, weightedPick, uid } from '../utils.js';

// Generate a Slay the Spire style branching map
// Structure: columns (floors) of nodes, edges connect adjacent columns
// You always move forward, never back
export function generateRaidPath(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) throw new Error(`Unknown zone: ${zoneId}`);

  const numFloors = randInt(zone.nodes[0], zone.nodes[1]);
  const columns = []; // columns[floor] = [node, node, ...]
  const edges = [];   // { from, to }
  const allNodes = [];

  // Floor 0: single start node
  const startNode = makeNode(0, 0, 'start');
  columns.push([startNode]);
  allNodes.push(startNode);

  // Floors 1 to numFloors-2: 2-4 nodes per floor with cross-connections
  for (let floor = 1; floor < numFloors - 1; floor++) {
    const nodesInFloor = randInt(2, 4);
    const floorNodes = [];
    for (let lane = 0; lane < nodesInFloor; lane++) {
      const node = makeNode(floor, lane, 'empty');
      floorNodes.push(node);
      allNodes.push(node);
    }
    columns.push(floorNodes);
  }

  // Last floor: single extraction node
  const exitNode = makeNode(numFloors - 1, 0, 'extraction');
  columns.push([exitNode]);
  allNodes.push(exitNode);

  // Connect adjacent floors
  for (let floor = 0; floor < columns.length - 1; floor++) {
    const current = columns[floor];
    const next = columns[floor + 1];

    if (next.length === 1) {
      // All nodes in current floor connect to the single next node
      for (const node of current) {
        edges.push({ from: node.id, to: next[0].id });
      }
    } else if (current.length === 1) {
      // Single node connects to all nodes in next floor
      for (const node of next) {
        edges.push({ from: current[0].id, to: node.id });
      }
    } else {
      // Multiple to multiple: each node connects to 1-2 nodes in next floor
      // Ensure every node in next floor has at least one incoming edge
      // and every node in current floor has at least one outgoing edge
      const nextConnected = new Set();
      const currentConnected = new Set();

      for (let i = 0; i < current.length; i++) {
        // Connect to the "nearest" node (same lane or close)
        const targetIdx = Math.min(i, next.length - 1);
        edges.push({ from: current[i].id, to: next[targetIdx].id });
        currentConnected.add(i);
        nextConnected.add(targetIdx);

        // Maybe also connect to an adjacent node (creates branching)
        if (rand() < 0.5) {
          const altIdx = targetIdx + (rand() < 0.5 ? 1 : -1);
          if (altIdx >= 0 && altIdx < next.length && altIdx !== targetIdx) {
            edges.push({ from: current[i].id, to: next[altIdx].id });
            nextConnected.add(altIdx);
          }
        }
      }

      // Ensure all next-floor nodes are reachable
      for (let j = 0; j < next.length; j++) {
        if (!nextConnected.has(j)) {
          const fromIdx = Math.min(j, current.length - 1);
          edges.push({ from: current[fromIdx].id, to: next[j].id });
        }
      }
    }
  }

  // Assign encounter types
  assignEncounters(allNodes, zone, numFloors);

  // All nodes are visible from the start (Slay the Spire style)
  for (const node of allNodes) {
    node.revealed = true;
  }

  return {
    nodes: allNodes,
    edges,
    columns,
    zoneId: zone.id,
    numFloors,
    currentFloor: 0,
  };
}

function makeNode(floor, lane, type) {
  const node = {
    id: uid(),
    floor,
    lane,
    type,
    icon: '?',
    label: '',
    visited: false,
    revealed: true,
    data: null,
  };
  assignNodeVisuals(node);
  return node;
}

// Assign encounter types based on floor position
function assignEncounters(nodes, zone, numFloors) {
  const weights = Object.entries(ENCOUNTER_WEIGHTS).map(([type, weight]) => ({ type, weight }));

  for (const node of nodes) {
    if (node.type === 'start' || node.type === 'extraction') continue;

    // Adjust weights based on floor depth
    const depthRatio = node.floor / numFloors;
    const adjusted = weights.map(w => {
      let weight = w.weight;
      // More enemies deeper in
      if (w.type === 'enemy') weight *= (1 + depthRatio * 0.8);
      // Chests more common in mid floors
      if (w.type === 'chest') weight *= (depthRatio > 0.3 && depthRatio < 0.7) ? 1.5 : 0.8;
      // Shrines in early-mid
      if (w.type === 'shrine') weight *= depthRatio < 0.5 ? 1.3 : 0.6;
      // Merchants early
      if (w.type === 'merchant') weight *= depthRatio < 0.4 ? 2 : 0.3;
      // Less empty deeper
      if (w.type === 'empty') weight *= (1 - depthRatio * 0.5);
      // Elite enemy near end
      if (w.type === 'enemy' && depthRatio > 0.7 && rand() < 0.3) weight *= 2;
      return { ...w, weight: Math.max(0.1, weight) };
    });

    const encounter = weightedPick(adjusted);
    node.type = encounter.type;
    assignNodeVisuals(node);
  }
}

function assignNodeVisuals(node) {
  switch (node.type) {
    case 'enemy':    node.icon = '\uD83D\uDC80'; node.label = 'Enemy'; break;
    case 'chest':    node.icon = '\uD83D\uDCE6'; node.label = 'Chest'; break;
    case 'trap':     node.icon = '\u26A0\uFE0F'; node.label = 'Trap'; break;
    case 'shrine':   node.icon = '\u2728';       node.label = 'Shrine'; break;
    case 'merchant': node.icon = '\uD83D\uDED2'; node.label = 'Merchant'; break;
    case 'event':    node.icon = '\u2753';       node.label = 'Event'; break;
    case 'empty':    node.icon = '\u00B7';       node.label = 'Rest'; break;
    case 'extraction': node.icon = '\u2705';     node.label = 'Extract'; break;
    case 'start':    node.icon = '\uD83D\uDEAA'; node.label = 'Start'; break;
  }
}

// Get nodes reachable from a given node (children in the next floor)
export function getChildren(path, nodeId) {
  return path.edges
    .filter(e => e.from === nodeId)
    .map(e => path.nodes.find(n => n.id === e.to))
    .filter(Boolean);
}

// Get parent nodes (previous floor nodes that connect to this one)
export function getParent(path, nodeId) {
  const edge = path.edges.find(e => e.to === nodeId);
  if (!edge) return null;
  return path.nodes.find(n => n.id === edge.from);
}

// No-op (all nodes visible in Slay the Spire style)
export function revealAdjacent() {}
