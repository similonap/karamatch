import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `Card`.
export function Card({
    children,
    onPress,
    style,
    padded = true,
    highlight
}: {
    children: React.ReactNode;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    padded?: boolean;
    /** Tints the border, for the one card that deserves attention. */
    highlight?: boolean;
}) {
    const { C, R, S, SHADOW } = useTheme();
    const base: ViewStyle = {
        backgroundColor: C.surface1,
        borderWidth: 1,
        borderColor: highlight ? C.tintBorder : C.border,
        borderRadius: R.lg,
        borderCurve: "continuous",
        boxShadow: SHADOW.e1,
        padding: padded ? S.md : 0,
        overflow: "hidden"
    };

    if (!onPress) {
        return <View style={[base, style]}>{children}</View>;
    }
    return (
        <AppPressable onPress={onPress} scaleTo={0.985} opacityTo={0.85} style={[base, style]}>
            {children}
        </AppPressable>
    );
}
