import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `IconButton` — a circular icon
// button for an app bar or an overlay.
export function IconButton({
    icon,
    onPress,
    label,
    badge,
    tone = "plain",
    size
}: {
    icon: IconName;
    onPress: () => void;
    label: string;
    badge?: number;
    tone?: "plain" | "filled";
    size?: number;
}) {
    const { C, LAYOUT, R, T } = useTheme();
    const resolvedSize = size ?? LAYOUT.touch;

    return (
        <AppPressable
            onPress={onPress}
            accessibilityLabel={label}
            style={{
                width: resolvedSize,
                height: resolvedSize,
                borderRadius: R.full,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tone === "filled" ? C.surface2 : "transparent",
                borderWidth: tone === "filled" ? 1 : 0,
                borderColor: C.border
            }}
        >
            <Icon name={icon} size={22} color={C.text} />
            {badge && badge > 0 ? (
                <View
                    style={{
                        position: "absolute",
                        top: 5,
                        right: 4,
                        minWidth: 17,
                        height: 17,
                        borderRadius: R.full,
                        backgroundColor: C.tint,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 4,
                        borderWidth: 2,
                        borderColor: C.surface
                    }}
                >
                    <Text style={[T.sectionHeader, { fontSize: 10, letterSpacing: 0, textTransform: "none", color: C.onTint }]}>
                        {badge > 9 ? "9+" : badge}
                    </Text>
                </View>
            ) : null}
        </AppPressable>
    );
}
