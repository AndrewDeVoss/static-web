export function drawTree(score, treeContainer) {
    treeContainer.innerHTML = ''; // Clear previous tree

    const svgNS = "http://www.w3.org/2000/svg";
    const maxLeaves = Math.min(score, 100);
    
    // Minimum trunk dimensions
    const minTrunkHeight = 200;
    const minTrunkWidth = 5;

    // Scale factors for height and width per leaf
    const heightPerLeaf = 8;
    const widthPerLeaf = 0.4;

    // Calculate trunk height and width based on leaf count
    const trunkHeight = Math.max(minTrunkHeight, maxLeaves * heightPerLeaf);
    const trunkWidth = Math.max(minTrunkWidth, maxLeaves * widthPerLeaf);

    // Canvas dimensions
    const maxBranchLength = trunkHeight * 0.9;
    const horizontalBuffer = 40;
    const totalWidth = maxBranchLength * 2 + horizontalBuffer * 2;
    const totalHeight = trunkHeight + 20;
    const baseX = totalWidth / 2;
    const baseY = totalHeight;

    // Create SVG
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", totalWidth);
    svg.setAttribute("height", totalHeight);
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMax meet");

    // Draw trunk
    drawTaperedTrunk(svg, baseX, baseY, trunkHeight, trunkWidth);

    // Draw branches and leaves
    const levels = 5;
    let leafIndex = 0;

    for (let level = 0; level < levels; level++) {
        const branchStartOffset = 100;
        const usableTrunkHeight = trunkHeight - branchStartOffset;
        const y = baseY - branchStartOffset - (usableTrunkHeight / (levels - 1)) * level;

        const side = level % 2 === 0 ? 'left' : 'right';

        const branchLength = trunkHeight * 0.9 * (1 - level * 0.1);
        const branchAngle = 20 + level * 3;

        // Taper branch
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

        // ✅ New balanced leaf distribution
        const remainingLeaves = maxLeaves - leafIndex;
        const remainingLevels = levels - level;
        const leavesOnThisBranch = Math.ceil(remainingLeaves / remainingLevels);

        for (let i = 0; i < leavesOnThisBranch; i++) {
            const t = i / (leavesOnThisBranch - 1 || 1);

            // You can re-enable randomness later by uncommenting the following lines
            // const lx = branchX1 + (branchX2 - branchX1) * t + (Math.random() - 0.5) * 6;
            // const ly = branchY1 + (branchY2 - branchY1) * t + (Math.random() - 0.5) * 6;

            // 🔍 Clean version without randomness
            const lx = branchX1 + (branchX2 - branchX1) * t;
            const ly = branchY1 + (branchY2 - branchY1) * t;

            drawLeaf(svg, lx, ly, 15);
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

  // Wider at the base, narrower at the tip
  const leftCtrlBottom = { x: cx - size * 1.0, y: cy + size * 0.4 };
  const leftCtrlTop = { x: cx - size * 0.5, y: cy - size * 0.4 };
  const rightCtrlBottom = { x: cx + size * 1.0, y: cy + size * 0.4 };
  const rightCtrlTop = { x: cx + size * 0.5, y: cy - size * 0.4 };

  // Left half of the leaf (lighter green)
  const leftPath = document.createElementNS(svg.namespaceURI, "path");
  const leftD = `
    M ${bottom.x} ${bottom.y}
    C ${leftCtrlBottom.x} ${leftCtrlBottom.y}, ${leftCtrlTop.x} ${leftCtrlTop.y}, ${top.x} ${top.y}
    Z
  `;
  leftPath.setAttribute("d", leftD);
  leftPath.setAttribute("fill", "#7ed957");

  // Right half of the leaf (darker green)
  const rightPath = document.createElementNS(svg.namespaceURI, "path");
  const rightD = `
    M ${bottom.x} ${bottom.y}
    C ${rightCtrlBottom.x} ${rightCtrlBottom.y}, ${rightCtrlTop.x} ${rightCtrlTop.y}, ${top.x} ${top.y}
    Z
  `;
  rightPath.setAttribute("d", rightD);
  rightPath.setAttribute("fill", "#4caf50");

  // Optional: random rotation to look natural
  const randomAngle = (Math.random() - 0.5) * 50; // -25° to +25°
  leafGroup.setAttribute("transform", `rotate(${randomAngle}, ${cx}, ${cy})`);

  leafGroup.appendChild(leftPath);
  leafGroup.appendChild(rightPath);
  svg.appendChild(leafGroup);
}

