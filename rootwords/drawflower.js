import { getColors } from '../utility/color/color.js';
import { drawLeaf } from './drawtree.js';
import { random } from '../utility/random/random.js';

// Colors
let colors = getColors();
let metallicColorMap = new Map();
let drawFlowerRngSeedStr;

function rescopeMetallicColorMap(svg) {
    // Clear map from previous svgs
    metallicColorMap = new Map();

    // Function to make gradient elements that can be used in svg
    function createLinearGradient(svg, id, colors, direction = { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }) {
        // Ensure a <defs> exists
        let defs = svg.querySelector("defs");
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            svg.insertBefore(defs, svg.firstChild);
        }

        // Create the gradient element
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.id = id;
        grad.setAttribute("x1", direction.x1);
        grad.setAttribute("y1", direction.y1);
        grad.setAttribute("x2", direction.x2);
        grad.setAttribute("y2", direction.y2);

        // Create color stops evenly spaced
        const step = 100 / (colors.length - 1);
        colors.forEach((color, i) => {
            const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop.setAttribute("offset", `${i * step}%`);
            stop.setAttribute("stop-color", color);
            grad.appendChild(stop);
        });

        defs.appendChild(grad);
        return `url(#${id})`;
    }

    // Define colors
    // Bronze colors and gradient
    const bronze1 = "#c44e20ff";
    const bronze2 = "#644324ff";
    const bronze3 = "#fa9d63ff";
    metallicColorMap.set("bronze1", bronze1);
    metallicColorMap.set("bronze2", bronze2);
    metallicColorMap.set("bronze3", bronze3);
    metallicColorMap.set(
        "bronzeGradient",
        createLinearGradient(svg, "bronzeGradient", [bronze1, bronze2, bronze3])
    );

    // Silver colors and gradient
    const silver1 = "#abafb4ff";
    const silver2 = "#5b6268ff";
    const silver3 = "#a8bac2ff";
    metallicColorMap.set("silver1", silver1);
    metallicColorMap.set("silver2", silver2);
    metallicColorMap.set("silver3", silver3);
    metallicColorMap.set(
        "silverGradient",
        createLinearGradient(svg, "silverGradient", [silver1, silver2, silver3])
    );

    // Gold colors and gradient
    const gold1 = "#ecd15bff"; // base
    const gold2 = "#94771aff"; // lighter
    const gold3 = "#eed43fff"; // darker
    metallicColorMap.set("gold1", gold1);
    metallicColorMap.set("gold2", gold2);
    metallicColorMap.set("gold3", gold3);
    metallicColorMap.set(
        "goldGradient",
        createLinearGradient(svg, "goldGradient", [gold1, gold2, gold3])
    );

    // Opal colors
    const opal1 = "#7752E8";
    const opal2 = "#E36C35";
    const opal3 = "#1FC6C2";
    metallicColorMap.set("opal1", opal1);
    metallicColorMap.set("opal2", opal2);
    metallicColorMap.set("opal3", opal3);
    metallicColorMap.set(
        "opalGradient",
        createLinearGradient(svg, "opalGradient", [opal1, opal2, opal3])
    );

}

export function drawFlower(svg, baseX, baseY, flowerParameter, rngSeedString, rarity = "common") {
    colors = getColors();
    drawFlowerRngSeedStr = rngSeedString;

    const flowerGroup = document.createElementNS(svg.namespaceURI, "g");

    // Stem and leaf
    const stemGroup = drawFlowerStem(flowerGroup, baseX, baseY, flowerParameter);

    // Head
    const headGroup = drawFlowerHead(flowerGroup, flowerParameter, stemGroup.x, stemGroup.y, stemGroup.angle, rarity);

    flowerGroup.dataset.order = "flower";
    svg.appendChild(flowerGroup);
    return flowerGroup;
}

function drawFlowerStem(flowerGroup, baseX, baseY, flowerParameter) {
    const svgNS = flowerGroup.namespaceURI;

    // Height
    const minStemHeight = 50;
    const maxStemHeight = minStemHeight + random(drawFlowerRngSeedStr) * 60;
    const stemHeight = minStemHeight + flowerParameter * (maxStemHeight - minStemHeight);

    // Tip
    const maxTipSwayFactor = 7;
    const maxTipX = baseX + (random(drawFlowerRngSeedStr) * 2 * maxTipSwayFactor - maxTipSwayFactor);
    const tipX = baseX + flowerParameter * (maxTipX - baseX);
    const tipY = baseY - stemHeight;

    // Bend
    const maxStalkSwayFactor = 35;
    const maxCtrlX = baseX + (random(drawFlowerRngSeedStr) * 2 * maxStalkSwayFactor - maxStalkSwayFactor);
    const ctrlX = baseX + flowerParameter * (maxCtrlX - baseX);
    const ctrlY = baseY - stemHeight * 0.5;

    // --- Draw the stem ---
    const d = `M ${baseX} ${baseY} Q ${ctrlX} ${ctrlY}, ${tipX} ${tipY}`;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", colors.stem1);
    path.setAttribute("stroke-width", 1.2);
    path.setAttribute("stroke-linecap", "round");
    flowerGroup.appendChild(path);

    // --- Add one leaf ---
    const leafFraction = 0.6 + random(drawFlowerRngSeedStr) * .3; // 0.4–0.8

    // Quadratic Bézier formula for point at t:
    const leafX = Math.pow(1 - leafFraction, 2) * baseX + 2 * (1 - leafFraction) * leafFraction * ctrlX + Math.pow(leafFraction, 2) * tipX;
    const leafY = Math.pow(1 - leafFraction, 2) * baseY + 2 * (1 - leafFraction) * leafFraction * ctrlY + Math.pow(leafFraction, 2) * tipY;

    // Derivative at t gives slope for leaf orientation
    const dx = 2 * (1 - leafFraction) * (ctrlX - baseX) + 2 * leafFraction * (tipX - ctrlX);
    const dy = 2 * (1 - leafFraction) * (ctrlY - baseY) + 2 * leafFraction * (tipY - ctrlY);
    const leafAngle = Math.atan2(dy, dx);

    // Randomly left (-1) or right (+1)
    const leafSide = random(drawFlowerRngSeedStr) < 0.5 ? -1 : 1;
    const leafSize = 5 + random(drawFlowerRngSeedStr) * 4;

    let flowerLeafColors = {};
    flowerLeafColors.leaf1 = colors.stem2;
    flowerLeafColors.leaf2 = colors.stem3;
    const leafGroup = drawLeaf(flowerGroup, leafX, leafY, leafSize, dx, dy, leafSide, flowerLeafColors);
    const leafShift = leafSide * leafSize;
    const existingTransform = leafGroup.getAttribute("transform") || "";
    leafGroup.setAttribute("transform", `translate(${leafShift}, 0) ` + existingTransform);

    flowerGroup.appendChild(leafGroup);

    // --- Compute stem tip angle for flower head ---
    const tipDx = tipX - ctrlX;
    const tipDy = tipY - ctrlY;
    const tipAngle = Math.atan2(tipDy, tipDx) * 180 / Math.PI + 90;

    // Return tip position and angle
    return { x: tipX, y: tipY, angle: tipAngle };
}

export function drawFlowerHead(flowerGroup, flowerParameter, cx, cy, rotation = 0, rarity = "common", flowerName = "random") {
    const flowers = [
        { name: "poppy", weight: 25 },
        { name: "daffodil", weight: 20 },
        { name: "coneflower", weight: 15 },
        { name: "lily", weight: 13 },
        { name: "daisy", weight: 10 },
        { name: "tulip", weight: 8 },
        { name: "rose", weight: 6 },
        { name: "iris", weight: 2 },
        { name: "orchid", weight: 1 }
    ];

    if (flowerName === "random") {
        const totalWeight = flowers.reduce((sum, f) => sum + f.weight, 0);
        function chooseFlower() {
            const rand = random(drawFlowerRngSeedStr) * totalWeight;
            let cumulative = 0;
            for (const flower of flowers) {
                cumulative += flower.weight;
                if (rand <= cumulative) {
                    return flower.name;
                }
            }
        }
        flowerName = chooseFlower();
    }

    const headGroup = document.createElementNS(flowerGroup.namespaceURI, "g");

    switch (flowerName) {
        case "poppy":
            drawPoppy(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "daffodil":
            drawDaffodil(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "coneflower":
            drawConeflower(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "lily":
            drawLily(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "daisy":
            drawDaisy(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "tulip":
            drawTulip(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "rose":
            drawRose(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "iris":
            drawIris(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        case "orchid":
            drawOrchid(headGroup, flowerParameter, cx, cy, rotation, rarity);
            break;

        default:
            drawPoppy(headGroup, cx, cy, rotation, baseHeadSize, rarity);
            break;
    }

    // Move everything into the flower group
    flowerGroup.appendChild(headGroup);
}

async function drawPoppy(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#ec5800";
    const common2 = "#ff701dff";
    const uncommon1 = "#b62815ff";
    const uncommon2 = "rgba(224, 71, 51, 1)";
    const rare1 = "#8635e3ff";
    const rare2 = "#9247e9ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let strokeColor = "#000"

    switch (rarity) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = bronzeGradient;
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = silverGradient;
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = goldGradient;
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = opalGradient;
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            break;
    }

    const response = await fetch(".\\svg\\poppy.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Define which groups you want to extract
    const prename = "poppy-u-";
    const petal1Group = ["petal-4"];
    const petal2Group = ["petal-3", "petal-2"];
    const petal3Group = ["petal-1"];
    const centerGroup = ["dots", "center", "center-2"];

    petal1Group.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill1);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    petal2Group.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill2);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    petal3Group.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill1);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    centerGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", "#000");
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    // After appending all the cloned paths:
    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.1})
            translate(${-bbox.x - bbox.width / 2}, ${-bbox.y - bbox.height / 2})
        `
    );
}

async function drawRose(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const commonFill = "#dd2e71ff";
    const uncommonFill = "#f1b9f3ff";
    const rareFill = "#8635e3ff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fillColor = commonFill;
    switch (rarity) {
        case "bronze":
            fillColor = bronzeGradient;
            break;
        case "silver":
            fillColor = silverGradient;
            break;
        case "gold":
            fillColor = goldGradient;
            break;
        case "opal":
            fillColor = opalGradient;
            break;
        case "common":
            fillColor = commonFill;
            break;
        case "uncommon":
            fillColor = uncommonFill;
            break;
        case "rare":
            fillColor = rareFill;
            break;
    }
    const strokeColor = "#000";

    const response = await fetch(".\\svg\\rose.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    svgDoc.querySelectorAll("[id]").forEach(el => {
        // Remove BOM and control characters
        el.id = el.id.replace(/[\u0000-\u001F\uFEFF]/g, "");
    });


    const prename = "rose-u-";
    let petalGroup = [];
    for (let i = 4; i >= 1; i--) petalGroup.push(`petal-${i}`);

    let centerGroup = [];
    for (let i = 3; i >= 1; i--) centerGroup.push(`center-${i}`);

    centerGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id^='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id^='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fillColor);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("shape-rendering", "geometricPrecision");
        clone.setAttribute("stroke-width", .7);
        headGroup.appendChild(clone);
    });

    petalGroup.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id^='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fillColor);
        clone.setAttribute("stroke", strokeColor);
        if (groupName.includes("-1") || groupName.includes("-3")) {
            clone.setAttribute("shape-rendering", "crispEdges");
        } else {
            clone.setAttribute("shape-rendering", "geometricPrecision");
        }
        clone.setAttribute("stroke-width", .7);
        headGroup.appendChild(clone);
    });

    // After appending all the cloned paths:
    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.3})
            translate(${-bbox.x - bbox.width / 2}, ${-bbox.height})
        `
    );
}

async function drawDaisy(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const commonFill = "#f3f1e9ff";
    const commonCenterFill = "#f5d142";
    const uncommonFill = "#f5d142";
    const uncommonCenterFill = "#4e3a26ff";
    const rareFill = "#ad73f0ff";
    const rareCenterFill = "#502f75ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fillColor = commonFill;
    let centerFillColor = commonCenterFill;

    switch (rarity) {
        case "bronze":
            fillColor = bronzeGradient;
            centerFillColor = metallicColorMap.get("bronze2");
            break;
        case "silver":
            fillColor = silverGradient;
            centerFillColor = metallicColorMap.get("silver2");
            break;
        case "gold":
            fillColor = goldGradient;
            centerFillColor = metallicColorMap.get("gold2");
            break;
        case "opal":
            fillColor = opalGradient;
            centerFillColor = metallicColorMap.get("opal2");
            break;
        case "common":
            fillColor = commonFill;
            centerFillColor = commonCenterFill;
            break;
        case "uncommon":
            fillColor = uncommonFill;
            centerFillColor = uncommonCenterFill;
            break;
        case "rare":
            fillColor = rareFill;
            centerFillColor = rareCenterFill;
            break;
    }

    const strokeColor = "#000";

    const response = await fetch(".\\svg\\daisy.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Define which groups you want to extract
    const prename = "daisy-u-";
    let petalGroup = [];
    for (let i = 1; i <= 25; i++) {
        petalGroup.push(`petal-${i}`);
    }
    const centerGroup = ["center"];

    petalGroup.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        if (rarity === "bronze" || rarity === "silver" || rarity === "gold" || rarity === "opal") {
            clone.setAttribute("fill", fillColor);
        } else {
            clone.setAttribute("fill", randomizeColor(fillColor, 15));
        }
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    centerGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", centerFillColor);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    // After appending all the cloned paths:
    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.17})
            translate(${-bbox.x - bbox.width / 2}, ${-bbox.y - bbox.height / 2})
        `
    );
}

async function drawIris(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#5e3792ff";
    const common2 = "#9767d6ff";
    const common3 = "#6c2bc0ff";
    const uncommon1 = "#750404ff";
    const uncommon2 = "#e96969ff";
    const uncommon3 = "#885f5fff";
    const rare1 = "#080668ff";
    const rare2 = "#7f90f1ff";
    const rare3 = "#5154faff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let fill3 = common3;
    switch (rarity) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = bronzeGradient;
            fill3 = bronzeGradient;
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = silverGradient;
            fill3 = silverGradient;
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = goldGradient;
            fill3 = goldGradient;
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = opalGradient;
            fill3 = opalGradient;
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            fill3 = common3;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            fill3 = uncommon3;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            fill3 = rare3;
            break;
    }
    const strokeColor = "#000";

    const response = await fetch(".\\svg\\iris.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Define which groups you want to extract
    const prename = "iris-u-";
    const group1 = ["up"];
    const group2 = ["center-up", "center-down"];
    const group3 = ["down"];
    const group4 = ["tongue"];

    const order = ["down", "center-up", "up", "center-down", "tongue"];

    order.forEach((pathName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${pathName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);

        let color;
        if (group1.includes(pathName)) {
            color = fill1;
        } else if (group2.includes(pathName)) {
            color = fill2;
        } else if (group3.includes(pathName)) {
            color = fill3;
        } else {
            color = "#faf893ff";
        }

        clone.setAttribute("fill", color);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    const bbox = headGroup.getBBox();
    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.17})
            translate(${-bbox.x - bbox.width / 2}, ${-bbox.y - bbox.height / 2})
        `
    );
}

async function drawLily(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#ffffff";
    const common2 = "#ecba78ff";
    const uncommon1 = "#f7b6f1ff";
    const uncommon2 = "#ec9191ff";
    const rare1 = "#fa5523ff";
    const rare2 = "#f3c067ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    switch (rarity) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = metallicColorMap.get("bronze3");
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = metallicColorMap.get("silver1");
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = metallicColorMap.get("gold2");
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = metallicColorMap.get("opal2");
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            break;
    }
    const strokeColor = "#000";

    const response = await fetch(".\\svg\\lily.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Define which groups you want to extract
    const prename = "lily-u-";
    const petalGroup = ["petal-6", "petal-5", "petal-4", "petal-3", "petal-2", "petal-1"];
    const centerGroup = [
        "center",
        "stamen-1", "stamen-2", "stamen-3", "stamen-4", "stamen-5", "stamen-6", "stamen-7",
        "pistal-1", "pistal-2", "pistal-3", "pistal-4", "pistal-5", "pistal-6", "pistal-7"
    ]

    petalGroup.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill1);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    centerGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", "#000");
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    // After appending all the cloned paths:
    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.1})
            translate(${-bbox.x - bbox.width / 2}, ${-bbox.y - bbox.height / 2})
        `
    );
}

async function drawTulip(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#f7b3f3ff";
    const common2 = "#ecba78ff";
    const uncommon1 = "#e72222ff";
    const uncommon2 = "#c78484ff";
    const rare1 = "#7e47a3ff";
    const rare2 = "#c994faff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let strokeColor = "#000"

    switch (rarity) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = metallicColorMap.get("bronze1");
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = metallicColorMap.get("silver1");
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = metallicColorMap.get("gold3");
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = metallicColorMap.get("opal3");
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            break;
    }

    const response = await fetch(".\\svg\\tulip.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Define which groups you want to extract
    const prename = "tulip-u-";
    const petal1Group = ["left-2", "right-2", "center"];
    const petal2Group = ["left-3", "right-3"];

    petal2Group.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill2);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    petal1Group.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill1);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    // After appending all the cloned paths:
    const bbox = headGroup.getBBox();

    // Calculate bottom offset so bottom sits at cy
    const bottomY = bbox.y + bbox.height;

    // Apply transform so that:
    //  - you shift upward by bottomY before scaling
    //  - scale
    //  - rotate
    //  - then place at cx, cy
    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.1})
            translate(${-bbox.x - bbox.width / 2}, ${-bottomY})
        `
    );
}

async function drawOrchid(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#bfe5ffff";
    const common2 = "#4136d4ff";
    const common3 = "#999ffaff";
    const uncommon1 = "#578339ff";
    const uncommon2 = "#e975f8ff";
    const uncommon3 = "#e8aef3ff";
    const rare1 = "#e298ffff";
    const rare2 = "#6b14bdff"
    const rare3 = "#a15dd8ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let fill3 = common3;
    let fill4 = "#e0df9dff"
    let strokeColor = "#000"
    switch (rarity) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = bronzeGradient;
            fill3 = bronzeGradient;
            fill4 = bronzeGradient;
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = silverGradient;
            fill3 = silverGradient;
            fill4 = silverGradient;
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = goldGradient;
            fill3 = goldGradient;
            fill4 = goldGradient;
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = opalGradient;
            fill3 = opalGradient;
            fill4 = opalGradient;
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            fill3 = common3;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            fill3 = uncommon3;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            fill3 = rare3;
            break;
    }

    const response = await fetch(".\\svg\\orchid.svg");
    const svgText = await response.text();

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    const prename = "orchid-u-";
    let petalGroup = [];
    for (let i = 1; i <= 3; i++) petalGroup.push(`petal-${i}`);

    let tongueGroup = ["tongue-2", "tongue-1"];

    let veinGroup = [];
    for (let i = 1; i <= 6; i++) veinGroup.push(`vein-${i}`);

    petalGroup.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        if (groupName.includes("-1")) {
            clone.setAttribute("fill", fill1);
        } else if (groupName.includes("-2")) {
            clone.setAttribute("fill", fill2);
        } else {
            clone.setAttribute("fill", fill3);
        }
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    tongueGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill4);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    veinGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", "none");
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.1})
            translate(${-bbox.x - bbox.width / 2}, ${- bbox.height * (2/3)})
        `
    );
}

async function drawConeflower(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#f7f2e6ff";
    const common2 = "#746245ff";
    const uncommon1 = "#e28a57ff";
    const uncommon2 = "#a76344ff";
    const rare1 = "#cb85d4ff";
    const rare2 = "#a13f91ff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let strokeColor = "#000"
    let fill3 = "#a3a3a3";

    switch (rarity) {
        case "bronze":
            fill1 = metallicColorMap.get("bronze2");
            fill2 = bronzeGradient;
            break;
        case "silver":
            fill1 = metallicColorMap.get("silver1");
            fill2 = silverGradient;
            break;
        case "gold":
            fill1 = metallicColorMap.get("gold1");
            fill2 = goldGradient;
            break;
        case "opal":
            fill1 = metallicColorMap.get("opal1");
            fill2 = opalGradient;
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            break;
    }

    const response = await fetch(".\\svg\\coneflower.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Define which groups you want to extract
    const prename = "coneflower-u-";
    let petalGroup = [];
    for (let i = 12; i >= 1; i--) petalGroup.push(`petal-${i}`);

    let coneGroup = ["cone"];
    let seedsGroup = ["seeds"];

    petalGroup.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", randomizeColor(fill1, 15));
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    coneGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill2);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    seedsGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill3);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", .2);
        headGroup.appendChild(clone);
    });

    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.2})
            translate(${-bbox.x - bbox.width / 2}, ${- bbox.height / 3})
        `
    );
}

async function drawDaffodil(headGroup, flowerParameter, cx, cy, rotation, rarity) {
    rescopeMetallicColorMap(headGroup);
    const common1 = "#f9e65c";
    const common2 = "#f7ad67ff";
    const common3 = "#fff6eeff";
    const uncommon1 = "#fab651ff";
    const uncommon2 = "#f3d09cff";
    const uncommon3 = "#f8f1c7ff";
    const rare1 = "#ee8ae1ff";
    const rare2 = "#fac7f3ff";
    const rare3 = "#ddc9daff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let fill3 = common3;
    let strokeColor = "#000";

    switch (rarity) {
        case "bronze":
            fill1 = metallicColorMap.get("bronze2");
            fill2 = metallicColorMap.get("bronze1");
            fill3 = bronzeGradient;
            break;
        case "silver":
            fill1 = metallicColorMap.get("silver2");
            fill2 = metallicColorMap.get("silver1");
            fill3 = silverGradient;
            break;
        case "gold":
            fill1 = metallicColorMap.get("gold2");
            fill2 = metallicColorMap.get("gold1");
            fill3 = goldGradient;
            break;
        case "opal":
            fill1 = metallicColorMap.get("opal2");
            fill2 = metallicColorMap.get("opal3");
            fill3 = opalGradient;
            break;
        case "common":
            fill1 = common1;
            fill2 = common2;
            fill3 = common3;
            break;
        case "uncommon":
            fill1 = uncommon1;
            fill2 = uncommon2;
            fill3 = uncommon3;
            break;
        case "rare":
            fill1 = rare1;
            fill2 = rare2;
            fill3 = rare3;
            break;
    }


    const response = await fetch(".\\svg\\daffodil.svg");
    const svgText = await response.text();

    // Parse the SVG string into an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    svgDoc.querySelectorAll("[id]").forEach(el => {
        // Remove BOM and control characters
        el.id = el.id.replace(/[\u0000-\u001F\uFEFF]/g, "");
    });


    const prename = "daffodil-u-";
    let petalGroup = [];
    for (let i = 6; i >= 1; i--) petalGroup.push(`petal-${i}`);

    const trumpetGroup = ["trumpet", "inner-trumpet"];

    let stamenGroup = [];
    for (let i = 1; i <= 4; i++) stamenGroup.push(`stamen-${i}`);

    petalGroup.forEach((groupName) => {
        const path = svgDoc.querySelector(`path[id='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", fill3);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 2);
        headGroup.appendChild(clone);
    });

    trumpetGroup.forEach((groupName) => {
        let path = svgDoc.querySelector(`path[id^='${prename}${groupName}']`);
        if (!path) path = svgDoc.querySelector(`ellipse[id^='${prename}${groupName}']`);
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        if (groupName.includes("inner")) {
            clone.setAttribute("fill", fill2);
        } else {
            clone.setAttribute("fill", fill1);
        }
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    stamenGroup.forEach((groupName) => {
        let path = [...svgDoc.querySelectorAll("path, ellipse")]
            .find(el => el.id.includes(prename + groupName));
        if (!path) return; // skip if missing
        const clone = path.cloneNode(true);
        clone.setAttribute("fill", strokeColor);
        clone.setAttribute("stroke", strokeColor);
        clone.setAttribute("stroke-width", 1);
        headGroup.appendChild(clone);
    });

    let path = [...svgDoc.querySelectorAll("path, ellipse")];
    for (let el of path) {
        console.log(el.id);
    }

    // After appending all the cloned paths:
    const bbox = headGroup.getBBox();

    headGroup.setAttribute(
        "transform",
        `
            translate(${cx}, ${cy})
            rotate(${rotation})
            scale(${0.17})
            translate(${-bbox.x - bbox.width / 2}, ${-bbox.y - bbox.height / 2})
        `
    );
}

/**
 * Slightly randomizes a hex color by a given amount.
 * @param {string} hex - The original hex color (e.g., "#ffffff" or "#fff").
 * @param {number} variance - How much to vary each RGB component (0–255). Typical range: 0–50.
 * @returns {string} - A new hex color string.
 */
function randomizeColor(hex, variance = 20) {
    // Normalize 3-digit hex to 6-digit
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split("").map(ch => ch + ch).join("");
    }

    // Parse RGB components
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);

    // Helper to clamp values between 0 and 255
    const clamp = (value) => Math.max(0, Math.min(255, value));

    // Apply random variance to each color channel
    const randomizeChannel = (value) => {
        const offset = Math.floor(Math.random() * (2 * variance + 1)) - variance;
        return clamp(value + offset);
    };

    r = randomizeChannel(r);
    g = randomizeChannel(g);
    b = randomizeChannel(b);

    // Convert back to hex
    const toHex = (value) => value.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
