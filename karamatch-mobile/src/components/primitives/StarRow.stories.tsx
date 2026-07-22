import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarRow } from "./StarRow";

const meta: Meta<typeof StarRow> = {
    title: "Primitives/StarRow",
    component: StarRow,
    args: { value: 4 }
};

export default meta;
type Story = StoryObj<typeof StarRow>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <StarRow {...args} />
            </View>
        );
    }
};
