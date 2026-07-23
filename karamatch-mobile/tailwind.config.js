// Colours are CSS custom properties (see global.css) so `dark:`-variant
// classes track ThemeProvider's resolved scheme instead of the OS scheme —
// ThemeProvider toggles the `dark` class itself (see theme/ThemeProvider.tsx),
// it isn't driven by NativeWind's own "media" strategy.
//
// Spacing/radius are copied from theme/tokens.ts's `S`, `S2`, `R` rather than
// required from it: this file runs under plain Node (no Babel/Metro), and
// tokens.ts is ESM TypeScript, so a runtime `require()` across that boundary
// isn't reliable. Keep these two in sync by hand — the scale is small and
// rarely changes.
const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const S2 = { s6: 6, s10: 10, s12: 12, s14: 14, s20: 20, s28: 28 };
const R = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999 };

const px = value => `${value}px`;

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}", "./.rnstorybook/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                bg: "var(--color-bg)",
                surface: "var(--color-surface)",
                surface1: "var(--color-surface1)",
                surface2: "var(--color-surface2)",
                surface3: "var(--color-surface3)",
                surfacePress: "var(--color-surface-press)",

                border: "var(--color-border)",
                borderStrong: "var(--color-border-strong)",

                text: "var(--color-text)",
                textDim: "var(--color-text-dim)",
                textMuted: "var(--color-text-muted)",
                textFaint: "var(--color-text-faint)",
                onTint: "var(--color-on-tint)",

                tint: "var(--color-tint)",
                tintSoft: "var(--color-tint-soft)",
                tintPale: "var(--color-tint-pale)",
                tintBg: "var(--color-tint-bg)",
                tintBorder: "var(--color-tint-border)",
                tintGlow: "var(--color-tint-glow)",

                purple: "var(--color-purple)",
                violet: "var(--color-violet)",
                cyan: "var(--color-cyan)",
                cyanBg: "var(--color-cyan-bg)",
                cyanBorder: "var(--color-cyan-border)",
                green: "var(--color-green)",
                gold: "var(--color-gold)",

                danger: "var(--color-danger)",
                dangerBg: "var(--color-danger-bg)",
                dangerBorder: "var(--color-danger-border)",

                scrim: "var(--color-scrim)",
                skeleton: "var(--color-skeleton)"
            },
            spacing: Object.fromEntries(Object.entries({ ...S, ...S2 }).map(([key, value]) => [key, px(value)])),
            borderRadius: Object.fromEntries(Object.entries(R).map(([key, value]) => [key, value === 999 ? px(999) : px(value)]))
        }
    },
    plugins: []
};
