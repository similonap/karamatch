import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StepHeader } from "./StepHeader";

const meta: Meta<typeof StepHeader> = {
    title: "Primitives/StepHeader",
    component: StepHeader,
    args: { step: 2, total: 3, title: "Pick your songs", subtitle: "Add at least three favourites to get matched." }
};

export default meta;
type Story = StoryObj<typeof StepHeader>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <StepHeader {...args} />
            </View>
        );
    }
};
