import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import type { ChatMessage } from "../../types";

// Ported from karamatch-web/src/screens/PartyRoom.tsx's inline chat bubble —
// a tail on the outer corner, the way both platforms' native bubbles are
// shaped, and the sender's name shown only on the first message of a run.
export function ChatBubble({ message, mine, showName }: { message: ChatMessage; mine: boolean; showName: boolean }) {
    const { C, R, S, T } = useTheme();

    return (
        <View style={{ alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
            {showName ? (
                <Text style={[T.footnote, { fontSize: 10, color: C.textFaint, paddingHorizontal: 8 }]}>
                    {mine ? "You" : message.from?.name ?? "Someone"}
                </Text>
            ) : null}
            <View
                style={{
                    maxWidth: "78%",
                    paddingVertical: 9,
                    paddingHorizontal: 13,
                    borderRadius: R.lg,
                    borderCurve: "continuous",
                    borderBottomRightRadius: mine ? 5 : R.lg,
                    borderBottomLeftRadius: mine ? R.lg : 5,
                    backgroundColor: mine ? C.tint : C.surface2,
                    borderWidth: 1,
                    borderColor: mine ? "transparent" : C.border
                }}
            >
                <Text style={[T.callout, { color: mine ? C.onTint : C.text }]}>{message.text}</Text>
            </View>
        </View>
    );
}

// Consecutive messages from one person only get a name once — a small
// selector so a screen doesn't need to re-derive this itself when mapping
// over a message list.
export function shouldShowChatName(messages: ChatMessage[], index: number) {
    return index === 0 || messages[index - 1].userId !== messages[index].userId;
}
