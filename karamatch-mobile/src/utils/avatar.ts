import { AVATAR_COLORS } from "../theme/colors";

// Ported from karamatch-web/src/design/tokens.ts. Stable colour per person so
// an avatar keeps its colour across screens.
export function avatarColor(key: string | number) {
    const s = String(key);
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initial(name: string) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
}
