import type { TextStyle } from "react-native";

// Ported from karamatch-web/src/design/tokens.ts. The scales themselves
// (4pt spacing grid, fixed type ramp, small radius set) are the ones a
// React Native app would carry natively, so they cross over unchanged.

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
    /** Smallest thing a thumb should have to hit. */
    touch: 44
} as const;

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

// Google Fonts' static weight files are loaded through @expo-google-fonts,
// one JS-registered family name per weight (see App.tsx's useFonts call).
// Unlike CSS, React Native can't fake a weight onto a single font file, so
// every entry below names the exact weighted family instead of pairing a
// base family with a `fontWeight`.
export const FONT = {
    displayExtraBold: "Unbounded_800ExtraBold",
    displayBold: "Unbounded_700Bold",
    bodyRegular: "Outfit_400Regular",
    bodyMedium: "Outfit_500Medium",
    bodyBold: "Outfit_700Bold",
    bodyExtraBold: "Outfit_800ExtraBold"
} as const;

// A fixed ramp. `title` is a screen heading, `body` is 15 (native default is
// 15-17; 15 keeps dense list rows readable), `caption` is metadata.
export const T = {
    display: { fontFamily: FONT.displayExtraBold, fontSize: 32, letterSpacing: -0.8, lineHeight: 37 },
    title: { fontFamily: FONT.displayBold, fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
    heading: { fontFamily: FONT.displayBold, fontSize: 17, letterSpacing: -0.2, lineHeight: 22 },
    /** Nav-bar title. */
    navTitle: { fontFamily: FONT.bodyBold, fontSize: 17, letterSpacing: -0.2 },
    bodyStrong: { fontFamily: FONT.bodyBold, fontSize: 15, lineHeight: 21 },
    body: { fontFamily: FONT.bodyRegular, fontSize: 15, lineHeight: 23 },
    callout: { fontFamily: FONT.bodyRegular, fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: FONT.bodyRegular, fontSize: 13, lineHeight: 18 },
    captionStrong: { fontFamily: FONT.bodyBold, fontSize: 13, lineHeight: 18 },
    footnote: { fontFamily: FONT.bodyMedium, fontSize: 11, lineHeight: 15 },
    /** All-caps section header above a grouped list. */
    sectionHeader: {
        fontFamily: FONT.bodyExtraBold,
        fontSize: 11,
        letterSpacing: 0.9,
        textTransform: "uppercase"
    }
} as const satisfies Record<string, TextStyle>;
