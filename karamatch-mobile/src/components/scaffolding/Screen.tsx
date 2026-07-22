import { ScrollView } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `ScrollBody` — the scrolling body
// of a screen, handling the gutter and the bottom safe-area pad. The web
// version measured its own bottom inset with a `LAYOUT.safeBottom` constant;
// RN reads the device's real inset from `react-native-safe-area-context` and
// leans on `contentInsetAdjustmentBehavior="automatic"` instead of manual
// top padding.
export function Screen({
    children,
    pad = true,
    bottomPad,
    gap,
    style,
    onScroll
}: {
    children: React.ReactNode;
    pad?: boolean;
    bottomPad?: number;
    gap?: number;
    style?: StyleProp<ViewStyle>;
    /** Scroll offset in px, for screens with a collapsing header. */
    onScroll?: (offset: number) => void;
}) {
    const { LAYOUT, S, S2 } = useTheme();
    const insets = useSafeAreaInsets();

    const handleScroll = onScroll
        ? (event: NativeSyntheticEvent<NativeScrollEvent>) => onScroll(event.nativeEvent.contentOffset.y)
        : undefined;

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
                {
                    gap: gap ?? S2.s12,
                    paddingHorizontal: pad ? LAYOUT.gutter : 0,
                    paddingBottom: bottomPad ?? insets.bottom + S.md
                },
                style
            ]}
            contentInsetAdjustmentBehavior="automatic"
            onScroll={handleScroll}
            scrollEventThrottle={handleScroll ? 16 : undefined}
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    );
}
