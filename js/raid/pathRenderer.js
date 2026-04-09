// === Voidborn — DOM Path Renderer ===

import { getChildren } from './generator.js';
import { el } from '../utils.js';

// Render the path map as DOM
export function renderPath(raid, onNodeClick) {
  const container = el('div', { class: 'raid-path' });
  const path = raid.path;
  const currentId = raid.currentNodeId;

  // Build the path as a tree from the start node
  const startNode = path.nodes[0];
  renderBranch(container, path, startNode, currentId, onNodeClick);

  return container;
}

function renderBranch(container, path, node, currentId, onNodeClick) {
  const children = getChildren(path, node.id);
  const row = el('div', { class: 'path-row' });

  // Render the current node
  const nodeEl = renderNode(node, currentId, onNodeClick, children.length > 1);
  row.appendChild(nodeEl);

  if (children.length === 1) {
    // Single path forward — render connector and continue
    const conn = el('div', { class: `path-connector ${node.visited ? 'active' : ''}` });
    row.appendChild(conn);
    container.appendChild(row);
    renderBranch(container, path, children[0], currentId, onNodeClick);
  } else if (children.length > 1) {
    // Fork — render branches side by side
    container.appendChild(row);

    const forkContainer = el('div', { class: 'fork-container' });
    const branches = el('div', { class: 'fork-branches' });

    for (const child of children) {
      const branchDiv = el('div', { class: 'fork-branch' });
      const label = child.branch === 'risky' ? 'Risky Path' : 'Safe Path';
      branchDiv.appendChild(el('span', { class: 'branch-label', text: label }));
      renderBranchColumn(branchDiv, path, child, currentId, onNodeClick);
      branches.appendChild(branchDiv);
    }

    forkContainer.appendChild(branches);
    container.appendChild(forkContainer);
  } else {
    // Leaf node (no children)
    container.appendChild(row);
  }
}

function renderBranchColumn(container, path, node, currentId, onNodeClick) {
  const children = getChildren(path, node.id);

  const nodeEl = renderNode(node, currentId, onNodeClick, false);
  container.appendChild(nodeEl);

  if (children.length === 1) {
    const conn = el('div', { class: `path-connector vertical ${node.visited ? 'active' : ''}` });
    container.appendChild(conn);
    renderBranchColumn(container, path, children[0], currentId, onNodeClick);
  } else if (children.length > 1) {
    // Nested fork within a branch — render inline
    const subFork = el('div', { class: 'fork-branches', style: 'font-size: 0.9em;' });
    for (const child of children) {
      const subBranch = el('div', { class: 'fork-branch' });
      renderBranchColumn(subBranch, path, child, currentId, onNodeClick);
      subFork.appendChild(subBranch);
    }
    container.appendChild(subFork);
  }
}

function renderNode(node, currentId, onNodeClick, isFork) {
  const isCurrent = node.id === currentId;
  const isAvailable = !node.visited && node.revealed;

  let classes = 'path-node';
  if (isCurrent) classes += ' current';
  if (node.visited) classes += ' visited';
  if (isAvailable) classes += ' available';
  if (!node.revealed && !node.visited) classes += ' hidden-node';
  if (node.type === 'extraction') classes += ' extraction';

  const nodeEl = el('div', {
    class: classes,
    text: node.visited || node.revealed ? node.icon : '?',
  });

  if (isAvailable && onNodeClick) {
    nodeEl.onclick = () => onNodeClick(node.id);
  }

  return nodeEl;
}

// Render a compact path overview (for HUD)
export function renderPathOverview(raid) {
  const path = raid.path;
  const totalNodes = path.nodes.length;
  const visitedNodes = path.nodes.filter(n => n.visited).length;
  const currentNode = path.nodes.find(n => n.id === raid.currentNodeId);

  return el('div', { class: 'raid-hud' }, [
    el('span', { class: 'raid-hud-zone', text: raid.zoneName }),
    el('span', { class: 'raid-hud-step', text: `Step ${raid.steps} | ${visitedNodes}/${totalNodes} nodes` }),
    el('span', { class: 'raid-hud-step', text: currentNode ? currentNode.label : '' }),
  ]);
}
