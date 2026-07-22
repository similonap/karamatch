import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
    title: "Primitives/EmptyState",
    component: EmptyState,
    argTypes: { icon: { control: "select", options: ["mic", "calendar", "info", "clock"] } },
    args: {
        icon: "mic",
        title: "No open parties nearby",
        body: "Nobody has a free spot right now. You could book a room yourself."
    }
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ backgroundColor: C.surface }}>
                <EmptyState {...args} />
            </View>
        );
    }
};

export const WithAction: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ backgroundColor: C.surface }}>
                <EmptyState {...args} action={<Button label="Browse venues" variant="tinted" size="md" onPress={() => {}} />} />
            </View>
        );
    }
};
