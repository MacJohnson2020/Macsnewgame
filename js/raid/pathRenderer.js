// === Voidborn — Slay the Spire Style Map Renderer ===

import { getChildren } from './generator.js';
import { el } from '../utils.js';

// Render the full map as a vertical column layout
export function renderPath(raid, onNodeClick) {
  const { columns, edges, currentFloor } = raid.path;
  const currentId = raid.currentNodeId;

  const map = el('div', { class: 'spire-map' });

  // Render floors bottom-to-top (start at bottom, extraction at top)
  for (let floor = columns.length - 1; floor >= 0; floor--) {
    const floorNodes = columns[floor].filter(n => !n.pruned);
    if (floorNodes.length === 0) continue; // skip fully pruned floors

    // Floor row
    const row = el('div', { class: 'spire-floor' });

    // Floor label
    const label = el('div', { class: 'spire-floor-label' });
    if (floor === 0) label.textContent = 'START';
    else if (floor === columns.length - 1) label.textContent = 'EXIT';
    else label.textContent = `F${floor}`;
    row.appendChild(label);

    // Nodes container
    const nodesDiv = el('div', { class: 'spire-nodes' });

    for (const node of floorNodes) {
      const isCurrent = node.id === currentId;
      const isAvailable = !node.visited && floor === currentFloor + 1 && isReachableFrom(raid, currentId, node.id);
      const isPast = node.visited;
      const isFuture = floor > currentFloor + 1;

      // Hide non-combat node types until visited
      const hiddenTypes = ['chest', 'trap', 'shrine', 'merchant', 'event'];
      const isMystery = hiddenTypes.includes(node.type) && !isPast && !isCurrent;

      let classes = 'spire-node';
      if (isCurrent) classes += ' current';
      if (isPast) classes += ' visited';
      if (isAvailable) classes += ' available';
      if (isFuture) classes += ' future';
      if (node.type === 'extraction') classes += ' extraction';
      if (!isMystery) {
        if (node.type === 'enemy') classes += ' enemy';
        if (node.type === 'chest') classes += ' chest';
        if (node.type === 'shrine') classes += ' shrine';
        if (node.type === 'merchant') classes += ' merchant';
        if (node.type === 'trap') classes += ' trap';
      }
      // Difficulty
      if (node.difficulty >= 3 && !isMystery) classes += ' hard';
      if (node.difficulty >= 4 && !isMystery) classes += ' elite';

      const nodeEl = el('div', { class: classes });

      // Show mystery icon/label for hidden nodes
      const displayIcon = isMystery ? '\u2753' : node.icon;
      const displayLabel = isMystery ? '???' : node.label;

      nodeEl.appendChild(el('span', { class: 'spire-node-icon', text: displayIcon }));

      // Show label with difficulty for enemies
      let labelText = displayLabel;
      if (!isMystery && node.type === 'enemy' && node.difficulty > 0) {
        const diffNames = ['', 'Easy', 'Med', 'Hard', 'ELITE'];
        labelText = diffNames[node.difficulty];
      }
      nodeEl.appendChild(el('span', { class: 'spire-node-label', text: labelText }));

      // Difficulty dots (only for visible enemies)
      if (!isMystery && node.difficulty > 0 && node.type === 'enemy') {
        const dots = '\u25CF'.repeat(node.difficulty);
        const dotColor = node.difficulty <= 1 ? 'var(--success)' : node.difficulty <= 2 ? 'var(--warning)' : 'var(--danger)';
        nodeEl.appendChild(el('span', { class: 'spire-node-diff', text: dots, style: `color:${dotColor}` }));
      }

      if (isAvailable && onNodeClick) {
        nodeEl.onclick = () => onNodeClick(node.id);
      }

      nodesDiv.appendChild(nodeEl);
    }

    row.appendChild(nodesDiv);
    map.appendChild(row);

    // Draw connection lines between this floor and the one below
    if (floor > 0) {
      const aboveNodes = columns[floor].filter(n => !n.pruned);
      const belowNodes = columns[floor - 1].filter(n => !n.pruned);
      if (aboveNodes.length === 0 || belowNodes.length === 0) continue;

      // Filter edges to only show non-pruned connections
      const liveEdges = edges.filter(e => {
        const from = belowNodes.find(n => n.id === e.from);
        const to = aboveNodes.find(n => n.id === e.to);
        return from && to;
      });

      if (liveEdges.length === 0) continue;

      const connRow = el('div', { class: 'spire-connections' });
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'spire-svg');
      svg.setAttribute('preserveAspectRatio', 'none');

      for (const edge of liveEdges) {
        const fromNode = belowNodes.find(n => n.id === edge.from);
        const toNode = aboveNodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) continue;

        const fromX = getNodeX(belowNodes.indexOf(fromNode), belowNodes.length);
        const toX = getNodeX(aboveNodes.indexOf(toNode), aboveNodes.length);
        const isActive = fromNode.visited || fromNode.id === currentId;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', `${fromX}%`);
        line.setAttribute('y1', '100%');
        line.setAttribute('x2', `${toX}%`);
        line.setAttribute('y2', '0%');
        line.setAttribute('class', `spire-line ${isActive ? 'active' : ''}`);
        svg.appendChild(line);
      }

      connRow.appendChild(svg);
      map.appendChild(connRow);
    }
  }

  return map;
}

function getNodeX(indexInVisible, totalVisible) {
  if (totalVisible === 1) return 50;
  const margin = 15;
  const spread = 100 - margin * 2;
  return margin + (indexInVisible / (totalVisible - 1)) * spread;
}

function isReachableFrom(raid, currentId, targetId) {
  return raid.path.edges.some(e => e.from === currentId && e.to === targetId);
}

// Compact overview for HUD
export function renderPathOverview(raid) {
  const path = raid.path;
  const currentNode = path.nodes.find(n => n.id === raid.currentNodeId);
  const floor = currentNode ? currentNode.floor : 0;

  return el('div', { class: 'raid-hud' }, [
    el('span', { class: 'raid-hud-zone', text: raid.zoneName }),
    el('span', { class: 'raid-hud-step', text: `Floor ${floor}/${path.numFloors - 1}` }),
  ]);
}
