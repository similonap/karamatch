import type { CSSProperties } from "react";

// The design system. Every screen composes from these — no screen invents a
// spacing value, a radius or a font size of its own.
//
// The scales are the ones a React Native app would carry: a 4pt spacing grid,
// a fixed type ramp, and a small set of radii. Colours resolve through the CSS
// variables in index.css so the light theme is a variable swap, not a branch.

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export const C = {
    bg: "var(--km-bg)",
    surface: "var(--km-surface)",
    surface1: "var(--km-surface-1)",
    surface2: "var(--km-surface-2)",
    surface3: "var(--km-surface-3)",
    surfacePress: "var(--km-surface-press)",

    border: "var(--km-border)",
    borderStrong: "var(--km-border-strong)",

    text: "var(--km-text)",
    textDim: "var(--km-text-dim)",
    textMuted: "var(--km-text-muted)",
    textFaint: "var(--km-text-faint)",
    onTint: "var(--km-text-on-tint)",

    tint: "var(--km-tint)",
    tintSoft: "var(--km-tint-soft)",
    tintPale: "var(--km-tint-pale)",
    tintBg: "var(--km-tint-bg)",
    tintBorder: "var(--km-tint-border)",
    tintGlow: "var(--km-tint-glow)",

    purple: "var(--km-purple)",
    violet: "var(--km-violet)",
    cyan: "var(--km-cyan)",
    cyanBg: "var(--km-cyan-bg)",
    cyanBorder: "var(--km-cyan-border)",
    green: "var(--km-green)",
    gold: "var(--km-gold)",

    danger: "var(--km-danger)",
    dangerBg: "var(--km-danger-bg)",
    dangerBorder: "var(--km-danger-border)",

    scrim: "var(--km-scrim)"
} as const;

// The gradient is now a *scarce* resource: one primary action per screen, plus
// the brand mark. Everything else that used to be gradient is now flat tint.
export const GRAD = "linear-gradient(100deg,#FF3D8F,#B23DFF)";
export const GRAD_TILE = "linear-gradient(135deg,#FF3D8F,#8A2BE2)";

export const SHADOW = {
    e1: "var(--km-shadow-1)",
    e2: "var(--km-shadow-2)",
    e3: "var(--km-shadow-3)"
} as const;

// ---------------------------------------------------------------------------
// Space, radius, layout
// ---------------------------------------------------------------------------

// 4pt grid. `S.md` (16) is the screen gutter and the default gap between cards.
export const S = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
} as const;

// Half-steps, for the places where 4pt granularity genuinely reads better.
export const S2 = { s6: 6, s10: 10, s12: 12, s14: 14, s20: 20, s28: 28 } as const;

export const R = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 999
} as const;

export const LAYOUT = {
    /** Screen side gutter. One number, used by every screen. */
    gutter: 20,
    /** Standard navigation bar height, matching a native stack header. */
    appBar: 56,
    /** Tab bar content height, before the bottom safe-area inset. */
    tabBar: 58,
    /** Home-indicator / gesture-bar inset reserved at the bottom of the screen. */
    safeBottom: 22,
    /** Status-bar inset reserved at the top. */
    safeTop: 52,
    /** Smallest thing a thumb should have to hit. */
    touch: 44
} as const;

/** Bottom padding for a scroll view that sits behind the tab bar. */
export const TAB_SCROLL_PAD = LAYOUT.tabBar + LAYOUT.safeBottom + S.md;

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export const FONT = {
    display: "Unbounded, sans-serif",
    body: "Outfit, sans-serif"
} as const;

// A fixed ramp. `title` is a screen heading, `body` is 15 (native default is
// 15–17; 15 keeps dense list rows readable), `caption` is metadata.
export const T = {
    display: { fontFamily: FONT.display, fontSize: 32, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15 },
    title: { fontFamily: FONT.display, fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.25 },
    heading: { fontFamily: FONT.display, fontSize: 17, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.3 },
    /** Nav-bar title. */
    navTitle: { fontFamily: FONT.body, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 },
    bodyStrong: { fontFamily: FONT.body, fontSize: 15, fontWeight: 700, lineHeight: 1.4 },
    body: { fontFamily: FONT.body, fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    callout: { fontFamily: FONT.body, fontSize: 14, fontWeight: 400, lineHeight: 1.45 },
    caption: { fontFamily: FONT.body, fontSize: 13, fontWeight: 400, lineHeight: 1.4 },
    captionStrong: { fontFamily: FONT.body, fontSize: 13, fontWeight: 700, lineHeight: 1.4 },
    footnote: { fontFamily: FONT.body, fontSize: 11, fontWeight: 500, lineHeight: 1.35 },
    /** All-caps section header above a grouped list. */
    sectionHeader: {
        fontFamily: FONT.body,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.9,
        textTransform: "uppercase"
    }
} as const satisfies Record<string, CSSProperties>;

// ---------------------------------------------------------------------------
// Component recipes
// ---------------------------------------------------------------------------

export const card: CSSProperties = {
    background: C.surface1,
    border: "1px solid " + C.border,
    borderRadius: R.lg,
    boxShadow: SHADOW.e1
};

export const input: CSSProperties = {
    height: 52,
    borderRadius: R.md,
    border: "1px solid " + C.border,
    background: C.surface2,
    color: C.text,
    padding: "0 16px",
    fontSize: 16, // 16 or larger, or mobile Safari zooms the whole screen on focus.
    fontFamily: FONT.body,
    boxSizing: "border-box",
    width: "100%"
};

// Stable colour per person so an avatar keeps its colour across screens.
export const AVCOLORS = ["#FF3D8F", "#29E0FF", "#B23DFF", "#3DFF9A", "#FFC145", "#FF7A5C"];

export function avatarColor(key: string | number) {
    const s = String(key);
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return AVCOLORS[hash % AVCOLORS.length];
}

export function initial(name: string) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
}
