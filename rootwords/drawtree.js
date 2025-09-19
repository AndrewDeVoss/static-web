export function drawTree(score, treeContainer) {
  treeContainer.innerHTML = ''; // Clear previous tree

  const svgNS = "http://www.w3.org/2000/svg";
  const svgWidth = 200;
  const maxLeaves = Math.min(score, 100);

  // Trunk dimensions
  const minTrunkHeight = 200;
  const maxTrunkHeight = 1000;
  const minTrunkWidth = 5;
  const maxTrunkWidth = 50;

    // Trunk dimensions (scaling with score)
    const trunkHeight = minTrunkHeight + (maxTrunkHeight - minTrunkHeight) * (maxLeaves / 100);
    const trunkWidth = minTrunkWidth + (maxTrunkWidth - minTrunkWidth) * (maxLeaves / 100);

    // Dynamically calculate width based on longest branch
    const maxBranchLength = trunkHeight * 0.9;
    const horizontalBuffer = 40;
    const totalWidth = maxBranchLength * 2 + horizontalBuffer * 2;
    const totalHeight = trunkHeight + maxBranchLength + 60; // add top buffer
    const baseX = totalWidth / 2;
    const baseY = totalHeight;

    // Create SVG
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", totalWidth);
    svg.setAttribute("height", totalHeight);
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMax meet");


  // Draw trunk (tapered)
  drawTaperedTrunk(svg, baseX, baseY, trunkHeight, trunkWidth);

  // Branches & leaves
  const levels = 5;
  const leavesPerLevel = Math.ceil(maxLeaves / levels);
  let leafIndex = 0;

  for (let level = 0; level < levels; level++) {
    const branchStartOffset = 100; // Minimum height from bottom to first branch
    const usableTrunkHeight = trunkHeight - branchStartOffset;
    const y = baseY - branchStartOffset - (usableTrunkHeight / (levels - 1)) * level;

    const side = level % 2 === 0 ? 'left' : 'right';

    const branchLength = trunkHeight * 0.9 * (1 - level * 0.1);
    const branchAngle = 20 + level * 3;

    // Tapering for branch
    const heightFromBase = baseY - y;
    const topTrunkWidth = trunkWidth / 8;
    const trunkWidthAtBranch = trunkWidth - ((trunkWidth - topTrunkWidth) * (heightFromBase / trunkHeight));

    const branchX1 = baseX;
    const branchY1 = y;
    const dx = branchLength * Math.cos(branchAngle * Math.PI / 180);
    const dy = branchLength * Math.sin(branchAngle * Math.PI / 180);
    const branchX2 = side === 'left' ? branchX1 - dx : branchX1 + dx;
    const branchY2 = branchY1 - dy;

    drawBranch(svg, branchX1, branchY1, branchX2, branchY2, trunkWidthAtBranch, 0);

    const leavesOnThisBranch = Math.min(leavesPerLevel + (levels - level), maxLeaves - leafIndex);

    for (let i = 0; i < leavesOnThisBranch; i++) {
      const t = i / (leavesOnThisBranch - 1 || 1);
      const lx = branchX1 + (branchX2 - branchX1) * t + (Math.random() - 0.5) * 6;
      const ly = branchY1 + (branchY2 - branchY1) * t + (Math.random() - 0.5) * 6;
      drawLeaf(svg, lx, ly, 7);
      leafIndex++;
      if (leafIndex >= maxLeaves) break;
    }

    if (leafIndex >= maxLeaves) break;
  }

  treeContainer.appendChild(svg);
}


// Draw tapered trunk: thick at base, narrow at top, straight vertical
function drawTaperedTrunk(svg, baseX, baseY, height = 200, width = 14) {
  const path = document.createElementNS(svg.namespaceURI, "path");
  const topWidth = width / 8;

  const pathData = `
    M ${baseX - width / 2} ${baseY}
    L ${baseX + width / 2} ${baseY}
    L ${baseX + topWidth / 2} ${baseY - height}
    L ${baseX - topWidth / 2} ${baseY - height}
    Z
  `;
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "#7b4b25");
  svg.appendChild(path);
}

// Draw a tapered, curved branch as a filled path
// startThickness = trunk width at base of branch, endThickness = 0 (pointed tip)
function drawBranch(svg, x1, y1, x2, y2, startThickness = 6) {
  const path = document.createElementNS(svg.namespaceURI, "path");

  // Curvier branch
  const ctrlX = (x1 + x2) / 2;
  const ctrlY = y1 - 40;

  // Perpendicular direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / length;
  const ny = dx / length;

  // Start thickness
  const x1a = x1 + nx * (startThickness / 2);
  const y1a = y1 + ny * (startThickness / 2);
  const x1b = x1 - nx * (startThickness / 2);
  const y1b = y1 - ny * (startThickness / 2);

  // The tip is now a single point (x2, y2)
  const pathData = `
    M ${x1a} ${y1a}
    Q ${ctrlX} ${ctrlY}, ${x2} ${y2}
    Q ${ctrlX} ${ctrlY}, ${x1b} ${y1b}
    Z
  `;

  path.setAttribute("d", pathData);
  path.setAttribute("fill", "#7b4b25");
  svg.appendChild(path);
}


// Draw a two-tone leaf with subtle shading
function drawLeaf(svg, cx, cy, size = 10) {
  const leafGroup = document.createElementNS(svg.namespaceURI, "g");

  const top = { x: cx, y: cy - size };
  const bottom = { x: cx, y: cy + size };
  const leftCtrl = { x: cx - size, y: cy };
  const rightCtrl = { x: cx + size, y: cy };

  const leftHalf = document.createElementNS(svg.namespaceURI, "path");
  const leftPath = `
    M ${cx} ${cy}
    C ${leftCtrl.x} ${leftCtrl.y}, ${leftCtrl.x} ${leftCtrl.y}, ${top.x} ${top.y}
    C ${leftCtrl.x} ${leftCtrl.y}, ${leftCtrl.x} ${leftCtrl.y}, ${bottom.x} ${bottom.y}
    Z
  `;
  leftHalf.setAttribute("d", leftPath);
  leftHalf.setAttribute("fill", "#7ed957");

  const rightHalf = document.createElementNS(svg.namespaceURI, "path");
  const rightPath = `
    M ${cx} ${cy}
    C ${rightCtrl.x} ${rightCtrl.y}, ${rightCtrl.x} ${rightCtrl.y}, ${top.x} ${top.y}
    C ${rightCtrl.x} ${rightCtrl.y}, ${rightCtrl.x} ${rightCtrl.y}, ${bottom.x} ${bottom.y}
    Z
  `;
  rightHalf.setAttribute("d", rightPath);
  rightHalf.setAttribute("fill", "#4caf50");

  leafGroup.appendChild(leftHalf);
  leafGroup.appendChild(rightHalf);
  svg.appendChild(leafGroup);
}
