import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Divider`.
export function Divider() {
    const { C } = useTheme();
    return <View style={{ height: 1, backgroundColor: C.border }} />;
}
