import type { CSSProperties } from "react";

// Design tokens lifted verbatim from the prototype (KaraMatch.dc.html).
export const C = {
    pink: "#FF3D8F",
    pinkSoft: "#FF6FAE",
    pinkPale: "#FF9EC8",
    purple: "#B23DFF",
    violet: "#8A2BE2",
    cyan: "#29E0FF",
    green: "#3DFF9A",
    gold: "#FFC145",
    text: "#F5F1FA",
    textDim: "#B9AECF",
    textMuted: "#9A8FB0",
    textFaint: "#6E6284",
    bg: "#0A0512",
    bgDeep: "#08040F",
    panel: "#140B22"
};

export const GRAD = "linear-gradient(90deg,#FF3D8F,#B23DFF)";
export const GRAD_TILE = "linear-gradient(135deg,#FF3D8F,#8A2BE2)";
export const DIM_BG = "rgba(255,255,255,.12)";

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
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.04)"
};

export const inputStyle: CSSProperties = {
    height: 54,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
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
    border: "1px solid rgba(255,255,255,.15)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
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
