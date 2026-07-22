import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AvatarStack } from "./AvatarStack";

const PEOPLE = [
    { id: 1, name: "Mara Voss" },
    { id: 2, name: "Theo Lindqvist" },
    { id: 3, name: "Priya Nandan" },
    { id: 4, name: "Owen Bright" },
    { id: 5, name: "Sana Idris" },
    { id: 6, name: "Kofi Mensah" }
];

const meta: Meta<typeof AvatarStack> = {
    title: "Primitives/AvatarStack",
    component: AvatarStack,
    args: { people: PEOPLE, max: 4, size: 28 }
};

export default meta;
type Story = StoryObj<typeof AvatarStack>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <AvatarStack {...args} />
            </View>
        );
    }
};
