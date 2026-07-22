import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";

// Ported from karamatch-web/src/ui.tsx's `ErrorNote`.
export function ErrorNote({ message }: { message: string }) {
    const { C, R, S, T } = useTheme();
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: S.sm,
                backgroundColor: C.tintBg,
                borderWidth: 1,
                borderColor: C.tintBorder,
                borderRadius: R.md,
                borderCurve: "continuous",
                paddingVertical: 10,
                paddingHorizontal: 14
            }}
        >
            <Icon name="info" size={16} color={C.tintSoft} />
            <Text style={[T.caption, { flex: 1, color: C.tintSoft }]}>{message}</Text>
        </View>
    );
}
