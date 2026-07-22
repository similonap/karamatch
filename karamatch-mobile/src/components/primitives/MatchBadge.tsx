import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `MatchBadge` — taste compatibility
// as a compact pill, for singers listed in a row. Renders nothing when pct
// is null (that singer is you).
export function MatchBadge({ pct }: { pct: number | null | undefined }) {
    const { C, R, T } = useTheme();
    if (pct === null || pct === undefined) {
        return null;
    }
    const strong = pct >= 60;

    return (
        <View
            style={{
                borderRadius: R.sm,
                borderCurve: "continuous",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: strong ? C.tintBorder : C.border,
                backgroundColor: strong ? C.tintBg : C.surface2
            }}
        >
            <Text style={[T.footnote, { fontSize: 11, color: strong ? C.tintSoft : C.textMuted }]}>{pct}%</Text>
        </View>
    );
}
