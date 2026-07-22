import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarIcon } from "../../icons/StarIcon";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `StarInput` — a tappable 1-5 star
// input, each star with a full-size touch target.
export function StarInput({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
    const { C, LAYOUT } = useTheme();
    return (
        <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel="Star rating">
            {[1, 2, 3, 4, 5].map(star => {
                const on = star <= value;
                return (
                    <AppPressable
                        key={star}
                        onPress={() => onChange(star)}
                        accessibilityLabel={star + (star === 1 ? " star" : " stars")}
                        scaleTo={0.85}
                        style={{
                            width: LAYOUT.touch,
                            height: LAYOUT.touch,
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <StarIcon size={26} filled={on} color={on ? C.gold : C.surface3} />
                    </AppPressable>
                );
            })}
        </View>
    );
}
