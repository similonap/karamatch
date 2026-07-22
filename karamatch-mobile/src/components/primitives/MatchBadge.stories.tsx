import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MatchBadge } from "./MatchBadge";

const meta: Meta<typeof MatchBadge> = {
    title: "Primitives/MatchBadge",
    component: MatchBadge,
    args: { pct: 78 }
};

export default meta;
type Story = StoryObj<typeof MatchBadge>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row" }}>
                <MatchBadge {...args} />
            </View>
        );
    }
};

export const AllValues: Story = {
    render: () => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", gap: S.sm }}>
                <MatchBadge pct={78} />
                <MatchBadge pct={34} />
                <MatchBadge pct={null} />
            </View>
        );
    }
};
