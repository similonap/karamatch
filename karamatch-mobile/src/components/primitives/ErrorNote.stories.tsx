import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { ErrorNote } from "./ErrorNote";

const meta: Meta<typeof ErrorNote> = {
    title: "Primitives/ErrorNote",
    component: ErrorNote,
    args: { message: "Couldn't load venues. Check your connection and try again." }
};

export default meta;
type Story = StoryObj<typeof ErrorNote>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <ErrorNote {...args} />
            </View>
        );
    }
};
