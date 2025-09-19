export function drawTree(score, treeContainer) {
    treeContainer.innerHTML = ''; // Clear previous tree

    const svgNS = "http://www.w3.org/2000/svg";
    const numLeaves = 1 + score;
    const maxLeavesPerBranch = Math.round(Math.sqrt(numLeaves));
    const levels = Math.max(2, Math.round(numLeaves/maxLeavesPerBranch));

    // Teardrop shape: narrow bottom, bulge, taper top
    const controlPoints = [0.5, 1.0, 0.85, 0.5];

    // Generate Bezier weights per level
    let weights = [];
    let weightSum = 0;
    for (let i = 0; i < levels; i++) {
      const t = i / (levels - 1);
      const w = cubicBezierLevelDistribution(t, ...controlPoints);
      weights.push(w);
      weightSum += w;
    }

    // Convert weights to leaf counts
    let leavesPerLevel = weights.map(w => Math.round((w / weightSum) * numLeaves));

    // Adjust to ensure sum matches numLeaves exactly
    let totalAllocated = leavesPerLevel.reduce((a, b) => a + b, 0);

    while (totalAllocated < numLeaves) {
        const maxIdx = leavesPerLevel.indexOf(Math.max(...leavesPerLevel));
        leavesPerLevel[maxIdx]++;
        totalAllocated++;
    }

    while (totalAllocated > numLeaves) {
        const maxIdx = leavesPerLevel.indexOf(Math.max(...leavesPerLevel));
        leavesPerLevel[maxIdx]--;
        totalAllocated--;
    }

    const maxLeavesOnLevel = Math.max(...leavesPerLevel);


    let leafIndex = 0;
    const leafSize = 15;

    const trunkHeight = 100 + (levels * 20) + numLeaves;
    const trunkWidth = Math.round(15 + numLeaves * 0.1);

    const maxBranchLength = (1 + maxLeavesOnLevel) * (leafSize * 1.5);
    const horizontalBuffer = 40;
    const totalWidth = maxBranchLength * 2 + horizontalBuffer * 2;
    const totalHeight = trunkHeight * 1.5;
    const baseX = totalWidth / 2;
    const baseY = totalHeight;

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", totalWidth);
    svg.setAttribute("height", totalHeight);
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMax meet");

    drawTaperedTrunk(svg, baseX, baseY, trunkHeight, trunkWidth);


    for (let level = 0; level < levels; level++) {
        const leavesOnThisBranch = leavesPerLevel[level];
        if (leavesOnThisBranch==0) continue;
        const branchStartOffset = 100 + numLeaves;
        const usableTrunkHeight = trunkHeight - branchStartOffset;
        const y = baseY - branchStartOffset - (usableTrunkHeight / (levels - 1)) * level;
        const side = level % 2 === 0 ? 'left' : 'right';

        const branchLength = (1 + leavesOnThisBranch) * leafSize;
        const branchAngle = 10 + level;

        const heightFromBase = baseY - y;
        const topTrunkWidth = trunkWidth / (2 + levels / 2);
        const trunkWidthAtBranch = trunkWidth - ((trunkWidth - topTrunkWidth) * (heightFromBase / trunkHeight));

        const branchX1 = baseX;
        const branchY1 = y;
        const dx = branchLength * Math.cos(branchAngle * Math.PI / 180);
        const dy = branchLength * Math.sin(branchAngle * Math.PI / 180);
        const branchX2 = side === 'left' ? branchX1 - dx : branchX1 + dx;
        const branchY2 = branchY1 - dy;

        const branchMidX = (branchX1 + branchX2) / 2;
        const wiggleAmount = 20; // Increase for more curve

        const ctrl1X = branchX1 + (side === 'left' ? -wiggleAmount : wiggleAmount);
        const ctrl1Y = branchY1 - 20;

        const ctrl2X = branchMidX + (side === 'left' ? wiggleAmount : -wiggleAmount);
        const ctrl2Y = branchY2 - 20;

        drawBranch(svg, branchX1, branchY1, branchX2, branchY2, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, trunkWidthAtBranch, 1);

        for (let i = 0; i < leavesOnThisBranch; i++) {
            const isFirst = i === 0;
            let t;

            if (isFirst) {
                t = 1;
            } else {
                const numRemainingLeaves = leavesOnThisBranch - 1;
                const slots = numRemainingLeaves + 1;
                const gap = 0.7 / slots;
                const slotIndex = i - 1;
                t = 1 - gap * (slotIndex + 1);
            }

            const branchStart = { x: branchX1, y: branchY1 };
            const branchEnd = { x: branchX2, y: branchY2 };

            const { x: bx, y: by, dx, dy } = getPointAndTangentOnCubicBezier(
                branchStart,
                { x: ctrl1X, y: ctrl1Y },
                { x: ctrl2X, y: ctrl2Y },
                branchEnd,
                t
            );


            const length = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / length;
            const ny = dx / length;

            const orientation = isFirst ? 0 : (i % 2 === 0 ? 1 : -1);

            let cx = bx;
            let cy = by;

            if (!isFirst) {
                cx += nx * leafSize * orientation;
                cy += ny * leafSize * orientation;
            }

            drawLeaf(svg, cx, cy, leafSize, dx, dy, orientation);

            leafIndex++;
            if (leafIndex >= numLeaves) break;
        }

        if (leafIndex >= numLeaves) break;
    }

    treeContainer.appendChild(svg);
}

// Quadratic bezier evaluator for leaf distribution
function cubicBezierLevelDistribution(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return mt ** 3 * p0 +
         3 * mt * mt * t * p1 +
         3 * mt * t * t * p2 +
         t ** 3 * p3;
}


function getPointAndTangentOnQuadraticBezier(start, control, end, t) {
    const x = (1 - t) ** 2 * start.x +
              2 * (1 - t) * t * control.x +
              t ** 2 * end.x;

    const y = (1 - t) ** 2 * start.y +
              2 * (1 - t) * t * control.y +
              t ** 2 * end.y;

    const dx = 2 * (1 - t) * (control.x - start.x) +
               2 * t * (end.x - control.x);

    const dy = 2 * (1 - t) * (control.y - start.y) +
               2 * t * (end.y - control.y);

    return { x, y, dx, dy };
}

function getPointAndTangentOnCubicBezier(p0, p1, p2, p3, t) {
    const x = (1 - t) ** 3 * p0.x +
              3 * (1 - t) ** 2 * t * p1.x +
              3 * (1 - t) * t ** 2 * p2.x +
              t ** 3 * p3.x;

    const y = (1 - t) ** 3 * p0.y +
              3 * (1 - t) ** 2 * t * p1.y +
              3 * (1 - t) * t ** 2 * p2.y +
              t ** 3 * p3.y;

    const dx = 3 * (1 - t) ** 2 * (p1.x - p0.x) +
               6 * (1 - t) * t * (p2.x - p1.x) +
               3 * t ** 2 * (p3.x - p2.x);

    const dy = 3 * (1 - t) ** 2 * (p1.y - p0.y) +
               6 * (1 - t) * t * (p2.y - p1.y) +
               3 * t ** 2 * (p3.y - p2.y);

    return { x, y, dx, dy };
}


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

function drawBranch(svg, x1, y1, x2, y2, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, startThickness = 6, endThickness = 0) {
    const path = document.createElementNS(svg.namespaceURI, "path");

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / length;
    const ny = dx / length;

    const x1a = x1 + nx * (startThickness / 2);
    const y1a = y1 + ny * (startThickness / 2);
    const x1b = x1 - nx * (startThickness / 2);
    const y1b = y1 - ny * (startThickness / 2);

    const x2a = x2 + nx * (endThickness / 2);
    const y2a = y2 + ny * (endThickness / 2);
    const x2b = x2 - nx * (endThickness / 2);
    const y2b = y2 - ny * (endThickness / 2);

    const pathData = `
        M ${x1a} ${y1a}
        C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${x2a} ${y2a}
        L ${x2b} ${y2b}
        C ${ctrl2X} ${ctrl2Y}, ${ctrl1X} ${ctrl1Y}, ${x1b} ${y1b}
        Z
    `;

    path.setAttribute("d", pathData);
    path.setAttribute("fill", "#7b4b25");
    svg.appendChild(path);
}


function drawLeaf(svg, cx, cy, size = 10, dx = 0, dy = -1, orientation = 1) {
    const leafGroup = document.createElementNS(svg.namespaceURI, "g");

    const top = { x: cx, y: cy - size };
    const bottom = { x: cx, y: cy + size };

    const leftCtrlBottom = { x: cx - size * 1.0, y: cy + size * 0.4 };
    const leftCtrlTop = { x: cx - size * 0.5, y: cy - size * 0.4 };
    const rightCtrlBottom = { x: cx + size * 1.0, y: cy + size * 0.4 };
    const rightCtrlTop = { x: cx + size * 0.5, y: cy - size * 0.4 };

    const leftPath = document.createElementNS(svg.namespaceURI, "path");
    leftPath.setAttribute("d", `
        M ${bottom.x} ${bottom.y}
        C ${leftCtrlBottom.x} ${leftCtrlBottom.y}, ${leftCtrlTop.x} ${leftCtrlTop.y}, ${top.x} ${top.y}
        Z
    `);
    leftPath.setAttribute("fill", "#7ed957");

    const rightPath = document.createElementNS(svg.namespaceURI, "path");
    rightPath.setAttribute("d", `
        M ${bottom.x} ${bottom.y}
        C ${rightCtrlBottom.x} ${rightCtrlBottom.y}, ${rightCtrlTop.x} ${rightCtrlTop.y}, ${top.x} ${top.y}
        Z
    `);
    rightPath.setAttribute("fill", "#4caf50");

    leafGroup.appendChild(leftPath);
    leafGroup.appendChild(rightPath);

    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90 + 90 * orientation;
    let transform = `rotate(${angle}, ${cx}, ${cy})`;

    if (orientation < 0) {
        transform += ` scale(-1, 1) translate(${-2 * cx}, 0)`;
    }

    leafGroup.setAttribute("transform", transform);
    svg.appendChild(leafGroup);
}
