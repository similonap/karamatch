import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { IconButton } from "../primitives/IconButton";
import { AppBar } from "./AppBar";

const meta: Meta<typeof AppBar> = {
    title: "Scaffolding/AppBar",
    component: AppBar,
    args: { title: "Venue detail", large: false, bordered: true }
};

export default meta;
type Story = StoryObj<typeof AppBar>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ backgroundColor: C.surface }}>
                <AppBar {...args} onBack={() => {}} right={<IconButton icon="share" label="Share" onPress={() => {}} />} />
            </View>
        );
    }
};

export const Large: Story = {
    args: { title: "My parties", large: true, subtitle: "2 upcoming, 5 past" },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ backgroundColor: C.surface }}>
                <AppBar {...args} />
            </View>
        );
    }
};
