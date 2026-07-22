// Ported from karamatch-web/src/index.css. The web app resolves colour
// through CSS variables so a theme switch needs no re-render; React Native
// has no CSS variables, so ThemeProvider picks one of these two objects and
// components read it through useTheme() instead.

export type ColorScheme = "dark" | "light";

export interface Palette {
    bg: string;
    surface: string;
    surface1: string;
    surface2: string;
    surface3: string;
    surfacePress: string;

    border: string;
    borderStrong: string;

    text: string;
    textDim: string;
    textMuted: string;
    textFaint: string;
    onTint: string;

    tint: string;
    tintSoft: string;
    tintPale: string;
    tintBg: string;
    tintBorder: string;
    tintGlow: string;

    purple: string;
    violet: string;
    cyan: string;
    cyanBg: string;
    cyanBorder: string;
    green: string;
    gold: string;

    danger: string;
    dangerBg: string;
    dangerBorder: string;

    scrim: string;
    skeleton: string;
}

export interface Shadows {
    e1: string;
    e2: string;
    e3: string;
}

const dark: Palette = {
    bg: "#07040d",
    surface: "#0d0817",
    surface1: "#171029",
    surface2: "#211735",
    surface3: "#2b1f43",
    surfacePress: "#342650",

    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.14)",

    text: "#f6f2fb",
    textDim: "#b9aecf",
    textMuted: "#8d82a5",
    textFaint: "#665b7d",
    onTint: "#ffffff",

    tint: "#ff3d8f",
    tintSoft: "#ff6fae",
    tintPale: "#ff9ec8",
    tintBg: "rgba(255, 61, 143, 0.14)",
    tintBorder: "rgba(255, 61, 143, 0.42)",
    tintGlow: "rgba(255, 61, 143, 0.38)",

    purple: "#b23dff",
    violet: "#8a2be2",
    cyan: "#29e0ff",
    cyanBg: "rgba(41, 224, 255, 0.12)",
    cyanBorder: "rgba(41, 224, 255, 0.28)",
    green: "#3dff9a",
    gold: "#ffc145",

    danger: "#ff5a5f",
    dangerBg: "rgba(255, 90, 95, 0.13)",
    dangerBorder: "rgba(255, 90, 95, 0.4)",

    scrim: "rgba(4, 2, 8, 0.66)",
    skeleton: "#211735"
};

const darkShadows: Shadows = {
    e1: "0 1px 2px rgba(0, 0, 0, 0.4)",
    e2: "0 4px 16px rgba(0, 0, 0, 0.45)",
    e3: "0 16px 48px rgba(0, 0, 0, 0.55)"
};

const light: Palette = {
    bg: "#f4eefb",
    surface: "#ffffff",
    surface1: "#ffffff",
    surface2: "#f7f2fd",
    surface3: "#efe7f9",
    surfacePress: "#e5daf4",

    border: "rgba(38, 16, 64, 0.1)",
    borderStrong: "rgba(38, 16, 64, 0.18)",

    text: "#170e22",
    textDim: "#52466a",
    textMuted: "#7a6e91",
    textFaint: "#a396b8",
    onTint: "#ffffff",

    tint: "#e01a72",
    tintSoft: "#c8146c",
    tintPale: "#a81159",
    tintBg: "rgba(224, 26, 114, 0.1)",
    tintBorder: "rgba(224, 26, 114, 0.35)",
    tintGlow: "rgba(224, 26, 114, 0.28)",

    purple: "#8c1fd6",
    violet: "#7622c4",
    cyan: "#0089a6",
    cyanBg: "rgba(0, 137, 166, 0.1)",
    cyanBorder: "rgba(0, 137, 166, 0.26)",
    green: "#0f9a5c",
    gold: "#96650a",

    danger: "#d1373c",
    dangerBg: "rgba(209, 55, 60, 0.1)",
    dangerBorder: "rgba(209, 55, 60, 0.32)",

    scrim: "rgba(38, 16, 64, 0.4)",
    skeleton: "#ece4f7"
};

const lightShadows: Shadows = {
    e1: "0 1px 2px rgba(38, 16, 64, 0.08)",
    e2: "0 4px 16px rgba(38, 16, 64, 0.1)",
    e3: "0 16px 48px rgba(38, 16, 64, 0.18)"
};

export const PALETTES: Record<ColorScheme, Palette> = { dark, light };
export const SHADOWS: Record<ColorScheme, Shadows> = { dark: darkShadows, light: lightShadows };

// The gradient is a scarce resource: one primary action per screen, plus the
// brand mark. Same in both themes — it sits on the tint, not the surface.
export const GRAD = "linear-gradient(100deg, #FF3D8F, #B23DFF)";
export const GRAD_TILE = "linear-gradient(135deg, #FF3D8F, #8A2BE2)";

// Stable colour per person so an avatar keeps its colour across screens.
export const AVATAR_COLORS = ["#FF3D8F", "#29E0FF", "#B23DFF", "#3DFF9A", "#FFC145", "#FF7A5C"];
