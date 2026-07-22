import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
    title: "Primitives/Skeleton",
    component: Skeleton,
    args: { height: 76, count: 3 }
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
    render: args => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.sm }}>
                <Skeleton {...args} />
            </View>
        );
    }
};
