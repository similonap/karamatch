import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Toggle } from "./Toggle";

const meta: Meta<typeof Toggle> = {
    title: "Primitives/Toggle",
    component: Toggle,
    args: { label: "Open to public", on: false }
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        const [on, setOn] = useState(args.on);
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Toggle {...args} on={on} onChange={setOn} />
            </View>
        );
    }
};
