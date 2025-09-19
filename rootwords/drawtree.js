export function drawTree(score, treeContainer) {
    treeContainer.innerHTML = ''; // Clear previous tree

    const svgNS = "http://www.w3.org/2000/svg";
    const numLeaves = score;

    // Calculate trunk height and width based on leaf count
    const trunkHeight = 200 + numLeaves;
    const trunkWidth = Math.round(15 + numLeaves * 0.1);

    // Canvas dimensions
    const branchLengthFactor = 0.6;
    const maxBranchLength = trunkHeight * branchLengthFactor;
    const horizontalBuffer = 40;
    const totalWidth = maxBranchLength * 2 + horizontalBuffer * 2;
    const totalHeight = trunkHeight * 1.5;
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
    const leafSize = 15;

    for (let level = 0; level < levels; level++) {
        // New balanced leaf distribution
        const remainingLeaves = numLeaves - leafIndex;
        const remainingLevels = levels - level;
        const leavesOnThisBranch = Math.ceil(remainingLeaves / remainingLevels);

        const branchStartOffset = 100;
        const usableTrunkHeight = trunkHeight - branchStartOffset;
        const y = baseY - branchStartOffset - (usableTrunkHeight / (levels - 1)) * level;

        const side = level % 2 === 0 ? 'left' : 'right';

        const branchLength = (1+leavesOnThisBranch) * leafSize;
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
        
        // Curvier branch
        const ctrlX = (branchX1 + branchX2) / 2;
        const ctrlY = branchY1 - 40;

        drawBranch(svg, branchX1, branchY1, branchX2, branchY2, ctrlX, ctrlY, trunkWidthAtBranch, 1);

       for (let i = 0; i < leavesOnThisBranch; i++) {
          const isFirst = i === 0;

          let t;
          if (isFirst) {
            t = 1; // Tip of branch
          } else {
            const numRemainingLeaves = leavesOnThisBranch - 1;
            const slots = numRemainingLeaves + 1;

            // How far from base (t=0) to draw next leaf, leaving space at base and tip
            const gap = 0.9 / slots; // 0.9 = max distance covered (leave a 10% margin near tip)
            const slotIndex = i - 1;

            t = gap * (slotIndex + 1); // Skip 0th and final slot
          } 

          const branchStart = { x: branchX1, y: branchY1 };
          const branchEnd = { x: branchX2, y: branchY2 };
          const control = { x: ctrlX, y: ctrlY };

          const { x: bx, y: by, dx, dy } = getPointAndTangentOnQuadraticBezier(branchStart, control, branchEnd, t);

          const length = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / length;
          const ny = dx / length;

          const orientation = isFirst ? 0 : (i % 2 === 0 ? 1 : -1);  // 0 = follow curve, 1 = up, -1 = down

          let cx = bx;
          let cy = by;

          // Only offset perpendicular if not the first leaf
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

/**
 * Given a quadratic Bezier curve defined by start, control, and end points,
 * returns the position (x, y) and tangent vector (dx, dy) at parameter t.
 * 
 * @param {Object} start - { x, y } start point of the curve
 * @param {Object} control - { x, y } control point
 * @param {Object} end - { x, y } end point of the curve
 * @param {number} t - Parameter from 0 to 1 along the curve
 * @returns {Object} { x, y, dx, dy } - point and tangent at t
 */
function getPointAndTangentOnQuadraticBezier(start, control, end, t) {
  // Position along the curve
  const x = (1 - t) ** 2 * start.x +
            2 * (1 - t) * t * control.x +
            t ** 2 * end.x;

  const y = (1 - t) ** 2 * start.y +
            2 * (1 - t) * t * control.y +
            t ** 2 * end.y;

  // Tangent vector (derivative of the curve)
  const dx = 2 * (1 - t) * (control.x - start.x) +
             2 * t * (end.x - control.x);

  const dy = 2 * (1 - t) * (control.y - start.y) +
             2 * t * (end.y - control.y);

  return { x, y, dx, dy };
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
function drawBranch(svg, x1, y1, x2, y2, ctrlX, ctrlY, startThickness = 6, endThickness = 0) {
  const path = document.createElementNS(svg.namespaceURI, "path");

  // Direction and perpendicular vectors
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / length;
  const ny = dx / length;

  // Start thickness offset points
  const x1a = x1 + nx * (startThickness / 2);
  const y1a = y1 + ny * (startThickness / 2);
  const x1b = x1 - nx * (startThickness / 2);
  const y1b = y1 - ny * (startThickness / 2);

  // End thickness offset points
  const x2a = x2 + nx * (endThickness / 2);
  const y2a = y2 + ny * (endThickness / 2);
  const x2b = x2 - nx * (endThickness / 2);
  const y2b = y2 - ny * (endThickness / 2);

  const pathData = `
    M ${x1a} ${y1a}
    Q ${ctrlX} ${ctrlY}, ${x2a} ${y2a}
    L ${x2b} ${y2b}
    Q ${ctrlX} ${ctrlY}, ${x1b} ${y1b}
    Z
  `;

  path.setAttribute("d", pathData);
  path.setAttribute("fill", "#7b4b25");
  svg.appendChild(path);
}


// Draw a two-tone leaf with subtle shading
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
    // Mirror around the center (cx, cy)
    transform += ` scale(-1, 1) translate(${-2 * cx}, 0)`;
  }

  leafGroup.setAttribute("transform", transform);

  svg.appendChild(leafGroup);
}
