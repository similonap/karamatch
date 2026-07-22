import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `BottomBar` — a bottom-docked
// action area, a primary button pinned above the safe inset. Uses the
// device's real bottom inset instead of the web version's `LAYOUT.safeBottom`
// constant.
export function BottomBar({ children }: { children: React.ReactNode }) {
    const { C, LAYOUT, S } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                paddingHorizontal: LAYOUT.gutter,
                paddingTop: S.md,
                paddingBottom: insets.bottom + S.sm,
                borderTopWidth: 1,
                borderTopColor: C.border,
                backgroundColor: C.surface,
                gap: S.sm
            }}
        >
            {children}
        </View>
    );
}
