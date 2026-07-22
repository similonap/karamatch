import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { TextField } from "./TextField";

const meta: Meta<typeof TextField> = {
    title: "Primitives/TextField",
    component: TextField,
    argTypes: { type: { control: "select", options: ["text", "password", "email"] } },
    args: { label: "Bio", placeholder: "Tell other singers about yourself", type: "text", multiline: false }
};

export default meta;
type Story = StoryObj<typeof TextField>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        const [value, setValue] = useState("");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <TextField {...args} value={value} onChange={setValue} />
            </View>
        );
    }
};

export const Multiline: Story = {
    args: { multiline: true, label: "About you" },
    render: args => {
        const { C } = useTheme();
        const [value, setValue] = useState("");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <TextField {...args} value={value} onChange={setValue} />
            </View>
        );
    }
};
