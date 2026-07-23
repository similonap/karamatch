import { TextInput, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { AppPressable } from "../primitives/AppPressable";

// Ported from karamatch-web/src/screens/PartyRoom.tsx's inline chat composer
// — a pill text field plus a circular send button that tints once there's a
// draft to send.
export function ChatInputBar({
    value,
    onChangeText,
    onSend,
    placeholder = "Message the party…"
}: {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    placeholder?: string;
}) {
    const { C, R, S, T } = useTheme();
    const canSend = value.trim().length > 0;

    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={onSend}
                placeholder={placeholder}
                placeholderTextColor={C.textFaint}
                style={[
                    T.body,
                    {
                        flex: 1,
                        height: 44,
                        borderRadius: R.full,
                        borderCurve: "continuous",
                        borderWidth: 1,
                        borderColor: C.border,
                        backgroundColor: C.surface2,
                        color: C.text,
                        paddingHorizontal: 16
                    }
                ]}
            />
            <AppPressable
                onPress={onSend}
                disabled={!canSend}
                accessibilityLabel="Send message"
                scaleTo={0.9}
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: canSend ? C.tint : C.surface3
                }}
            >
                <Icon name="send" size={19} color={canSend ? C.onTint : C.textFaint} />
            </AppPressable>
        </View>
    );
}
