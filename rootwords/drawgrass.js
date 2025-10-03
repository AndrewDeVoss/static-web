import { getColors } from '../utility/color/color.js';

export function drawGrass(grassContainer) {
    grassContainer.innerHTML = ''; // Clear previous grass

    const svgNS = "http://www.w3.org/2000/svg";

    const containerWidth = grassContainer.clientWidth;
    const containerHeight = grassContainer.clientHeight;

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', containerWidth);
    svg.setAttribute('height', containerHeight);
    svg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('class', 'grass-layer foreground');

    // Blade settings
    const bladeCount = Math.floor(containerWidth)*1.75; // how many blades
    const baseY = containerHeight;

    for (let i = 0; i < bladeCount; i++) {
        const spacing = containerWidth / bladeCount;
        const baseX = i * spacing + (Math.random() * spacing * 0.5 - spacing * 0.25);

        // Random height between 15–25px
        const height = Math.random() * 15;

        // Tip of the blade, randomly curved to left or right
        const tipX = baseX + (Math.random() * 10 - 5); // -5 to +5 px offset
        const tipY = baseY - height;

        // Control point — midway, with extra curve
        const ctrlX = baseX + (Math.random() * 10 - 5); // random curve
        const ctrlY = baseY - height * 0.5;

        const d = `
            M ${baseX} ${baseY}
            Q ${ctrlX} ${ctrlY}, ${tipX} ${tipY}
        `.trim();

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', getColors().grass1);
        path.setAttribute('stroke-width', .8);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('opacity', 0.9);

        svg.appendChild(path);
    }

    grassContainer.appendChild(svg);
}
