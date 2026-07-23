import { Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { cva } from "class-variance-authority";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";
import { Spinner } from "./Spinner";

// Ported from karamatch-web/src/ui.tsx's `Button`. Same variant x size
// matrix; the gradient (reserved for the one enabled primary action per
// screen) is a real CSS-gradient string via `experimental_backgroundImage`
// instead of the web's `background: GRAD` — className can't express an
// arbitrary gradient/boxShadow on RN, so those two stay inline style, same
// as before.
type ButtonVariant = "primary" | "tinted" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "md" | "sm";

// A disabled primary drops to a flat surface rather than a dimmed gradient,
// so "can't press this" reads instantly — the only variant whose classes
// change with `disabled`; the rest look the same disabled or not.
const buttonBox = cva("flex-row items-center justify-center gap-sm", {
    variants: {
        variant: {
            primary: "",
            tinted: "bg-tintBg border border-tintBorder",
            secondary: "bg-surface2 border border-border",
            ghost: "bg-transparent",
            danger: "bg-dangerBg border border-dangerBorder"
        },
        size: {
            lg: "h-[52px] rounded-md px-lg",
            md: "h-[44px] rounded-md px-lg",
            sm: "h-[36px] rounded-sm px-s12"
        },
        disabled: { true: "", false: "" }
    },
    compoundVariants: [{ variant: "primary", disabled: true, class: "bg-surface3" }]
});

const buttonText = cva("", {
    variants: {
        variant: {
            primary: "text-onTint",
            tinted: "text-tintSoft",
            secondary: "text-text",
            ghost: "text-tintSoft",
            danger: "text-danger"
        },
        disabled: { true: "", false: "" }
    },
    compoundVariants: [{ variant: "primary", disabled: true, class: "text-textFaint" }]
});

// Spinner/Icon take a resolved colour, not a className (react-native-svg has
// no class-based styling here) — kept alongside the two className maps above.
function textColorFor(C: ReturnType<typeof useTheme>["C"], variant: ButtonVariant, off: boolean) {
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
    const { C, GRAD, T } = useTheme();
    const off = Boolean(disabled || busy);
    const textColor = textColorFor(C, variant, off);
    const showGradient = variant === "primary" && !off;

    return (
        <AppPressable onPress={onPress} disabled={off} scaleTo={0.98} style={style}>
            <View
                className={buttonBox({ variant, size, disabled: off })}
                style={[
                    { borderCurve: "continuous" },
                    showGradient
                        ? { experimental_backgroundImage: GRAD, boxShadow: "0 6px 20px " + C.tintGlow }
                        : null
                ]}
            >
                {busy ? <Spinner size={16} color={textColor} /> : icon ? <Icon name={icon} size={18} strokeWidth={2} color={textColor} /> : null}
                <Text
                    className={buttonText({ variant, disabled: off })}
                    style={[T.bodyStrong, { fontSize: size === "lg" ? 16 : size === "md" ? 15 : 13 }]}
                >
                    {label}
                </Text>
            </View>
        </AppPressable>
    );
}
