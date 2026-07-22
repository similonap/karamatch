import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Divider } from "./Divider";

const meta: Meta<typeof Divider> = {
    title: "Primitives/Divider",
    component: Divider
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Default: Story = {
    render: () => {
        const { C, S, T } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.md }}>
                <Text style={[T.body, { color: C.text }]}>Above</Text>
                <Divider />
                <Text style={[T.body, { color: C.text }]}>Below</Text>
            </View>
        );
    }
};
