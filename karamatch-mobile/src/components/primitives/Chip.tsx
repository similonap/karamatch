import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

type ChipTone = "neutral" | "tint" | "cyan" | "gold" | "green";

// Ported from karamatch-web/src/ui.tsx's `Chip` — a small status/metadata pill.
export function Chip({
    label,
    icon,
    tone = "neutral",
    onPress,
    selected
}: {
    label: ReactNode;
    icon?: IconName;
    tone?: ChipTone;
    onPress?: () => void;
    selected?: boolean;
}) {
    const { C, R, T } = useTheme();

    const tones: Record<ChipTone, { color: string; background: string; border?: string }> = {
        neutral: { color: C.textDim, background: C.surface2, border: C.border },
        tint: { color: C.tintSoft, background: C.tintBg, border: C.tintBorder },
        cyan: { color: C.cyan, background: C.cyanBg, border: C.cyanBorder },
        gold: { color: C.gold, background: "transparent", border: C.border },
        green: { color: C.green, background: "transparent", border: C.border }
    };
    const skin = tones[selected ? "tint" : tone];

    const body = (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                height: 26,
                paddingHorizontal: 10,
                borderRadius: R.sm,
                borderCurve: "continuous",
                backgroundColor: skin.background,
                borderWidth: 1,
                borderColor: skin.border
            }}
        >
            {icon ? <Icon name={icon} size={13} strokeWidth={2} color={skin.color} /> : null}
            {typeof label === "string" ? (
                <Text style={[T.footnote, { fontSize: 12, color: skin.color }]}>{label}</Text>
            ) : (
                label
            )}
        </View>
    );

    if (!onPress) {
        return body;
    }
    return <AppPressable onPress={onPress}>{body}</AppPressable>;
}
