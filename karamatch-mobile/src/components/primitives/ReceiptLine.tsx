import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/screens/VenueDetail.tsx's inline `Line` — a
// receipt-style label/value row for the booking screen's price breakdown.
export function ReceiptLine({
    label,
    value,
    strong,
    accent
}: {
    label: string;
    value: string;
    strong?: boolean;
    accent?: boolean;
}) {
    const { C, S, T } = useTheme();

    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: S.sm }}>
            <Text style={[T.caption, { color: C.textMuted, flexShrink: 1 }]}>{label}</Text>
            <Text style={[strong ? T.bodyStrong : T.captionStrong, { color: accent ? C.cyan : C.text, flexShrink: 0 }]}>{value}</Text>
        </View>
    );
}
