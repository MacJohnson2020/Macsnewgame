// === Voidborn — Slay the Spire Style Map Renderer ===

import { getChildren } from './generator.js';
import { el } from '../utils.js';

// Render the full map as a vertical column layout
// Each floor is a row, nodes are clickable circles, lines connect them
export function renderPath(raid, onNodeClick) {
  const { columns, edges, currentFloor } = raid.path;
  const currentId = raid.currentNodeId;

  const map = el('div', { class: 'spire-map' });

  // Render floors bottom-to-top (start at bottom, extraction at top)
  for (let floor = columns.length - 1; floor >= 0; floor--) {
    const floorNodes = columns[floor];
    const isCurrentFloor = floor === currentFloor;

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

      let classes = 'spire-node';
      if (isCurrent) classes += ' current';
      if (isPast) classes += ' visited';
      if (isAvailable) classes += ' available';
      if (isFuture) classes += ' future';
      if (node.type === 'extraction') classes += ' extraction';
      if (node.type === 'enemy') classes += ' enemy';
      if (node.type === 'chest') classes += ' chest';
      if (node.type === 'shrine') classes += ' shrine';
      if (node.type === 'merchant') classes += ' merchant';

      const nodeEl = el('div', { class: classes });
      nodeEl.appendChild(el('span', { class: 'spire-node-icon', text: node.icon }));
      nodeEl.appendChild(el('span', { class: 'spire-node-label', text: node.label }));

      if (isAvailable && onNodeClick) {
        nodeEl.onclick = () => onNodeClick(node.id);
      }

      nodesDiv.appendChild(nodeEl);
    }

    row.appendChild(nodesDiv);
    map.appendChild(row);

    // Draw connection lines between this floor and the one below
    if (floor > 0) {
      const connRow = el('div', { class: 'spire-connections' });
      const aboveNodes = columns[floor];
      const belowNodes = columns[floor - 1];

      // SVG for clean connection lines
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'spire-svg');
      svg.setAttribute('preserveAspectRatio', 'none');

      // We'll position lines based on node indices
      for (const edge of edges) {
        const fromNode = belowNodes.find(n => n.id === edge.from);
        const toNode = aboveNodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) continue;

        const fromX = getNodeX(fromNode.lane, belowNodes.length);
        const toX = getNodeX(toNode.lane, aboveNodes.length);

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

function getNodeX(lane, totalInRow) {
  if (totalInRow === 1) return 50;
  const margin = 15;
  const spread = 100 - margin * 2;
  return margin + (lane / (totalInRow - 1)) * spread;
}

function isReachableFrom(raid, currentId, targetId) {
  return raid.path.edges.some(e => e.from === currentId && e.to === targetId);
}

// Compact overview for HUD
export function renderPathOverview(raid) {
  const path = raid.path;
  const visited = path.nodes.filter(n => n.visited).length;
  const total = path.nodes.length;
  const currentNode = path.nodes.find(n => n.id === raid.currentNodeId);
  const floor = currentNode ? currentNode.floor : 0;

  return el('div', { class: 'raid-hud' }, [
    el('span', { class: 'raid-hud-zone', text: raid.zoneName }),
    el('span', { class: 'raid-hud-step', text: `Floor ${floor}/${path.numFloors - 1}` }),
  ]);
}
