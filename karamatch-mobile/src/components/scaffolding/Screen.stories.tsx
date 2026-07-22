import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../primitives/Card";
import { ListRow } from "../primitives/ListRow";
import { Screen } from "./Screen";

const meta: Meta<typeof Screen> = {
    title: "Scaffolding/Screen",
    component: Screen,
    args: { pad: true }
};

export default meta;
type Story = StoryObj<typeof Screen>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ height: 420, backgroundColor: C.surface }}>
                <Screen {...args}>
                    {Array.from({ length: 6 }, (_, index) => (
                        <Card key={index}>
                            <ListRow title={"Row " + (index + 1)} subtitle="Scrollable screen content" last />
                        </Card>
                    ))}
                </Screen>
            </View>
        );
    }
};
