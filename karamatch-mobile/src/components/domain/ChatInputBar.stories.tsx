import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { ChatInputBar } from "./ChatInputBar";

const meta: Meta<typeof ChatInputBar> = {
    title: "Domain/ChatInputBar",
    component: ChatInputBar
};

export default meta;
type Story = StoryObj<typeof ChatInputBar>;

export const Default: Story = {
    render: () => {
        const { C } = useTheme();
        const [value, setValue] = useState("");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <ChatInputBar value={value} onChangeText={setValue} onSend={() => setValue("")} />
            </View>
        );
    }
};

export const WithDraft: Story = {
    render: () => {
        const { C } = useTheme();
        const [value, setValue] = useState("See everyone at 9?");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <ChatInputBar value={value} onChangeText={setValue} onSend={() => setValue("")} />
            </View>
        );
    }
};
