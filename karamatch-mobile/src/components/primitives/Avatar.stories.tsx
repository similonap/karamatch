import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
    title: "Primitives/Avatar",
    component: Avatar,
    args: { name: "Mara Voss", size: 48, ring: false }
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Initial: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Avatar {...args} />
            </View>
        );
    }
};

export const Ringed: Story = {
    args: { ring: true }
};

export const Sizes: Story = {
    render: args => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", alignItems: "center", gap: S.sm }}>
                <Avatar {...args} size={24} />
                <Avatar {...args} size={40} />
                <Avatar {...args} size={64} />
            </View>
        );
    }
};
