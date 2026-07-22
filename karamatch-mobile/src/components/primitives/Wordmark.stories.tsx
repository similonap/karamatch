import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Wordmark } from "./Wordmark";

const meta: Meta<typeof Wordmark> = {
    title: "Primitives/Wordmark",
    component: Wordmark,
    args: { size: 24 }
};

export default meta;
type Story = StoryObj<typeof Wordmark>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Wordmark {...args} />
            </View>
        );
    }
};
