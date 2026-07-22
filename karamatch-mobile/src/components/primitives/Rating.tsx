import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarIcon } from "../../icons/StarIcon";

// Ported from karamatch-web/src/ui.tsx's `Rating` — a single star + number.
export function Rating({ value, size = 13, showValue = true }: { value: number; size?: number; showValue?: boolean }) {
    const { C, T } = useTheme();
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <StarIcon size={size} color={C.gold} />
            {showValue ? <Text style={[T.footnote, { fontSize: 12, color: C.gold }]}>{value.toFixed(1)}</Text> : null}
        </View>
    );
}
