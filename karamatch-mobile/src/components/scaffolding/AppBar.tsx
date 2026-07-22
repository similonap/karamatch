import { Text, View } from "react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { AppPressable } from "../primitives/AppPressable";

// Ported from karamatch-web/src/ui.tsx's `AppBar` — a stack screen's
// navigation bar: fixed height, hairline underneath, back affordance on the
// left and at most one action on the right. The web version relied on
// `PhoneFrame`'s drawn status bar for the top inset; here `AppBar` reserves
// the device's real safe-area top inset itself, since a shelf component has
// no navigator chrome to sit below.
export function AppBar({
    title,
    onBack,
    right,
    large,
    subtitle,
    bordered = true
}: {
    title?: ReactNode;
    onBack?: () => void;
    right?: ReactNode;
    /** Renders the title below the bar instead, as a large screen heading. */
    large?: boolean;
    subtitle?: string;
    bordered?: boolean;
}) {
    const { C, LAYOUT, R, S, T } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View>
            <View
                style={{
                    height: LAYOUT.appBar,
                    paddingTop: insets.top,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: S.sm,
                    paddingLeft: onBack ? 4 : LAYOUT.gutter,
                    paddingRight: S.sm,
                    borderBottomWidth: bordered && !large ? 1 : 0,
                    borderBottomColor: C.border
                }}
            >
                {onBack ? (
                    <AppPressable
                        onPress={onBack}
                        accessibilityLabel="Go back"
                        style={{
                            width: LAYOUT.touch,
                            height: LAYOUT.touch,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: R.full
                        }}
                    >
                        <Icon name="chevronLeft" size={24} strokeWidth={2} color={C.text} />
                    </AppPressable>
                ) : null}

                <View style={{ flex: 1, minWidth: 0 }}>
                    {!large && title ? (
                        typeof title === "string" ? (
                            <Text style={[T.navTitle, { color: C.text }]} numberOfLines={1}>
                                {title}
                            </Text>
                        ) : (
                            title
                        )
                    ) : null}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>{right}</View>
            </View>

            {large && title ? (
                <View style={{ paddingHorizontal: LAYOUT.gutter, paddingBottom: S.md }}>
                    {typeof title === "string" ? <Text style={[T.title, { color: C.text }]}>{title}</Text> : title}
                    {subtitle ? <Text style={[T.caption, { color: C.textMuted, marginTop: 3 }]}>{subtitle}</Text> : null}
                </View>
            ) : null}
        </View>
    );
}
