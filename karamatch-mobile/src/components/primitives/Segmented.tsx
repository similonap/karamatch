import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `Segmented` — an iOS/Material-
// neutral segmented control, for switching a pane within a screen.
export function Segmented<K extends string>({
    items,
    value,
    onChange
}: {
    items: { key: K; label: string; dot?: boolean }[];
    value: K;
    onChange: (key: K) => void;
}) {
    const { C, R, T } = useTheme();

    return (
        <View
            style={{
                flexDirection: "row",
                backgroundColor: C.surface2,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: R.md,
                borderCurve: "continuous",
                padding: 3,
                gap: 2
            }}
        >
            {items.map(item => {
                const on = item.key === value;
                return (
                    <AppPressable
                        key={item.key}
                        onPress={() => onChange(item.key)}
                        scaleTo={1}
                        opacityTo={0.8}
                        style={{
                            flex: 1,
                            height: 34,
                            borderRadius: R.sm,
                            borderCurve: "continuous",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            backgroundColor: on ? C.surfacePress : "transparent"
                        }}
                    >
                        <Text style={[on ? T.captionStrong : T.caption, { color: on ? C.text : C.textMuted }]}>
                            {item.label}
                        </Text>
                        {item.dot ? (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.tint }} />
                        ) : null}
                    </AppPressable>
                );
            })}
        </View>
    );
}
