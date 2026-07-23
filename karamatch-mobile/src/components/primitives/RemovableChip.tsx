import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/screens/Profile.tsx's inline "picked song"
// chip — a fully tappable pill (not just its close icon) that removes the
// item, used for favourites already added before they're searchable again.
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    const { C, R, T } = useTheme();

    return (
        <AppPressable onPress={onRemove} accessibilityLabel={"Remove " + label} scaleTo={0.95}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: C.tintBg,
                    borderWidth: 1,
                    borderColor: C.tintBorder,
                    borderRadius: R.full,
                    paddingVertical: 5,
                    paddingLeft: 11,
                    paddingRight: 8
                }}
            >
                <Text style={[T.footnote, { fontSize: 12, color: C.tintSoft }]} numberOfLines={1}>
                    {label}
                </Text>
                <Icon name="close" size={13} strokeWidth={2.4} color={C.tintSoft} />
            </View>
        </AppPressable>
    );
}
