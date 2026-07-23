import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { money } from "../../utils/format";
import type { Room } from "../../types";
import { AppPressable } from "../primitives/AppPressable";

// Ported from karamatch-web/src/screens/VenueDetail.tsx's inline room-picker
// row — name and seat count on the left, price/hr on the right, tinted when
// selected.
export function RoomOptionRow({ room, selected, onPress }: { room: Room; selected: boolean; onPress: () => void }) {
    const { C, R, S, T } = useTheme();

    return (
        <AppPressable
            onPress={onPress}
            scaleTo={0.99}
            opacityTo={0.8}
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: S.sm,
                minHeight: 58,
                paddingHorizontal: S.md,
                borderRadius: R.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: selected ? C.tintBorder : C.border,
                backgroundColor: selected ? C.tintBg : C.surface1
            }}
        >
            <View style={{ minWidth: 0 }}>
                <Text style={[T.bodyStrong, { color: C.text }]}>{room.name}</Text>
                <Text style={[T.footnote, { color: C.textMuted }]}>{room.seats} seats</Text>
            </View>
            <Text style={[T.captionStrong, { color: C.cyan, flexShrink: 0 }]}>{money(room.pricePerHour)}/hr</Text>
        </AppPressable>
    );
}
