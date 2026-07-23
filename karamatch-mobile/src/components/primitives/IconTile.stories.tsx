import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { IconTile } from "./IconTile";

const meta: Meta<typeof IconTile> = {
    title: "Primitives/IconTile",
    component: IconTile,
    args: { icon: "moon", label: "Dark", selected: true }
};

export default meta;
type Story = StoryObj<typeof IconTile>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, width: 140 }}>
                <IconTile {...args} onPress={() => {}} />
            </View>
        );
    }
};

// The web screen's actual usage: a Dark/Light theme picker, two tiles wide.
export const ThemePicker: Story = {
    render: () => {
        const { C, S } = useTheme();
        const [theme, setTheme] = useState<"dark" | "light">("dark");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", gap: S.sm }}>
                <IconTile icon="moon" label="Dark" selected={theme === "dark"} onPress={() => setTheme("dark")} />
                <IconTile icon="sun" label="Light" selected={theme === "light"} onPress={() => setTheme("light")} />
            </View>
        );
    }
};
