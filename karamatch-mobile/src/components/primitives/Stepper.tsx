import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `Stepper` — a -/+ numeric stepper
// with full-size touch targets.
export function Stepper({
    value,
    min,
    max,
    onChange,
    suffix
}: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    suffix?: string;
}) {
    const { C, FONT, LAYOUT, R, S2, T } = useTheme();

    const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

    const control = (label: string, icon: IconName, delta: number, off: boolean) => (
        <AppPressable
            onPress={() => step(delta)}
            disabled={off}
            accessibilityLabel={label}
            scaleTo={0.9}
            style={{
                width: LAYOUT.touch,
                height: LAYOUT.touch,
                borderRadius: R.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.surface2,
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <Icon name={icon} size={18} strokeWidth={2.4} color={C.text} />
        </AppPressable>
    );

    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S2.s12 }}>
            {control("Decrease", "minus", -1, value <= min)}
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, minWidth: 52, justifyContent: "center" }}>
                <Text style={{ fontFamily: FONT.displayBold, fontSize: 20, color: C.text }}>{value}</Text>
                {suffix ? <Text style={[T.footnote, { color: C.textMuted }]}>{suffix}</Text> : null}
            </View>
            {control("Increase", "plus", 1, value >= max)}
        </View>
    );
}
