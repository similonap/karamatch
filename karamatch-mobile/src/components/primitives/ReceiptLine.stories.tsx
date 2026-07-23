import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "./Card";
import { ReceiptLine } from "./ReceiptLine";

const meta: Meta<typeof ReceiptLine> = {
    title: "Primitives/ReceiptLine",
    component: ReceiptLine,
    args: { label: "Per seat", value: "€12 / person", strong: false, accent: false }
};

export default meta;
type Story = StoryObj<typeof ReceiptLine>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <ReceiptLine {...args} />
            </View>
        );
    }
};

export const PriceBreakdown: Story = {
    render: () => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Card style={{ gap: S.sm }}>
                    <ReceiptLine label="1h · The Neon Room" value="€60" strong />
                    <ReceiptLine label="Per seat" value="€12 / person" accent />
                    <ReceiptLine label="Your part if all 3 fill" value="€24" accent />
                </Card>
            </View>
        );
    }
};
