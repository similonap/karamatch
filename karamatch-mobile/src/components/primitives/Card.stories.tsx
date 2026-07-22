import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
    title: "Primitives/Card",
    component: Card,
    argTypes: { onPress: { action: "pressed" } },
    args: { padded: true, highlight: false }
};

export default meta;
type Story = StoryObj<typeof Card>;

function CardBody() {
    const { C, T } = useTheme();
    return (
        <View>
            <Text style={[T.bodyStrong, { color: C.text }]}>Neon Nights Karaoke</Text>
            <Text style={[T.caption, { color: C.textMuted, marginTop: 2 }]}>0.8 km away · Open until 02:00</Text>
        </View>
    );
}

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Card {...args}>
                    <CardBody />
                </Card>
            </View>
        );
    }
};

export const Highlighted: Story = {
    args: { highlight: true },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Card {...args}>
                    <CardBody />
                </Card>
            </View>
        );
    }
};

export const Tappable: Story = {
    args: { onPress: () => {} },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Card {...args}>
                    <CardBody />
                </Card>
            </View>
        );
    }
};
