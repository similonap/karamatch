import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarInput } from "./StarInput";

const meta: Meta<typeof StarInput> = {
    title: "Primitives/StarInput",
    component: StarInput
};

export default meta;
type Story = StoryObj<typeof StarInput>;

export const Default: Story = {
    render: () => {
        const { C } = useTheme();
        const [value, setValue] = useState(3);
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <StarInput value={value} onChange={setValue} />
            </View>
        );
    }
};
