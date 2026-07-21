import type { CSSProperties } from "react";

// Design tokens lifted from the prototype (KaraMatch.dc.html), now resolved
// through the CSS variables in index.css so both themes share one set of names.
// The literal values live there; see :root / :root[data-theme="light"].
export const C = {
    pink: "var(--km-pink)",
    pinkSoft: "var(--km-pink-soft)",
    pinkPale: "var(--km-pink-pale)",
    purple: "var(--km-purple)",
    violet: "var(--km-violet)",
    cyan: "var(--km-cyan)",
    green: "var(--km-green)",
    gold: "var(--km-gold)",
    text: "var(--km-text)",
    textDim: "var(--km-text-dim)",
    textMuted: "var(--km-text-muted)",
    textFaint: "var(--km-text-faint)",
    bg: "var(--km-bg)",
    bgDeep: "var(--km-bg-deep)",
    panel: "var(--km-panel)"
};

// Translucent layers, named after the alpha they had in the prototype. Dark
// mode lifts a surface with white, light mode presses it down with near-black.
export const V = {
    v04: "var(--km-veil-04)",
    v05: "var(--km-veil-05)",
    v06: "var(--km-veil-06)",
    v07: "var(--km-veil-07)",
    v08: "var(--km-veil-08)",
    v09: "var(--km-veil-09)",
    v10: "var(--km-veil-10)",
    v12: "var(--km-veil-12)",
    v14: "var(--km-veil-14)",
    v15: "var(--km-veil-15)",
    v16: "var(--km-veil-16)",
    v18: "var(--km-veil-18)",
    v25: "var(--km-veil-25)",
    v35: "var(--km-veil-35)"
};

// The gradients stay vivid in both themes — they are the brand, and white text
// on them reads either way, so they are deliberately not themed.
export const GRAD = "linear-gradient(90deg,#FF3D8F,#B23DFF)";
export const GRAD_TILE = "linear-gradient(135deg,#FF3D8F,#8A2BE2)";
export const DIM_BG = V.v12;

export const AVCOLORS = ["#FF3D8F", "#29E0FF", "#B23DFF", "#3DFF9A", "#FFC145", "#FF7A5C"];

// Stable colour per person so an avatar keeps its colour across screens.
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

// The prototype's card / input / button recipes, reused across screens.
export const cardStyle: CSSProperties = {
    borderRadius: 20,
    border: "1px solid " + V.v10,
    background: V.v04
};

export const inputStyle: CSSProperties = {
    height: 54,
    borderRadius: 16,
    border: "1px solid " + V.v14,
    background: V.v06,
    color: C.text,
    padding: "0 18px",
    fontSize: 16,
    fontFamily: "Outfit, sans-serif",
    boxSizing: "border-box",
    width: "100%"
};

export const primaryButton = (enabled: boolean): CSSProperties => ({
    height: 56,
    border: "none",
    borderRadius: 18,
    background: enabled ? GRAD : DIM_BG,
    color: "#fff",
    fontSize: 17,
    fontWeight: 700,
    fontFamily: "Outfit, sans-serif",
    cursor: enabled ? "pointer" : "default",
    width: "100%"
});

export const roundBack: CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid " + V.v15,
    background: V.v06,
    color: C.text,
    fontSize: 17,
    cursor: "pointer",
    flexShrink: 0
};

export const sectionLabel: CSSProperties = {
    color: C.textDim,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.5
};

export const screenTitle: CSSProperties = {
    fontFamily: "Unbounded, sans-serif",
    fontSize: 22,
    fontWeight: 700
};
