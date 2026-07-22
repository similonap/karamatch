import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { IconButton } from "./IconButton";

const meta: Meta<typeof IconButton> = {
    title: "Primitives/IconButton",
    component: IconButton,
    argTypes: {
        onPress: { action: "pressed" },
        tone: { control: "select", options: ["plain", "filled"] }
    },
    args: { icon: "bell", label: "Notifications", tone: "filled", badge: 3 }
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <IconButton {...args} />
            </View>
        );
    }
};
