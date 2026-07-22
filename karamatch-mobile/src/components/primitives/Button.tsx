import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";
import { Spinner } from "./Spinner";

// Ported from karamatch-web/src/ui.tsx's `Button`. Same variant x size
// matrix; the gradient (reserved for the one enabled primary action per
// screen) is a real CSS-gradient string via `experimental_backgroundImage`
// instead of the web's `background: GRAD`.
type ButtonVariant = "primary" | "tinted" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "md" | "sm";

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
    const { C, GRAD, R, S, S2, T } = useTheme();
    const height = size === "lg" ? 52 : size === "md" ? 44 : 36;
    const off = disabled || busy;

    // The gradient is reserved for the enabled primary action — one per
    // screen. A disabled primary drops to a flat surface rather than a
    // dimmed gradient, so "can't press this" reads instantly. `tinted` is
    // the in-list action: clearly the affordance, but it doesn't compete
    // with a screen's primary.
    const skin: Record<ButtonVariant, ViewStyle & { textColor: string }> = {
        primary: off
            ? { backgroundColor: C.surface3, textColor: C.textFaint }
            : {
                  experimental_backgroundImage: GRAD,
                  textColor: C.onTint,
                  boxShadow: "0 6px 20px " + C.tintGlow
              },
        tinted: { backgroundColor: C.tintBg, textColor: C.tintSoft, borderWidth: 1, borderColor: C.tintBorder },
        secondary: { backgroundColor: C.surface2, textColor: C.text, borderWidth: 1, borderColor: C.border },
        ghost: { backgroundColor: "transparent", textColor: C.tintSoft },
        danger: { backgroundColor: C.dangerBg, textColor: C.danger, borderWidth: 1, borderColor: C.dangerBorder }
    };
    const { textColor, ...skinStyle } = skin[variant];

    return (
        <AppPressable onPress={onPress} disabled={off} scaleTo={0.98} style={style}>
            <View
                style={[
                    styles.base,
                    {
                        height,
                        borderRadius: size === "sm" ? R.sm : R.md,
                        gap: S.sm,
                        paddingHorizontal: size === "sm" ? S2.s12 : S.lg,
                        borderCurve: "continuous"
                    },
                    skinStyle
                ]}
            >
                {busy ? <Spinner size={16} color={textColor} /> : icon ? <Icon name={icon} size={18} strokeWidth={2} color={textColor} /> : null}
                <Text
                    style={[
                        T.bodyStrong,
                        { color: textColor, fontSize: size === "lg" ? 16 : size === "md" ? 15 : 13 }
                    ]}
                >
                    {label}
                </Text>
            </View>
        </AppPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    }
});
