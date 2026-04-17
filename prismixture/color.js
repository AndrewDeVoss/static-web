export class Color {
    // Stored in linear RGB
    constructor(r, g, b, a = 1.0) {
        this.r = Math.max(0, r);
        this.g = Math.max(0, g);
        this.b = Math.max(0, b);
        this.a = Math.min(Math.max(a, 0), 1);
    }

    // -------------------------------------------------
    // BASIC LIGHT MATH (KEEP THIS AS YOUR SIM CORE)
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

    multiply(s) {
        return new Color(this.r * s, this.g * s, this.b * s, this.a);
    }

    luminance() {
        return 0.2126 * this.r + 0.7152 * this.g + 0.0722 * this.b;
    }

    compareTo(other) {
        return this.luminance() - other.luminance();
    }

    // -------------------------------------------------
    // SRGB <-> LINEAR (DISPLAY CONVERSION)
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
    // OKLAB (PERCEPTUAL SPACE FOR PALETTE GENERATION)
    // -------------------------------------------------

    static fromOKLab(L, a, b, alpha = 1.0) {
        const rgb = Color.#oklabToLinearRGB(L, a, b);
        return new Color(rgb.r, rgb.g, rgb.b, alpha);
    }

    static #oklabToLinearRGB(L, a, b) {
        // OKLab -> LMS
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

    // perceptual distance
    static oklabDistance(c1, c2) {
        const A = Color.#linearRGBToOKLab(c1.r, c1.g, c1.b);
        const B = Color.#linearRGBToOKLab(c2.r, c2.g, c2.b);

        const dL = A.L - B.L;
        const da = A.a - B.a;
        const db = A.b - B.b;

        return Math.sqrt(dL * dL + da * da + db * db);
    }

    // -------------------------------------------------
    // PALETTE GENERATION (YOUR KEY FEATURE)
    // -------------------------------------------------

    static generateDistinctLightColors(n, {
        candidates = 12,
        alpha = 0.25,
        seed = Math.random
    } = {}) {
        const result = [];

        for (let i = 0; i < n; i++) {
            let best = null;
            let bestScore = -Infinity;

            for (let c = 0; c < candidates; c++) {
                const candidate = Color.#randomLightOKLab(seed, alpha);

                let minDist = Infinity;

                for (const used of result) {
                    const d = Color.oklabDistance(candidate, used);
                    if (d < minDist) minDist = d;
                }

                if (result.length === 0) minDist = 1;

                if (minDist > bestScore) {
                    bestScore = minDist;
                    best = candidate;
                }
            }

            result.push(best);
        }

        return result;
    }

    static generateBalancedDistinctColors(n, {
        candidates = 20,
        alpha = 0.25,
        seed = Math.random,
        targetBrightness = 0.6 // controls how “white” full overlap becomes
    } = {}) {

        const result = [];

        // ----------------------------
        // 1. greedy farthest sampling in OKLab
        // ----------------------------
        for (let i = 0; i < n; i++) {
            let best = null;
            let bestScore = -Infinity;

            for (let c = 0; c < candidates; c++) {

                const candidate = Color.#randomDarkVividOKLab(seed, alpha);

                let minDist = Infinity;

                for (const used of result) {
                    const d = Color.oklabDistance(candidate, used);
                    if (d < minDist) minDist = d;
                }

                if (result.length === 0) minDist = 1;

                if (minDist > bestScore) {
                    bestScore = minDist;
                    best = candidate;
                }
            }

            result.push(best);
        }

        // ----------------------------
        // 2. normalize total energy toward white
        // ----------------------------
        let sumR = 0, sumG = 0, sumB = 0;

        const linear = result.map(c => {
            sumR += c.r;
            sumG += c.g;
            sumB += c.b;
            return c;
        });

        const avgR = sumR / n;
        const avgG = sumG / n;
        const avgB = sumB / n;

        // target white-ish balance
        const target = targetBrightness;

        const scaleR = target / (avgR || 1);
        const scaleG = target / (avgG || 1);
        const scaleB = target / (avgB || 1);

        return linear.map(c =>
            new Color(
                c.r * scaleR,
                c.g * scaleG,
                c.b * scaleB,
                alpha
            )
        );
    }

    static #randomDarkVividOKLab(seed, alpha) {

        // darker base so overlaps don’t immediately wash out
        const L = 0.35 + seed() * 0.25;   // 0.35–0.60 (important change)

        // higher chroma for saturation
        const a = (seed() * 2 - 1) * 0.35;
        const b = (seed() * 2 - 1) * 0.35;

        return Color.fromOKLab(L, a, b, alpha);
    }

    static #randomLightOKLab(seed, alpha) {
        // Light biased OKLab sampling
        const L = 0.75 + seed() * 0.2;     // bright range
        const a = (seed() * 2 - 1) * 0.25; // small chroma spread
        const b = (seed() * 2 - 1) * 0.25;

        return Color.fromOKLab(L, a, b, alpha);
    }
}