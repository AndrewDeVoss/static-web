import { getColors } from '../utility/color/color.js';

let colors = new Map();

export function drawTree(score, treeContainer) {
    treeContainer.innerHTML = ''; // Clear previous tree
    colors = getColors();
    score += 30;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMax meet");

    // Leaves and branches
    const numLeaves = Math.min(1 + score, 50);
    const maxLeavesPerBranch = Math.round(Math.sqrt(numLeaves));
    const numBranches = Math.max(2, Math.round(numLeaves/maxLeavesPerBranch));
    const trunkHeight = 50 + numBranches * 50;
    const branchStartOffset = trunkHeight * .6;
    const controlPoints = [0.5, 1.0, 0.85, 0.5]; // Teardrop
    let weights = [];
    let weightSum = 0;
    for (let i = 0; i < numBranches; i++) {
      const t = i / (numBranches - 1);
      const w = cubicBezierLevelDistribution(t, ...controlPoints);
      weights.push(w);
      weightSum += w;
    }
    let leavesPerBranch = weights.map(w => Math.round((w / weightSum) * numLeaves));
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

    // Flowers
    const maxNumFlowers = numBranches;
    const numPetals = Math.max(0, Math.min(score-numLeaves, maxNumFlowers*5));
    const numFlowers = (numPetals > 0) ? Math.min(maxNumFlowers, numPetals) : 0;
    const flowerPetalCounts = [];
    let flowerIndex = 0;
    for (let petal=0; petal<numPetals; petal++) {
        if (flowerPetalCounts.length < flowerIndex+1) {
            flowerPetalCounts.push(0);
        }
        flowerPetalCounts[flowerIndex]++;
        flowerIndex = (flowerIndex + 1) % numFlowers;
    }
    const flowerSize = leafSize * .4;

    // Butterflies
    const butterflySize = flowerSize * 2.5;
    const spacesPerButterfly = 10;
    let spacesLeft = Math.max(0, Math.min(numFlowers * spacesPerButterfly, score - numLeaves - numPetals));
    let butterflyParameters = [];
    while (spacesLeft>0) {
        const parameter = Math.min(1, spacesLeft / spacesPerButterfly);
        butterflyParameters.push(parameter);
        spacesLeft -= spacesPerButterfly;
    }

    // Trunk
    const trunkWidthAtBase = 6 + numLeaves * 0.1;
    const trunkWidthAtTop = trunkWidthAtBase / 5;
    const maxBranchLength = (1 + maxLeavesOnLevel) * (leafSize * .8);
    const horizontalBuffer = 40;
    const totalWidth = maxBranchLength * 2 + horizontalBuffer * 2;
    const totalHeight = trunkHeight * 1.8;
    const baseX = totalWidth / 2;
    const baseY = totalHeight;
    drawTaperedTrunk(svg, baseX, baseY, trunkHeight, trunkWidthAtBase, trunkWidthAtTop);

    // Draw items by branch
    for (let branch = 0; branch < numBranches; branch++) {
        const leavesOnThisBranch = leavesPerBranch[branch];
        if (leavesOnThisBranch==0) continue;
        const usableTrunkHeight = trunkHeight - branchStartOffset;
        const y = baseY - branchStartOffset - (usableTrunkHeight / (numBranches - 1)) * branch;
        const heightFromBase = baseY - y;
        let side = branch % 2 === 0 ? 'left' : 'right';
        const minAngle = -15 + 5*numBranches;
        const maxAngle = 70;
        const levelParam = Math.pow(branch / (numBranches - 1), 1.75);  // Point more up closer to top
        const branchAngle = minAngle + (maxAngle - minAngle) * levelParam;
        const branchLength = (1 + leavesOnThisBranch) * leafSize*.7;
        const branchWidth = trunkWidthAtBase - ((trunkWidthAtBase - trunkWidthAtTop) * (heightFromBase / trunkHeight));

        const branchX1 = baseX;
        const branchY1 = y;
        const dx = branchLength * Math.cos(branchAngle * Math.PI / 180);
        const dy = branchLength * Math.sin(branchAngle * Math.PI / 180);
        const branchX2 = side === 'left' ? branchX1 - dx : branchX1 + dx;
        const branchY2 = branchY1 - dy;

        const branchMidX = (branchX1 + branchX2) / 2;
        const branchMidY = (branchY1 + branchY2) / 2;
        const wiggleAmount = 1.5*leavesOnThisBranch;

        let ctrl1X = branchMidX + (side === 'left' ? -wiggleAmount : wiggleAmount);
        let ctrl1Y = branchMidY + wiggleAmount;

        let ctrl2X = ctrl1X;
        let ctrl2Y = ctrl1Y;

        drawBranch(svg, branchX1, branchY1, branchX2, branchY2, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, branchWidth, 2);

        const p0 = { x: branchX1, y: branchY1 };
        const p1 = { x: ctrl1X, y: ctrl1Y };
        const p2 = { x: ctrl2X, y: ctrl2Y };
        const p3 = { x: branchX2, y: branchY2 };

        // Build LUT once per branch
        const lut = buildBezierArcLengthLUT(p0, p1, p2, p3);
        const totalLength = lut[lut.length - 1].length;

        const leafSpacingFactor = 0.75; // tune this for overlap control
        let currentLength = totalLength - leafSize * 0.1; // start from tip

        for (let i = 0; i < leavesOnThisBranch; i++) {
            const isFirst = i === 0;
            let t;

            if (isFirst) {
                t = 1;
            } else {
                t = getTAtLength(lut, currentLength);  
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

            currentLength -= leafSize * leafSpacingFactor;
            leafIndex++;
            if (leafIndex >= numLeaves) break;
        }

        // Draw flower on this branch if we have more flowers to place
        if (flowerPetalCounts.length > 0) {
            const flowerT = 0.6;
            const { x: fx, y: fy } = getPointAndTangentOnCubicBezier(p0, p1, p2, p3, flowerT);
            const petalCount = flowerPetalCounts.shift();
            const rotation = 41 * (branch + 1);
            drawFlower(svg, fx, fy, rotation, petalCount, flowerSize);

            
            // Draw butterfly if there is one for this flower
            if (butterflyParameters.length > 0) {
                console.log(`drawing butterfly at flower ${numFlowers - flowerPetalCounts.length} on branch ${branch}`);
                const butterflyParameter = butterflyParameters.shift();
                const start = {x: 0, y:0};
                const end = {x: fx, y: fy};
                const center = {x: (start.x + end.x)*butterflyParameter, y: (start.y + end.y)*butterflyParameter};
                drawButterfly(svg, center.x, center.y, butterflySize, 0);
            }
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

    treeContainer.appendChild(svg);

    const bbox = svg.getBBox();
    const margin = 10;
    svg.setAttribute("viewBox", `${bbox.x - margin} ${bbox.y - margin} ${bbox.width + margin * 2} ${bbox.height + margin * 2}`);
    svg.setAttribute("width", bbox.width + margin * 2);
    svg.setAttribute("height", bbox.height + margin * 2);
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
    path.setAttribute("fill", colors.tree);
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
    path.setAttribute("fill", colors.tree);
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
    leftPath.setAttribute("fill", colors.leaf1);
    leftPath.setAttribute("stroke", "black");
    leftPath.setAttribute("stroke-width", "0.17");

    const rightPath = document.createElementNS(svg.namespaceURI, "path");
    rightPath.setAttribute("d", `
        M ${bottom.x} ${bottom.y}
        C ${rightCtrlBottom.x} ${rightCtrlBottom.y}, ${rightCtrlTop.x} ${rightCtrlTop.y}, ${top.x} ${top.y}
        Z
    `);
    rightPath.setAttribute("fill", colors.leaf2);
    rightPath.setAttribute("stroke", "black");
    rightPath.setAttribute("stroke-width", "0.17");

    // Point 1/3 up from bottom to top
    const stemStartY = bottom.y - (bottom.y - top.y) * (1 / 9);
    const stemStart = { x: bottom.x, y: stemStartY };
    const stemEnd = { x: bottom.x, y: bottom.y + size * 0.01 };

    const stemPath = document.createElementNS(svg.namespaceURI, "path");
    stemPath.setAttribute("d", `M ${stemStart.x} ${stemStart.y} L ${stemEnd.x} ${stemEnd.y}`);
    stemPath.setAttribute("stroke", colors.tree);
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

function drawFlower(svg, cx, cy, rotation, petals = 5, petalSize = 30) {
    const flowerGroup = document.createElementNS(svg.namespaceURI, "g");

    const strokeColor = "#222";
    const outerColor = colors.petal1;
    const innerColor = colors.petal2;

    if (petals === 1) {
        // Draw a small, simple bud
        const bud = document.createElementNS(svg.namespaceURI, "ellipse");
        bud.setAttribute("cx", cx);
        bud.setAttribute("cy", cy);
        bud.setAttribute("rx", petalSize * 0.4);
        bud.setAttribute("ry", petalSize * 0.7);
        bud.setAttribute("fill", outerColor);
        bud.setAttribute("stroke", strokeColor);
        bud.setAttribute("stroke-width", 0.5);
        flowerGroup.appendChild(bud);

        const budHighlight = document.createElementNS(svg.namespaceURI, "ellipse");
        budHighlight.setAttribute("cx", cx - petalSize * 0.1);
        budHighlight.setAttribute("cy", cy - petalSize * 0.2);
        budHighlight.setAttribute("rx", petalSize * 0.2);
        budHighlight.setAttribute("ry", petalSize * 0.35);
        budHighlight.setAttribute("fill", innerColor);
        budHighlight.setAttribute("fill-opacity", 0.5);
        flowerGroup.appendChild(budHighlight);
    } else {
        // Draw full flower with multiple petals
        const petalLength = petalSize * 2;
        const petalWidth = petalSize;

        for (let i = 0; i < petals; i++) {
            const angle = (360 / petals) * i;

            // Outer petal
            const petal = document.createElementNS(svg.namespaceURI, "path");
            const d = `
                M ${cx} ${cy}
                C ${cx + petalWidth} ${cy - petalLength / 3}, ${cx + petalWidth} ${cy - petalLength}, ${cx} ${cy - petalLength}
                C ${cx - petalWidth} ${cy - petalLength}, ${cx - petalWidth} ${cy - petalLength / 3}, ${cx} ${cy}
                Z
            `;
            petal.setAttribute("d", d);
            petal.setAttribute("fill", outerColor);
            petal.setAttribute("stroke", strokeColor);
            petal.setAttribute("stroke-width", 0.5);
            petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
            flowerGroup.appendChild(petal);

            // Center vein
            const vein = document.createElementNS(svg.namespaceURI, "line");
            vein.setAttribute("x1", cx);
            vein.setAttribute("y1", cy);
            vein.setAttribute("x2", cx);
            vein.setAttribute("y2", cy - petalLength * 0.9);
            vein.setAttribute("stroke", strokeColor);
            vein.setAttribute("stroke-width", 0.3);
            vein.setAttribute("stroke-opacity", 0.4);
            vein.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
            flowerGroup.appendChild(vein);

            // Inner overlay
            const innerPetal = document.createElementNS(svg.namespaceURI, "path");
            const innerWidth = petalWidth * 0.6;
            const innerLength = petalLength * 0.8;
            const dInner = `
                M ${cx} ${cy}
                C ${cx + innerWidth} ${cy - innerLength / 3}, ${cx + innerWidth} ${cy - innerLength}, ${cx} ${cy - innerLength}
                C ${cx - innerWidth} ${cy - innerLength}, ${cx - innerWidth} ${cy - innerLength / 3}, ${cx} ${cy}
                Z
            `;
            innerPetal.setAttribute("d", dInner);
            innerPetal.setAttribute("fill", innerColor);
            innerPetal.setAttribute("fill-opacity", 0.7);
            innerPetal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
            flowerGroup.appendChild(innerPetal);
        }

        // Center circle
        const center = document.createElementNS(svg.namespaceURI, "circle");
        center.setAttribute("cx", cx);
        center.setAttribute("cy", cy);
        center.setAttribute("r", petalSize / 2);
        center.setAttribute("fill", colors.flowerCenter);
        center.setAttribute("stroke", strokeColor);
        center.setAttribute("stroke-width", 0.5);
        flowerGroup.appendChild(center);
    }

    // Apply random rotation to entire flower group
    flowerGroup.setAttribute("transform", `rotate(${rotation}, ${cx}, ${cy})`);

    flowerGroup.dataset.order = "flower";
    svg.appendChild(flowerGroup);
}

function drawButterfly(svg, cx, cy, size = 20, rotation = 0) {
    const svgNS = svg.namespaceURI;
    const butterflyGroup = document.createElementNS(svgNS, 'g');

    // Colors
    const butterflyBody = colors.butterflyBody;
    const outerWing = colors.butterflyWing1;
    const innerWing = colors.butterflyWing2;
    const stroke = colors.butterflyBodyStroke;
    const stroke2 = colors.butterflyWingStroke;

    // Body
    const bodyLength = size * 0.8;
    const bodyWidth = size * 0.15;
    const body = document.createElementNS(svgNS, 'ellipse');
    body.setAttribute('cx', cx);
    body.setAttribute('cy', cy);
    body.setAttribute('rx', bodyWidth / 2);
    body.setAttribute('ry', bodyLength / 2);
    body.setAttribute('fill', butterflyBody);  // fallback color
    body.setAttribute('stroke', stroke);
    body.setAttribute('stroke-width', 0.8);
    butterflyGroup.appendChild(body);

    // Antennae
    for (const direction of [-1, 1]) {
        const antenna = document.createElementNS(svgNS, 'path');
        const startX = cx;
        const startY = cy - bodyLength / 2;
        const controlX = cx + direction * size * 0.25;
        const controlY = cy - bodyLength / 2 - size * 0.3;
        const endX = cx + direction * size * 0.15;
        const endY = cy - bodyLength / 2 - size * 0.5;
        const d = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
        antenna.setAttribute('d', d);
        antenna.setAttribute('stroke', stroke);
        antenna.setAttribute('stroke-width', 0.7);
        antenna.setAttribute('fill', 'none');
        butterflyGroup.appendChild(antenna);
    }

    // Left Wings - Outer
    const leftWingOuter = document.createElementNS(svgNS, 'path');
    leftWingOuter.setAttribute('d', `
        M ${cx} ${cy - bodyLength * 0.3}
        C ${cx - size * 1.2} ${cy - size * 0.6},
          ${cx - size * 1.1} ${cy + size * 0.8},
          ${cx} ${cy + size * 0.6}
        Z
    `);
    leftWingOuter.setAttribute('fill', outerWing);
    leftWingOuter.setAttribute('stroke', stroke2);
    leftWingOuter.setAttribute('stroke-width', 1);
    butterflyGroup.appendChild(leftWingOuter);

    // Left Wings - Inner
    const leftWingInner = document.createElementNS(svgNS, 'path');
    leftWingInner.setAttribute('d', `
        M ${cx} ${cy - bodyLength * 0.2}
        C ${cx - size * 0.9} ${cy - size * 0.3},
          ${cx - size * 0.9} ${cy + size * 0.5},
          ${cx} ${cy + size * 0.4}
        Z
    `);
    leftWingInner.setAttribute('fill', innerWing);
    leftWingInner.setAttribute('stroke', stroke2);
    leftWingInner.setAttribute('stroke-width', 0.7);
    butterflyGroup.appendChild(leftWingInner);

    // Right Wings - Outer
    const rightWingOuter = document.createElementNS(svgNS, 'path');
    rightWingOuter.setAttribute('d', `
        M ${cx} ${cy - bodyLength * 0.3}
        C ${cx + size * 1.2} ${cy - size * 0.6},
          ${cx + size * 1.1} ${cy + size * 0.8},
          ${cx} ${cy + size * 0.6}
        Z
    `);
    rightWingOuter.setAttribute('fill', outerWing);
    rightWingOuter.setAttribute('stroke', stroke2);
    rightWingOuter.setAttribute('stroke-width', 1);
    butterflyGroup.appendChild(rightWingOuter);

    // Right Wings - Inner
    const rightWingInner = document.createElementNS(svgNS, 'path');
    rightWingInner.setAttribute('d', `
        M ${cx} ${cy - bodyLength * 0.2}
        C ${cx + size * 0.9} ${cy - size * 0.3},
          ${cx + size * 0.9} ${cy + size * 0.5},
          ${cx} ${cy + size * 0.4}
        Z
    `);
    rightWingInner.setAttribute('fill', innerWing);
    rightWingInner.setAttribute('stroke', stroke2);
    rightWingInner.setAttribute('stroke-width', 0.7);
    butterflyGroup.appendChild(rightWingInner);

    // Add some wing spots (circles) on each wing inner
    const spotPositions = [
        { x: -0.4, y: 0.1 },
        { x: -0.7, y: 0.4 },
        { x: 0.4, y: 0.1 },
        { x: 0.7, y: 0.4 },
    ];
    const spotRadius = size * 0.1;
    for (const pos of spotPositions) {
        const spot = document.createElementNS(svgNS, 'circle');
        spot.setAttribute('cx', cx + pos.x * size);
        spot.setAttribute('cy', cy + pos.y * size);
        spot.setAttribute('r', spotRadius);
        spot.setAttribute('fill', stroke2);
        spot.setAttribute('opacity', 0.6);
        butterflyGroup.appendChild(spot);
    }

    // Rotate group if needed
    if (rotation !== 0) {
        butterflyGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
    }

    butterflyGroup.dataset.order = 'butterfly';
    svg.appendChild(butterflyGroup);
}
