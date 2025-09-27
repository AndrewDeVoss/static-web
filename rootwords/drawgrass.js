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

    const svgBackground = document.createElementNS(svgNS, 'svg');
    svgBackground.setAttribute('width', containerWidth);
    svgBackground.setAttribute('height', containerHeight);
    svgBackground.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
    svgBackground.setAttribute('xmlns', svgNS);
    svgBackground.setAttribute('class', 'grass-layer background');

    // Blade settings
    const bladeCount = Math.floor(containerWidth / 8); // how many blades
    const baseWidth = 6; // bottom width of the blade
    const bladeHeight = containerHeight*.9;

    for (let i = 0; i < bladeCount; i++) {
        const baseX = i * (containerWidth / bladeCount);
        const baseY = containerHeight;

        const peakX = baseX + baseWidth / 2;
        const peakY = baseY - bladeHeight;

        const leftX = baseX;
        const rightX = baseX + baseWidth;

        const ctrlLeftX = baseX - baseWidth * 0.2;
        const ctrlLeftY = baseY - bladeHeight * 0.5;

        const ctrlRightX = baseX + baseWidth * 1.2;
        const ctrlRightY = baseY - bladeHeight * 0.5;

        const d = `
            M ${leftX} ${baseY}
            C ${ctrlLeftX} ${ctrlLeftY}, ${ctrlLeftX} ${ctrlLeftY}, ${peakX} ${peakY}
            C ${ctrlRightX} ${ctrlRightY}, ${ctrlRightX} ${ctrlRightY}, ${rightX} ${baseY}
            Z
        `.trim();

        // Main blade
        const pathMain = document.createElementNS(svgNS, 'path');
        pathMain.setAttribute('d', d);
        pathMain.setAttribute('fill', 'green');
        pathMain.setAttribute('stroke', 'none');

        // Slightly offset shadow layer (behind)
        // const pathShadow = document.createElementNS(svgNS, 'path');
        // pathShadow.setAttribute('d', d);
        // pathShadow.setAttribute('fill', '#2a5d2e'); // darker green
        // pathShadow.setAttribute('transform', `translate(${baseWidth * -0.2}, -1.5)`); // left + up
        // pathShadow.setAttribute('opacity', 0.9);
        // svg.insertBefore(pathShadow, pathMain); // behind main blade

        // Highlight layer (in front)
        const pathHighlight = document.createElementNS(svgNS, 'path');
        pathHighlight.setAttribute('d', d);
        pathHighlight.setAttribute('fill', '#8fe36d'); // lighter green
        pathHighlight.setAttribute('transform', `translate(${baseWidth * 0.45}, -2)`); // right + 
        pathHighlight.setAttribute('opacity', 0.9);
        
        svgBackground.appendChild(pathHighlight);
        svg.appendChild(pathMain);
    }

    grassContainer.appendChild(svgBackground);
    grassContainer.appendChild(svg);
}
