import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Group` — a grouped-list container:
// rows share one rounded surface, split by hairlines drawn by `ListRow`.
export function Group({ children, title }: { children: React.ReactNode; title?: string }) {
    const { C, R, S, SHADOW, T } = useTheme();
    return (
        <View style={{ gap: S.sm }}>
            {title ? <Text style={[T.sectionHeader, { color: C.textMuted, paddingLeft: S.xs }]}>{title}</Text> : null}
            <View
                style={{
                    backgroundColor: C.surface1,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: R.lg,
                    borderCurve: "continuous",
                    overflow: "hidden",
                    boxShadow: SHADOW.e1
                }}
            >
                {children}
            </View>
        </View>
    );
}
