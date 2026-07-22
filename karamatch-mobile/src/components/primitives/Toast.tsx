import { Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";

// Ported from karamatch-web/src/ui.tsx's `Toast`. The web version was a
// hand-rolled absolutely-positioned overlay; RN uses a real, transparent,
// fade `<Modal>` instead, which is why this needs an explicit `visible`.
export function Toast({ message, visible = true }: { message: string; visible?: boolean }) {
    const { C, LAYOUT, R, S, SHADOW, T } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View
                pointerEvents="none"
                style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    paddingHorizontal: LAYOUT.gutter,
                    paddingBottom: insets.bottom + LAYOUT.tabBar + S.md
                }}
            >
                <View
                    accessibilityRole="alert"
                    style={{
                        backgroundColor: C.surface3,
                        borderWidth: 1,
                        borderColor: C.borderStrong,
                        borderRadius: R.md,
                        borderCurve: "continuous",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        boxShadow: SHADOW.e2
                    }}
                >
                    <Text style={[T.caption, { color: C.text, textAlign: "center" }]}>{message}</Text>
                </View>
            </View>
        </Modal>
    );
}
