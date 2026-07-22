import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Section` — a titled block of
// content within a screen.
export function Section({
    title,
    hint,
    children,
    gap
}: {
    title: string;
    hint?: ReactNode;
    children: ReactNode;
    gap?: number;
}) {
    const { C, S, T } = useTheme();
    return (
        <View style={{ gap: gap ?? S.sm }}>
            <Text style={[T.sectionHeader, { color: C.textMuted }]}>{title}</Text>
            {children}
            {hint ? (
                typeof hint === "string" ? <Text style={[T.footnote, { color: C.textFaint }]}>{hint}</Text> : hint
            ) : null}
        </View>
    );
}
