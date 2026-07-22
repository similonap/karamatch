import { Text } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Wordmark`. The web version let
// "Kara" inherit whatever text colour surrounded it via CSS; RN has no
// inheritance, so that segment takes an explicit `color` instead (default:
// the theme's primary text colour).
export function Wordmark({ size = 19, color }: { size?: number; color?: string }) {
    const { C, FONT } = useTheme();
    return (
        <Text style={{ fontFamily: FONT.displayExtraBold, fontSize: size, letterSpacing: -0.4 }}>
            <Text style={{ color: color ?? C.text }}>Kara</Text>
            <Text style={{ color: C.tint }}>Match</Text>
        </Text>
    );
}
