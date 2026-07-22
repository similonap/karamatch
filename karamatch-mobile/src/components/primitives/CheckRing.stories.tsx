import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { CheckRing } from "./CheckRing";

const meta: Meta<typeof CheckRing> = {
    title: "Primitives/CheckRing",
    component: CheckRing,
    args: { on: true, size: 22 }
};

export default meta;
type Story = StoryObj<typeof CheckRing>;

export const Default: Story = {
    render: args => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", gap: S.sm }}>
                <CheckRing {...args} on={false} />
                <CheckRing {...args} on={true} />
            </View>
        );
    }
};
