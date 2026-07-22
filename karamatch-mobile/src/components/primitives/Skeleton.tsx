import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Skeleton` — placeholder blocks
// that hold a list's shape while it loads. The web version pulsed opacity
// with a staggered CSS animation; RN loops the same pulse per block with
// `Animated`, delayed by the same 120ms step.
function SkeletonBlock({ height, radius, delay, color }: { height: number; radius: number; delay: number; color: string }) {
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [delay, opacity]);

    return (
        <Animated.View
            style={{ height, borderRadius: radius, borderCurve: "continuous", backgroundColor: color, opacity }}
        />
    );
}

// Renders as a Fragment, like the web version, so it drops straight into a
// parent that lays its children out with `gap` (e.g. Screen's ScrollView).
export function Skeleton({ height = 76, radius, count = 3 }: { height?: number; radius?: number; count?: number }) {
    const { C, R } = useTheme();
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <SkeletonBlock key={index} height={height} radius={radius ?? R.lg} delay={index * 120} color={C.skeleton} />
            ))}
        </>
    );
}
