export class Color {
    // -------------------------------------------------
    // LINEAR RGB STORAGE
    // -------------------------------------------------

    constructor(r, g, b, a = 1.0) {
        this.r = Math.max(0, r);
        this.g = Math.max(0, g);
        this.b = Math.max(0, b);
        this.a = Math.min(Math.max(a, 0), 1);
    }

    // -------------------------------------------------
    // PHYSICAL LIGHT MATH (LINEAR RGB)
    // -------------------------------------------------

    add(other) {
        return new Color(
            this.r + other.r,
            this.g + other.g,
            this.b + other.b,
            this.a
        );
    }

    subtract(other) {
        return new Color(
            Math.max(0, this.r - other.r),
            Math.max(0, this.g - other.g),
            Math.max(0, this.b - other.b),
            this.a
        );
    }

    // -------------------------------------------------
    // SRGB <-> LINEAR
    // -------------------------------------------------

    static fromSRGB(r, g, b, a = 255) {
        return new Color(
            Color.#srgbToLinear(r / 255),
            Color.#srgbToLinear(g / 255),
            Color.#srgbToLinear(b / 255),
            a / 255
        );
    }

    toSRGB() {
        return {
            r: Math.round(Color.#linearToSrgb(this.r) * 255),
            g: Math.round(Color.#linearToSrgb(this.g) * 255),
            b: Math.round(Color.#linearToSrgb(this.b) * 255),
            a: Math.round(this.a * 255)
        };
    }

    static #srgbToLinear(c) {
        return c <= 0.04045
            ? c / 12.92
            : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    static #linearToSrgb(c) {
        return c <= 0.0031308
            ? 12.92 * c
            : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }

    // -------------------------------------------------
    // OKLAB (PERCEPTUAL SPACE)
    // -------------------------------------------------

    static fromOKLab(L, a, b, alpha = 1.0) {
        const rgb = Color.#oklabToLinearRGB(L, a, b);
        return new Color(rgb.r, rgb.g, rgb.b, alpha);
    }

    static #oklabToLinearRGB(L, a, b) {
        let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        let s_ = L - 0.0894841775 * a - 1.2914855480 * b;

        l_ = l_ * l_ * l_;
        m_ = m_ * m_ * m_;
        s_ = s_ * s_ * s_;

        return {
            r: +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
            g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
            b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
        };
    }

    static #linearRGBToOKLab(r, g, b) {
        let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
        let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
        let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

        l = Math.cbrt(l);
        m = Math.cbrt(m);
        s = Math.cbrt(s);

        return {
            L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
        };
    }

    static oklabDistance(c1, c2) {
        const A = Color.#linearRGBToOKLab(c1.r, c1.g, c1.b);
        const B = Color.#linearRGBToOKLab(c2.r, c2.g, c2.b);

        const dL = A.L - B.L;
        const da = A.a - B.a;
        const db = A.b - B.b;

        return Math.sqrt(dL * dL + da * da + db * db);
    }

    // -------------------------------------------------
    // CORE IDEA: LIGHT PARTITION COLOR GENERATOR
    // -------------------------------------------------

    /**
     * Generates distinct colors whose sum = target light (approx)
     *
     * This treats color generation as:
     *  - start with total light
     *  - repeatedly carve out perceptually distinct "light chunks"
     */
    static generatePartitionColors({
        numColors,
        seed,
        hueWedge = Math.PI / 3,
        minChroma = 0.15,
        maxChroma = 0.35,
        minL = 0.35,
        maxL = 0.75,
        distinctThreshold = 0.10
    }) {
        const rand = seed;
        const targetSRGB = Color.generateTargetSRGB(rand);

        // convert target to linear RGB "light pool"
        let remaining = Color.fromSRGB(
            targetSRGB.r,
            targetSRGB.g,
            targetSRGB.b
        );

        const result = [];

        function randomOKLabCandidate() {
            const base = rand() * Math.PI * 2;
            const angle = base + (rand() * 2 - 1) * hueWedge;

            const chroma = minChroma + rand() * (maxChroma - minChroma);
            const L = minL + rand() * (maxL - minL);

            const a = Math.cos(angle) * chroma;
            const b = Math.sin(angle) * chroma;

            return Color.fromOKLab(L, a, b);
        }

        function isDistinct(c) {
            for (const r of result) {
                if (Color.oklabDistance(c, r) < distinctThreshold) {
                    return false;
                }
            }
            return true;
        }

        function clampColor(c) {
            return new Color(
                Math.max(0, Math.min(c.r, remaining.r)),
                Math.max(0, Math.min(c.g, remaining.g)),
                Math.max(0, Math.min(c.b, remaining.b)),
                c.a
            );
        }

        for (let i = 0; i < numColors; i++) {
            let best = null;
            let bestScore = -Infinity;

            const attempts = 10;

            for (let k = 0; k < attempts; k++) {
                const candidate = randomOKLabCandidate();

                if (!isDistinct(candidate)) continue;

                // normalize direction
                const sum = candidate.r + candidate.g + candidate.b;
                if (sum <= 0) continue;

                const dir = new Color(
                    candidate.r / sum,
                    candidate.g / sum,
                    candidate.b / sum
                );

                // how much light to carve
                const t = 0.15 + rand() * 0.55;

                const extracted = clampColor(new Color(
                    remaining.r * dir.r * t,
                    remaining.g * dir.g * t,
                    remaining.b * dir.b * t
                ));

                const score =
                    Color.oklabDistance(extracted, remaining) +
                    (Color.#chromaScore(extracted) * 0.5);

                if (score > bestScore) {
                    bestScore = score;
                    best = extracted;
                }
            }

            if (!best) {
                // fallback: take remaining evenly
                best = new Color(
                    remaining.r / (numColors - i),
                    remaining.g / (numColors - i),
                    remaining.b / (numColors - i)
                );
            }

            result.push(best);
            remaining = remaining.subtract(best);
        }

        return result;
    }

    static generateTargetSRGB(seed = Math.random) {
        function randRange(min, max) {
            return Math.floor(min + seed() * (max - min + 1));
        }

        // your 3 intensity bands
        const bands = [
            randRange(50, 80),     // dark channel
            randRange(120, 200),   // mid channel
            randRange(220, 255)    // bright channel
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