import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Stepper } from "./Stepper";

const meta: Meta<typeof Stepper> = {
    title: "Primitives/Stepper",
    component: Stepper,
    args: { min: 1, max: 6, suffix: "spots" }
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        const [value, setValue] = useState(2);
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Stepper {...args} value={value} onChange={setValue} />
            </View>
        );
    }
};
