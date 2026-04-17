export class Color {
    // -------------------------------------------------
    // LINEAR RGB STORAGE
    // -------------------------------------------------

    constructor(r, g, b) {
        this.r = Math.max(0, r);
        this.g = Math.max(0, g);
        this.b = Math.max(0, b);
    }

    // -------------------------------------------------
    // PHYSICAL LIGHT MATH (LINEAR RGB)
    // -------------------------------------------------

    add(other) {
        return new Color(
            this.r + other.r,
            this.g + other.g,
            this.b + other.b,
        );
    }

    subtract(other) {
        return new Color(
            Math.max(0, this.r - other.r),
            Math.max(0, this.g - other.g),
            Math.max(0, this.b - other.b),
        );
    }

    static generatePartitionColors(numColors, seed) {
        const rand = seed;
        const rgbSum = Color.generateRGBSum(rand);
        console.log("Target RGB:", rgbSum);

        let remaining = new Color(rgbSum.r, rgbSum.g, rgbSum.b);
        const result = [];

        for (let i = 0; i < numColors; i++) {
            const remainingSlots = numColors - i;

            // Last color gets everything left
            if (remainingSlots === 1) {
                result.push(remaining);
                break;
            }

            // Determine what percent of remaing r,g,b can be taken by this color. The more it takes of one, the more it leaves of the others
            const a = Math.random();
            const b = Math.random();
            const c = Math.random();
            const sum = a + b + c;
            const rp = a / sum;
            const gp = b / sum;
            const bp = c / sum;

            // Random portion
            const portion = new Color(
                remaining.r *rp, remaining.g * gp, remaining.b * bp
            );

            result.push(portion);
            remaining = remaining.subtract(portion);
        }

        console.log(result);
        return result;
    }

    static generateRGBSum(seed = Math.random) {
        function randRange(min, max) {
            return Math.floor(min + seed() * (max - min + 1));
        }

        // your 3 intensity bands
        const bands = [
            randRange(100, 255),
            randRange(150, 255),
            randRange(200, 255)
        ];

        // shuffle across R, G, B
        for (let i = bands.length - 1; i > 0; i--) {
            const j = Math.floor(seed() * (i + 1));
            [bands[i], bands[j]] = [bands[j], bands[i]];
        }

        return {
            r: bands[0],
            g: bands[1],
            b: bands[2]
        };
    }

    // -------------------------------------------------
    // HELPERS
    // -------------------------------------------------

    static #chromaScore(c) {
        const avg = (c.r + c.g + c.b) / 3;
        return (
            Math.abs(c.r - avg) +
            Math.abs(c.g - avg) +
            Math.abs(c.b - avg)
        );
    }
}