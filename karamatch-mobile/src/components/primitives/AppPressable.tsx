import { useRef } from "react";
import type { ReactNode } from "react";
import { Animated, Pressable } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

// Ported from karamatch-web/src/ui.tsx's `Pressable`, the foundation of every
// touchable in the shelf. The web version faked RN's press feedback with
// pointer events + a CSS transition; here it's the real thing — RN's own
// `Pressable` for hit-testing/`disabled`, `Animated.timing` on scale +
// opacity for the dip, timed to match the web version's 60ms-down /
// 160ms-release.
//
// One native difference worth knowing: unlike the DOM, a touch's responder is
// claimed by the innermost `Pressable`, so nesting one AppPressable inside
// another (e.g. a Button inside a tappable Card) does not also fire the
// outer one — the web version's `stopPropagation` prop has no RN equivalent
// to port because the problem it worked around doesn't exist here.
export function AppPressable({
    onPress,
    disabled,
    style,
    children,
    scaleTo = 0.97,
    opacityTo = 0.72,
    accessibilityLabel,
    hitSlop
}: {
    onPress?: () => void;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
    /** 1 disables the scale dip — right for full-bleed rows, wrong for buttons. */
    scaleTo?: number;
    opacityTo?: number;
    accessibilityLabel?: string;
    hitSlop?: number;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const animateTo = (toScale: number, toOpacity: number, duration: number) => {
        Animated.parallel([
            Animated.timing(scale, { toValue: toScale, duration, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true })
        ]).start();
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            hitSlop={hitSlop}
            accessibilityLabel={accessibilityLabel}
            onPressIn={() => animateTo(scaleTo, opacityTo, 60)}
            onPressOut={() => animateTo(1, 1, 160)}
            style={[{ opacity: disabled ? 0.45 : 1 }, style]}
        >
            <Animated.View style={{ transform: [{ scale }], opacity }}>{children}</Animated.View>
        </Pressable>
    );
}
