import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { StarIcon } from "./StarIcon";

const meta: Meta<typeof StarIcon> = {
    title: "Icons/StarIcon",
    component: StarIcon,
    args: { size: 28, filled: true }
};

export default meta;
type Story = StoryObj<typeof StarIcon>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <StarIcon {...args} color={C.gold} />
            </View>
        );
    }
};

export const FilledVsOutline: Story = {
    render: () => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", gap: S.md }}>
                <StarIcon size={28} filled color={C.gold} />
                <StarIcon size={28} filled={false} color={C.surface3} />
            </View>
        );
    }
};
