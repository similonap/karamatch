import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Rating } from "./Rating";

const meta: Meta<typeof Rating> = {
    title: "Primitives/Rating",
    component: Rating,
    args: { value: 4.6, showValue: true }
};

export default meta;
type Story = StoryObj<typeof Rating>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Rating {...args} />
            </View>
        );
    }
};
