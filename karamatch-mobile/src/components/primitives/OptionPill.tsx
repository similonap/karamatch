import { Text } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `OptionPill` — a selectable option
// pill, e.g. a day, a time, a room.
export function OptionPill({
    label,
    sub,
    selected,
    onPress,
    disabled
}: {
    label: ReactNode;
    sub?: ReactNode;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
}) {
    const { C, LAYOUT, R, T } = useTheme();

    return (
        <AppPressable
            onPress={onPress}
            disabled={disabled}
            scaleTo={0.96}
            style={{
                minHeight: LAYOUT.touch,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: R.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: selected ? C.tintBorder : C.border,
                backgroundColor: selected ? C.tintBg : C.surface2,
                alignItems: "center",
                justifyContent: "center",
                gap: 1
            }}
        >
            <Text style={[T.captionStrong, { color: selected ? C.tintSoft : C.textDim }]}>{label}</Text>
            {sub ? (
                <Text style={[T.footnote, { fontSize: 10, opacity: 0.8, color: selected ? C.tintSoft : C.textDim }]}>
                    {sub}
                </Text>
            ) : null}
        </AppPressable>
    );
}
