import { Text } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/screens/Profile.tsx's inline theme-picker
// tile — an icon-over-label option, tinted when selected. Generic enough for
// any small icon+label choice; the web only ever used it for Dark/Light.
export function IconTile({
    icon,
    label,
    selected,
    onPress
}: {
    icon: IconName;
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    const { C, FONT, R, T } = useTheme();

    return (
        <AppPressable
            onPress={onPress}
            scaleTo={0.97}
            style={{
                flex: 1,
                height: 62,
                borderRadius: R.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: selected ? C.tintBorder : C.border,
                backgroundColor: selected ? C.tintBg : C.surface1,
                alignItems: "center",
                justifyContent: "center",
                gap: 4
            }}
        >
            <Icon name={icon} size={20} color={selected ? C.tintSoft : C.textDim} />
            <Text style={[T.footnote, { fontFamily: FONT.bodyBold, color: selected ? C.tintSoft : C.textDim }]}>{label}</Text>
        </AppPressable>
    );
}
