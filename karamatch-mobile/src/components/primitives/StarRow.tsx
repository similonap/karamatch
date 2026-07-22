import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarIcon } from "../../icons/StarIcon";

// Ported from karamatch-web/src/ui.tsx's `StarRow` — five small stars filled
// to `value`, the read-only twin of StarInput.
export function StarRow({ value, size = 13 }: { value: number; size?: number }) {
    const { C } = useTheme();
    return (
        <View style={{ flexDirection: "row", gap: 1 }} accessibilityLabel={value + " out of 5 stars"}>
            {[1, 2, 3, 4, 5].map(star => (
                <StarIcon key={star} size={size} color={star <= value ? C.gold : C.surface3} />
            ))}
        </View>
    );
}
