import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { BrandMark } from "./BrandMark";

const meta: Meta<typeof BrandMark> = {
    title: "Primitives/BrandMark",
    component: BrandMark,
    args: { size: 72 }
};

export default meta;
type Story = StoryObj<typeof BrandMark>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <BrandMark {...args} />
            </View>
        );
    }
};
