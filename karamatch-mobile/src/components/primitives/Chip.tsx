import { Text, View } from "react-native";
import type { ReactNode } from "react";
import { cva } from "class-variance-authority";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

type ChipTone = "neutral" | "tint" | "cyan" | "gold" | "green";

const chipBody = cva("flex-row items-center gap-[5px] h-[26px] px-[10px] rounded-sm border", {
    variants: {
        tone: {
            neutral: "bg-surface2 border-border",
            tint: "bg-tintBg border-tintBorder",
            cyan: "bg-cyanBg border-cyanBorder",
            gold: "bg-transparent border-border",
            green: "bg-transparent border-border"
        }
    }
});

// Colour only — fontFamily/size/lineHeight stay inline from `T.footnote`
// (every weight is its own named font family, see theme/tokens.ts, so it
// isn't a Tailwind `font-*`/`text-*` scale entry the way size/colour are).
const chipTextColor = cva("", {
    variants: {
        tone: {
            neutral: "text-textDim",
            tint: "text-tintSoft",
            cyan: "text-cyan",
            gold: "text-gold",
            green: "text-green"
        }
    }
});

// Icon colour can't be a className (react-native-svg's stroke/fill are style
// props, not classable through Icon's plain `color` prop), so this stays a
// resolved-value lookup alongside the two className maps above.
const iconColorFor = (C: ReturnType<typeof useTheme>["C"]): Record<ChipTone, string> => ({
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
    const { C, T } = useTheme();
    const resolvedTone = selected ? "tint" : tone;
    const iconColor = iconColorFor(C)[resolvedTone];

    const body = (
        <View className={chipBody({ tone: resolvedTone })} style={{ borderCurve: "continuous" }}>
            {icon ? <Icon name={icon} size={13} strokeWidth={2} color={iconColor} /> : null}
            {typeof label === "string" ? (
                <Text className={chipTextColor({ tone: resolvedTone })} style={[T.footnote, { fontSize: 12 }]}>
                    {label}
                </Text>
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
