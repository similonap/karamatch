import { useEffect, useRef } from "react";
import { Animated } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `Toggle` — one switch geometry for
// both platforms, per the identical-design brief. The web version animated
// the thumb's `left` with a CSS transition; RN animates the same distance as
// a `translateX` on the native driver instead.
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
    const { C, R, SHADOW } = useTheme();
    const progress = useRef(new Animated.Value(on ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(progress, { toValue: on ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    }, [on, progress]);

    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 19] });

    return (
        <AppPressable
            onPress={() => onChange(!on)}
            accessibilityLabel={label}
            scaleTo={1}
            opacityTo={0.8}
            style={{
                width: 46,
                height: 28,
                borderRadius: R.full,
                borderCurve: "continuous",
                backgroundColor: on ? C.green : C.surface3,
                borderWidth: on ? 0 : 1,
                borderColor: C.border
            }}
        >
            <Animated.View
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "#fff",
                    position: "absolute",
                    top: 2,
                    left: 2,
                    boxShadow: SHADOW.e1,
                    transform: [{ translateX }]
                }}
            />
        </AppPressable>
    );
}
