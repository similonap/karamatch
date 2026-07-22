import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Spinner`. The web version drew an
// arc with `border-top-color` on a circle and spun it with a CSS animation —
// RN `View` borders support the same per-edge colouring, so the trick ports
// directly; only the animation driver changes, to `Animated` + native driver.
export function Spinner({ size = 24, color }: { size?: number; color?: string }) {
    const { C } = useTheme();
    const tint = color ?? C.tint;
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rotation, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, [rotation]);

    const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
    const border = Math.max(2, Math.round(size / 12));

    return (
        <Animated.View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: border,
                borderColor: C.border,
                borderTopColor: tint,
                transform: [{ rotate: spin }]
            }}
        />
    );
}
