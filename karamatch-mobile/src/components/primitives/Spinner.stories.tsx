import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
    title: "Primitives/Spinner",
    component: Spinner,
    args: { size: 24 }
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, alignItems: "flex-start" }}>
                <Spinner {...args} />
            </View>
        );
    }
};
