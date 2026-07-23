import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";

import { GRAD, GRAD_TILE, PALETTES, SHADOWS } from "./colors";
import type { ColorScheme, Palette, Shadows } from "./colors";
import { FONT, LAYOUT, R, S, S2, T } from "./tokens";

export type ThemeMode = ColorScheme | "system";

export interface ThemeValue {
    C: Palette;
    SHADOW: Shadows;
    T: typeof T;
    S: typeof S;
    S2: typeof S2;
    R: typeof R;
    LAYOUT: typeof LAYOUT;
    FONT: typeof FONT;
    GRAD: string;
    GRAD_TILE: string;
    /** The resolved scheme actually being rendered — never "system". */
    scheme: ColorScheme;
    /** What the app was told to use, including "system". */
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children, initialMode = "system" }: { children: ReactNode; initialMode?: ThemeMode }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>(initialMode);

    const scheme: ColorScheme = mode === "system" ? (systemScheme === "light" ? "light" : "dark") : mode;

    const value = useMemo<ThemeValue>(
        () => ({
            C: PALETTES[scheme],
            SHADOW: SHADOWS[scheme],
            T,
            S,
            S2,
            R,
            LAYOUT,
            FONT,
            GRAD,
            GRAD_TILE,
            scheme,
            mode,
            setMode
        }),
        [scheme, mode]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const value = useContext(ThemeContext);
    if (!value) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return value;
}
