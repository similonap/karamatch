import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeValue } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

type ChipTone = "neutral" | "tint" | "cyan" | "gold" | "green";

const bodyStyleFor = (C: ThemeValue["C"]): Record<ChipTone, { backgroundColor: string; borderColor: string }> => ({
    neutral: { backgroundColor: C.surface2, borderColor: C.border },
    tint: { backgroundColor: C.tintBg, borderColor: C.tintBorder },
    cyan: { backgroundColor: C.cyanBg, borderColor: C.cyanBorder },
    gold: { backgroundColor: "transparent", borderColor: C.border },
    green: { backgroundColor: "transparent", borderColor: C.border }
});

const iconColorFor = (C: ThemeValue["C"]): Record<ChipTone, string> => ({
    neutral: C.textDim,
    tint: C.tintSoft,
    cyan: C.cyan,
    gold: C.gold,
    green: C.green
});

// Ported from karamatch-web/src/ui.tsx's `Chip` — a small status/metadata pill.
export function Chip({
    label,
    icon,
    tone = "neutral",
    onPress,
    selected,
    chevron
}: {
    label: ReactNode;
    icon?: IconName;
    tone?: ChipTone;
    onPress?: () => void;
    selected?: boolean;
    /** Trailing chevron, for a chip that opens something (e.g. a location picker). */
    chevron?: boolean;
}) {
    const { C, R, T } = useTheme();
    const resolvedTone = selected ? "tint" : tone;
    const iconColor = iconColorFor(C)[resolvedTone];

    const body = (
        <View
            style={[
                { flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: R.sm, borderWidth: 1, borderCurve: "continuous" },
                bodyStyleFor(C)[resolvedTone]
            ]}
        >
            {icon ? <Icon name={icon} size={13} strokeWidth={2} color={iconColor} /> : null}
            {typeof label === "string" ? (
                <Text style={[T.footnote, { color: iconColor, fontSize: 12 }]}>{label}</Text>
            ) : (
                label
            )}
            {chevron ? <Icon name="chevronRight" size={12} strokeWidth={2} color={iconColor} /> : null}
        </View>
    );

    if (!onPress) {
        return body;
    }
    return <AppPressable onPress={onPress}>{body}</AppPressable>;
}
