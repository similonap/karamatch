import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Loading } from "./Loading";

const meta: Meta<typeof Loading> = {
    title: "Primitives/Loading",
    component: Loading,
    args: { label: "Finding venues near you…" }
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ height: 240, backgroundColor: C.surface }}>
                <Loading {...args} />
            </View>
        );
    }
};
