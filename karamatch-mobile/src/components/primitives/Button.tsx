import { Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeValue } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";
import { Spinner } from "./Spinner";

// Ported from karamatch-web/src/ui.tsx's `Button`. Same variant x size
// matrix; the gradient (reserved for the one enabled primary action per
// screen) is a real CSS-gradient string via `experimental_backgroundImage`.
type ButtonVariant = "primary" | "tinted" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "md" | "sm";

// A disabled primary drops to a flat surface rather than a dimmed gradient,
// so "can't press this" reads instantly — the only variant whose box style
// changes with `disabled`; the rest look the same disabled or not.
function boxStyleFor(C: ThemeValue["C"], variant: ButtonVariant, off: boolean): ViewStyle {
    if (variant === "primary") {
        return off ? { backgroundColor: C.surface3 } : {};
    }
    return {
        tinted: { backgroundColor: C.tintBg, borderWidth: 1, borderColor: C.tintBorder },
        secondary: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
        ghost: { backgroundColor: "transparent" },
        danger: { backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder }
    }[variant];
}

function sizeStyleFor(R: ThemeValue["R"], S: ThemeValue["S"], S2: ThemeValue["S2"], size: ButtonSize): ViewStyle {
    return {
        lg: { height: 52, borderRadius: R.md, paddingHorizontal: S.lg },
        md: { height: 44, borderRadius: R.md, paddingHorizontal: S.lg },
        sm: { height: 36, borderRadius: R.sm, paddingHorizontal: S2.s12 }
    }[size];
}

function textColorFor(C: ThemeValue["C"], variant: ButtonVariant, off: boolean) {
    if (variant === "primary") {
        return off ? C.textFaint : C.onTint;
    }
    return { tinted: C.tintSoft, secondary: C.text, ghost: C.tintSoft, danger: C.danger }[variant];
}

export function Button({
    label,
    onPress,
    variant = "primary",
    disabled,
    busy,
    icon,
    size = "lg",
    style
}: {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    busy?: boolean;
    icon?: IconName;
    size?: ButtonSize;
    style?: StyleProp<ViewStyle>;
}) {
    const { C, R, S, S2, GRAD, T } = useTheme();
    const off = Boolean(disabled || busy);
    const textColor = textColorFor(C, variant, off);
    const showGradient = variant === "primary" && !off;

    return (
        <AppPressable onPress={onPress} disabled={off} scaleTo={0.98} style={style}>
            <View
                style={[
                    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, borderCurve: "continuous" },
                    sizeStyleFor(R, S, S2, size),
                    boxStyleFor(C, variant, off),
                    showGradient
                        ? { experimental_backgroundImage: GRAD, boxShadow: "0 6px 20px " + C.tintGlow }
                        : null
                ]}
            >
                {busy ? <Spinner size={16} color={textColor} /> : icon ? <Icon name={icon} size={18} strokeWidth={2} color={textColor} /> : null}
                <Text style={[T.bodyStrong, { color: textColor, fontSize: size === "lg" ? 16 : size === "md" ? 15 : 13 }]}>{label}</Text>
            </View>
        </AppPressable>
    );
}
