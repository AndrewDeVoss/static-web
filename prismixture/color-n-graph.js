import { Color } from "./color.js";

export class ColorNGraph {
    graph = null;

    static CONNECTABILITY_CODE = {
        NO: -1,
        YES_SAME: 0,
        YES_DIFFERENT: 1
    }

    constructor(startingGrid) {
        this.graph = [];
        for (let x = 0; x < startingGrid.length; x++) {
            this.graph[x] = [];
            for (let y = 0; y < startingGrid[0].length; y++) {
                // each cell is an array of ColorNodes, starting with the initial colors from the prismixture
                this.graph[x][y] = [new ColorNode(startingGrid[x][y], x, y)];
            }
        }
    }

    getGraph() {
        return this.graph;
    }

    canConnect(colorNode1, colorNode2) {
        // Do not allow connections if either is not an endpoint
        if (!colorNode1.isEndpoint() || !colorNode2.isEndpoint()) {
            console.log("One or both colors are not endpoints");
            return ColorNGraph.CONNECTABILITY_CODE.NO;
        }

        // Do not allow connection if not adjacent orthogonally
        const dx = Math.abs(colorNode1.getX() - colorNode2.getX());
        const dy = Math.abs(colorNode1.getY() - colorNode2.getY());
        if (dx>1 || dy>1 || (dx === 1 && dy === 1)) {
            console.log("Colors are not adjacent");
            return ColorNGraph.CONNECTABILITY_CODE.NO;
        }

        // Check color compatibility
        const color1 = colorNode1.getColor();
        const color2 = colorNode2.getColor();
        if (color1.isMatch(color2)) {
            return ColorNGraph.CONNECTABILITY_CODE.YES_SAME;
        } else if (color1.isRGBSubset(color2) || color2.isRGBSubset(color1)) {
            return ColorNGraph.CONNECTABILITY_CODE.YES_DIFFERENT;
        } else {
            console.log("Colors cannot be subtracted");
            return ColorNGraph.CONNECTABILITY_CODE.NO;
        }
    }

    connect(colorNode1, colorNode2) {
        const connectionCode = this.canConnect(colorNode1, colorNode2);

        // Check incompatibility
        if (connectionCode === ColorNGraph.CONNECTABILITY_CODE.NO) {
            console.log("Cannot connect", colorNode1.getColor(), "and", colorNode2.getColor());
            return false;
        }

        // Same color, just add connection
        if (connectionCode === ColorNGraph.CONNECTABILITY_CODE.YES_SAME) {
            colorNode1.connections.push(colorNode2);
            colorNode2.connections.push(colorNode1);
            return true;
        }

        // Different colors -> determine "source" and "sink"
        let source, sink;
        if (colorNode1.getColor().isRGBSubset(colorNode2.getColor())) {
            source = colorNode1;
            sink = colorNode2;
        } else {
            source = colorNode2;
            sink = colorNode1;
        }

        // Iterate through all nodes in line connected to sink, and split colornode, adding 2 back into the cell
        let unsplitColorNode = sink;
        let prevOfSource = source;
        let prevOfRemainder = null;

        while (true) {
            // Split current color node into Source and Remainder
            const unsplitColor = unsplitColorNode.getColor();
            const remainder = unsplitColor.subtract(source.getColor());
            const remainderColorNode = new ColorNode([remainder], unsplitColorNode.getX(), unsplitColorNode.getY());
            const sourceColorNode = new ColorNode([source.getColor()], unsplitColorNode.getX(), unsplitColorNode.getY());

            // Remove unsplit and add the two new nodes
            const cell = this.graph[unsplitColorNode.getX()][unsplitColorNode.getY()];
            cell.splice(cell.indexOf(unsplitColorNode), 1);
            cell.push(remainderColorNode);
            cell.push(sourceColorNode);

            // Connect remainder to remainderPrev if not null
            if (prevOfRemainder) {
                prevOfRemainder.getConnections().push(remainderColorNode);
                remainderColorNode.getConnections().push(prevOfRemainder);
                prevOfRemainder = remainderColorNode;
            }

            // Connect source to prev
            prevOfSource.getConnections().push(sourceColorNode);
            sourceColorNode.getConnections().push(prevOfSource);
            prevOfSource = sourceColorNode;

            // Check for finished
            if (unsplitColorNode.connections.length > 0) {
                // Unsplit node has an unsplit connection
                const next = unsplitColorNode.connections[0];

                // By removing the backward ref, we set up for next loop
                next.connections = next.connections.filter(c => c !== unsplitColorNode);
                unsplitColorNode = next;
            } else {
                // No more nodes in line
                break;
            }
        }
    }
}

export class ColorNode {
    static _idCounter = 0;

    constructor(colorList, x, y, connections = []) {

        this.id = ColorNode._idCounter++;

        let colorSum = new Color(0, 0, 0);
        for (let c of colorList) {
            colorSum = colorSum.add(c);
        }

        this.color = colorSum;
        this.x = x;
        this.y = y;
        this.connections = connections;
    }

    isEndpoint() { return this.connections.length <= 1; }
    getColor() { return this.color; }
    getX() { return this.x; }
    getY() { return this.y; }
    getConnections() { return this.connections; }
    getID() { return this.id; }
}