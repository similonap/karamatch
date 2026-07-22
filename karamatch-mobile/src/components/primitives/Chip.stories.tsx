import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Chip } from "./Chip";

const meta: Meta<typeof Chip> = {
    title: "Primitives/Chip",
    component: Chip,
    argTypes: {
        tone: { control: "select", options: ["neutral", "tint", "cyan", "gold", "green"] },
        icon: { control: "select", options: [undefined, "music", "check", "star"] }
    },
    args: { label: "2 spots", tone: "cyan", selected: false }
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row" }}>
                <Chip {...args} />
            </View>
        );
    }
};

export const AllTones: Story = {
    render: args => {
        const { C, S } = useTheme();
        const tones = ["neutral", "tint", "cyan", "gold", "green"] as const;
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
                {tones.map(tone => (
                    <Chip key={tone} {...args} tone={tone} label={tone} />
                ))}
            </View>
        );
    }
};
