import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "../primitives/AppPressable";

export type TabKey = "venues" | "parties" | "match" | "friends" | "mine";

export const TABS: { key: TabKey; label: string; icon: IconName }[] = [
    { key: "venues", label: "Venues", icon: "pin" },
    { key: "parties", label: "Parties", icon: "mic" },
    { key: "match", label: "Match", icon: "spark" },
    { key: "friends", label: "Friends", icon: "users" },
    { key: "mine", label: "Mine", icon: "calendar" }
];

// Ported from karamatch-web/src/screens/MainTabs.tsx's inline `TabBar` — flat
// and opaque, hairline on top, icon over label, the selected tab marked by a
// filled glyph and the tint colour. Deliberately not a floating translucent
// pill: that's an iOS-only idiom that renders differently wherever
// backdrop-filter/blur is unsupported, breaking the "identical on both
// platforms" requirement the web version calls out.
export function BottomTabBar({ current, onSelect }: { current: TabKey; onSelect: (tab: TabKey) => void }) {
    const { C, FONT, LAYOUT, T } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "stretch",
                height: LAYOUT.tabBar + insets.bottom,
                paddingBottom: insets.bottom,
                backgroundColor: C.surface,
                borderTopWidth: 1,
                borderTopColor: C.border
            }}
        >
            {TABS.map(tab => {
                const on = tab.key === current;
                return (
                    <AppPressable
                        key={tab.key}
                        onPress={() => onSelect(tab.key)}
                        scaleTo={0.92}
                        opacityTo={0.6}
                        accessibilityLabel={tab.label}
                        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
                    >
                        <Icon name={tab.icon} size={24} strokeWidth={1.8} solid={on} color={on ? C.tint : C.textMuted} />
                        <Text
                            style={[
                                T.footnote,
                                {
                                    fontFamily: on ? FONT.bodyBold : FONT.bodyMedium,
                                    fontSize: 10,
                                    letterSpacing: 0.1,
                                    color: on ? C.tint : C.textMuted
                                }
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </AppPressable>
                );
            })}
        </View>
    );
}
