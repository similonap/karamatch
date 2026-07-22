import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_CHAT_MESSAGE, MOCK_USER } from "../../mocks/data";
import { ChatBubble } from "./ChatBubble";

const meta: Meta<typeof ChatBubble> = {
    title: "Domain/ChatBubble",
    component: ChatBubble,
    args: { message: MOCK_CHAT_MESSAGE, mine: false, showName: true }
};

export default meta;
type Story = StoryObj<typeof ChatBubble>;

export const Theirs: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <ChatBubble {...args} />
            </View>
        );
    }
};

export const Mine: Story = {
    args: { message: { ...MOCK_CHAT_MESSAGE, userId: MOCK_USER.id, from: MOCK_USER, text: "Sounds good, see you there!" }, mine: true }
};

export const Conversation: Story = {
    render: () => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.xs }}>
                <ChatBubble message={MOCK_CHAT_MESSAGE} mine={false} showName />
                <ChatBubble
                    message={{ ...MOCK_CHAT_MESSAGE, id: "m2", text: "Perfect, I'll bring the setlist." }}
                    mine={false}
                    showName={false}
                />
                <ChatBubble
                    message={{ ...MOCK_CHAT_MESSAGE, id: "m3", userId: MOCK_USER.id, from: MOCK_USER, text: "See you at 9!" }}
                    mine
                    showName
                />
            </View>
        );
    }
};
