export function drawTree(score, treeContainer) {
    treeContainer.innerHTML = ''; // Clear previous tree

    const svgNS = "http://www.w3.org/2000/svg";
    const numLeaves = 1 + score;
    const maxLeavesPerBranch = Math.round(Math.sqrt(numLeaves));
    const numBranches = Math.max(2, Math.round(numLeaves/maxLeavesPerBranch));
    const branchStartOffset = 100 + 3.5*numLeaves;

    // Teardrop shape: narrow bottom, bulge, taper top
    const controlPoints = [0.5, 1.0, 0.85, 0.5];

    // Generate Bezier weights per level
    let weights = [];
    let weightSum = 0;
    for (let i = 0; i < numBranches; i++) {
      const t = i / (numBranches - 1);
      const w = cubicBezierLevelDistribution(t, ...controlPoints);
      weights.push(w);
      weightSum += w;
    }

    // Convert weights to leaf counts
    let leavesPerBranch = weights.map(w => Math.round((w / weightSum) * numLeaves));

    // Adjust to ensure sum matches numLeaves exactly
    let totalAllocated = leavesPerBranch.reduce((a, b) => a + b, 0);

    while (totalAllocated < numLeaves) {
        const maxIdx = leavesPerBranch.indexOf(Math.max(...leavesPerBranch));
        leavesPerBranch[maxIdx]++;
        totalAllocated++;
    }

    while (totalAllocated > numLeaves) {
        const maxIdx = leavesPerBranch.indexOf(Math.max(...leavesPerBranch));
        leavesPerBranch[maxIdx]--;
        totalAllocated--;
    }

    const maxLeavesOnLevel = Math.max(...leavesPerBranch);


    let leafIndex = 0;
    const leafSize = 15;

    const trunkHeight = branchStartOffset + (numBranches * 20);
    const trunkWidthAtBase = Math.round(15 + numLeaves * 0.1);
    const trunkWidthAtTop = trunkWidthAtBase / 5;
    const maxBranchLength = (1 + maxLeavesOnLevel) * (leafSize * .8);
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

    drawTaperedTrunk(svg, baseX, baseY, trunkHeight, trunkWidthAtBase, trunkWidthAtTop);

    for (let branch = 0; branch < numBranches; branch++) {
        const leavesOnThisBranch = leavesPerBranch[branch];
        if (leavesOnThisBranch==0) continue;
        const usableTrunkHeight = trunkHeight - branchStartOffset;
        const y = baseY - branchStartOffset - (usableTrunkHeight / (numBranches - 1)) * branch;
        const heightFromBase = baseY - y;
        const side = branch % 2 === 0 ? 'left' : 'right';
        const minAngle = -15;
        const maxAngle = 90;
        const levelParam = Math.pow(branch / (numBranches - 1), 2);  // Normalized level from 0 to 1
        const branchAngle = minAngle + (maxAngle - minAngle) * levelParam;
        const branchLength = (1 + leavesOnThisBranch) * leafSize*.8;
        const branchWidth = trunkWidthAtBase - ((trunkWidthAtBase - trunkWidthAtTop) * (heightFromBase / trunkHeight));

        const branchX1 = baseX;
        const branchY1 = y;
        const dx = branchLength * Math.cos(branchAngle * Math.PI / 180);
        const dy = branchLength * Math.sin(branchAngle * Math.PI / 180);
        const branchX2 = side === 'left' ? branchX1 - dx : branchX1 + dx;
        const branchY2 = branchY1 - dy;

        const branchMidX = (branchX1 + branchX2) / 2;
        const wiggleAmount = 5 * (numBranches - branch - 1); // Increase for more curve

        const ctrl1X = branchX1 + (side === 'left' ? -wiggleAmount : wiggleAmount);
        const ctrl1Y = branchY1 - 20;

        const ctrl2X = branchMidX + (side === 'left' ? wiggleAmount : -wiggleAmount);
        const ctrl2Y = branchY2 - 20;

        drawBranch(svg, branchX1, branchY1, branchX2, branchY2, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, branchWidth, 2);

        for (let i = 0; i < leavesOnThisBranch; i++) {
            const isFirst = i === 0;
            let t;

            if (isFirst) {
                t = 1;
            } else {
                const slotIndex = i - 1;
                const linearT = (slotIndex + 1) / (leavesOnThisBranch + 1); // normalized 0–1
                const compression = 1.9; // try 1.5–2.0
                const easedT = .9 - Math.pow(linearT, compression);
                t = easedT;
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

    // Re-order the svg elements
    const items = Array.from(svg.children); // Get all children and convert to an array

    // Define the custom sort order
    const sortedItems = items.sort((a, b) => {
        const aType = a.dataset.order;
        const bType = b.dataset.order;

        // If `a` is a 'branch' and `b` is a 'leaf', `a` comes first.
        if (aType === 'branch' && bType === 'leaf') {
            return -1;
        }
        // If `a` is a 'leaf' and `b` is a 'branch', `b` comes first.
        if (aType === 'leaf' && bType === 'branch') {
            return 1;
        }
        // Otherwise, maintain original relative order.
        return 0;
    });

    sortedItems.forEach(item => {
        svg.appendChild(item);
    });

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


function drawTaperedTrunk(svg, baseX, baseY, height = 200, widthAtBase = 14, widthAtTop = 4) {
    const path = document.createElementNS(svg.namespaceURI, "path");

    const pathData = `
        M ${baseX - widthAtBase / 2} ${baseY}
        L ${baseX + widthAtBase / 2} ${baseY}
        L ${baseX + widthAtTop / 2} ${baseY - height}
        L ${baseX - widthAtTop / 2} ${baseY - height}
        Z
    `;
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "#7b4b25");
    path.dataset.order = "trunk";
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
    path.dataset.order = "branch";
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
    leftPath.setAttribute("fill", "#ff853f");

    const rightPath = document.createElementNS(svg.namespaceURI, "path");
    rightPath.setAttribute("d", `
        M ${bottom.x} ${bottom.y}
        C ${rightCtrlBottom.x} ${rightCtrlBottom.y}, ${rightCtrlTop.x} ${rightCtrlTop.y}, ${top.x} ${top.y}
        Z
    `);
    rightPath.setAttribute("fill", "#da6709ff");

    leafGroup.appendChild(leftPath);
    leafGroup.appendChild(rightPath);

    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90 + 90 * orientation;
    let transform = `rotate(${angle}, ${cx}, ${cy})`;

    if (orientation < 0) {
        transform += ` scale(-1, 1) translate(${-2 * cx}, 0)`;
    }

    leafGroup.setAttribute("transform", transform);
    leafGroup.dataset.order = "leaf";
    svg.appendChild(leafGroup);
}
