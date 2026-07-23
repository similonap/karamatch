import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AvatarPicker } from "./AvatarPicker";

const meta: Meta<typeof AvatarPicker> = {
    title: "Primitives/AvatarPicker",
    component: AvatarPicker,
    argTypes: { onPress: { action: "pressed" } },
    args: { size: 96 }
};

export default meta;
type Story = StoryObj<typeof AvatarPicker>;

export const NoPhoto: Story = {
    args: { photoUrl: null },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <AvatarPicker {...args} />
            </View>
        );
    }
};

export const WithPhoto: Story = {
    args: { photoUrl: "https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd/829521842-250.jpg" },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <AvatarPicker {...args} />
            </View>
        );
    }
};
