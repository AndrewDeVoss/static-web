export function drawTree(score, treeContainer) {
    treeContainer.innerHTML = ''; // Clear previous tree

    const svgNS = "http://www.w3.org/2000/svg";
    const numLeaves = 1 + score;
    const maxLeavesPerBranch = Math.round(Math.sqrt(numLeaves));
    const numBranches = Math.max(2, Math.round(numLeaves/maxLeavesPerBranch));
    const branchStartOffset = 50 + 2.2*numLeaves;

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
    const trunkWidthAtBase = 6 + numLeaves * 0.1;
    const trunkWidthAtTop = trunkWidthAtBase / 5;
    const maxBranchLength = (1 + maxLeavesOnLevel) * (leafSize * .8);
    const horizontalBuffer = 40;
    const totalWidth = maxBranchLength * 2 + horizontalBuffer * 2;
    const totalHeight = trunkHeight * 1.8;
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
        let side = branch % 2 === 0 ? 'left' : 'right';
        const minAngle = -15;
        const maxAngle = 80;
        const levelParam = Math.pow(branch / (numBranches - 1), 2);  // Normalized level from 0 to 1
        const branchAngle = minAngle + (maxAngle - minAngle) * levelParam;
        const branchLength = (1 + leavesOnThisBranch) * leafSize*.75;
        const branchWidth = trunkWidthAtBase - ((trunkWidthAtBase - trunkWidthAtTop) * (heightFromBase / trunkHeight));

        const branchX1 = baseX;
        const branchY1 = y;
        const dx = branchLength * Math.cos(branchAngle * Math.PI / 180);
        const dy = branchLength * Math.sin(branchAngle * Math.PI / 180);
        const branchX2 = side === 'left' ? branchX1 - dx : branchX1 + dx;
        const branchY2 = branchY1 - dy;

        const branchMidX = (branchX1 + branchX2) / 2;
        const branchMidY = (branchY1 + branchY2) / 2;
        const wiggleAmount = 2*leavesOnThisBranch;

        const ctrl1X = branchMidX + (side === 'left' ? -wiggleAmount : wiggleAmount);
        const ctrl1Y = branchMidY - wiggleAmount;

        const ctrl2X = ctrl1X;
        const ctrl2Y = ctrl1Y;

        drawBranch(svg, branchX1, branchY1, branchX2, branchY2, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, branchWidth, 2);

        const p0 = { x: branchX1, y: branchY1 };
        const p1 = { x: ctrl1X, y: ctrl1Y };
        const p2 = { x: ctrl2X, y: ctrl2Y };
        const p3 = { x: branchX2, y: branchY2 };

        // Build LUT once per branch
        const lut = buildBezierArcLengthLUT(p0, p1, p2, p3);
        const totalLength = lut[lut.length - 1].length;
        const spacing = leafSize * 0.7; // or adjust as needed TODO needs factor of total length
        const notFirstOffsetPercent = .10;

        for (let i = 0; i < leavesOnThisBranch; i++) {
            const isFirst = i === 0;
            let t;

            // TODO t should be a function of the branch curve and the leaf size so that they do not overlap but barely
            if (isFirst) {
                t = 1;
            } else {
                const distance = totalLength - totalLength*notFirstOffsetPercent - spacing * i;
                t = getTAtLength(lut, distance);  
            }

            const { x: bx, y: by, dx, dy } = getPointAndTangentOnCubicBezier(p0, p1, p2, p3, t);

            const length = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / length;
            const ny = dx / length;

            const orientation = isFirst ? 0 : (i % 2 === 0 ? 1 : -1);

            let cx, cy;
            if (isFirst) {
                // Shift forward along the branch direction by half the leaf size
                cx = bx + dx / length * (leafSize / 2);
                cy = by + dy / length * (leafSize / 2);
            } else {
                cx = bx + nx * leafSize * orientation;
                cy = by + ny * leafSize * orientation;
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
        
        if (aType==='trunk') return 1;
        if (bType==='trunk') return -1;
        
        if (aType === 'branch' && bType === 'leaf') {
            return 1;
        }
        if (aType === 'leaf' && bType === 'branch') {
            return -1;
        }
        // Otherwise, maintain original relative order.
        return 0;
    });

    sortedItems.forEach(item => {
        svg.appendChild(item);
    });

    treeContainer.appendChild(svg);
}

function buildBezierArcLengthLUT(p0, p1, p2, p3, steps = 100) {
    const lut = [];
    let length = 0;
    let prev = getPointAndTangentOnCubicBezier(p0, p1, p2, p3, 0);

    lut.push({ t: 0, length: 0 });

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getPointAndTangentOnCubicBezier(p0, p1, p2, p3, t);
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        length += segmentLength;
        lut.push({ t, length });
        prev = pt;
    }

    return lut;
}

function getTAtLength(lut, targetLength) {
    for (let i = 1; i < lut.length; i++) {
        const prev = lut[i - 1];
        const curr = lut[i];

        if (targetLength <= curr.length) {
            const segmentLen = curr.length - prev.length;
            const segmentT = curr.t - prev.t;
            const proportion = (targetLength - prev.length) / segmentLen;
            return prev.t + proportion * segmentT;
        }
    }

    return 1; // fallback to end of curve
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

    // Point 1/3 up from bottom to top
    const stemStartY = bottom.y - (bottom.y - top.y) * (1 / 9);
    const stemStart = { x: bottom.x, y: stemStartY };
    const stemEnd = { x: bottom.x, y: bottom.y + size * 0.01 };

    const stemPath = document.createElementNS(svg.namespaceURI, "path");
    stemPath.setAttribute("d", `M ${stemStart.x} ${stemStart.y} L ${stemEnd.x} ${stemEnd.y}`);
    stemPath.setAttribute("stroke", "#5a3e1b");
    stemPath.setAttribute("stroke-width", size * 0.05);
    stemPath.setAttribute("fill", "none");

    leafGroup.appendChild(leftPath);
    leafGroup.appendChild(rightPath);
    leafGroup.appendChild(stemPath);

    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90 + 90 * orientation;
    let transform = `rotate(${angle}, ${cx}, ${cy})`;

    if (orientation < 0) {
        transform += ` scale(-1, 1) translate(${-2 * cx}, 0)`;
    }

    leafGroup.setAttribute("transform", transform);
    leafGroup.dataset.order = "leaf";
    svg.appendChild(leafGroup);
}
