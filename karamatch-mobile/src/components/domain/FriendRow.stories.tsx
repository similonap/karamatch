import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_MATCHED_USER } from "../../mocks/data";
import { FriendRow } from "./FriendRow";
import { Group } from "../primitives/Group";

const meta: Meta<typeof FriendRow> = {
    title: "Domain/FriendRow",
    component: FriendRow,
    argTypes: { onPress: { action: "pressed" }, onAdd: { action: "add" } },
    args: { person: MOCK_MATCHED_USER, last: true }
};

export default meta;
type Story = StoryObj<typeof FriendRow>;

export const Friend: Story = {
    args: { variant: "friend" },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Group title="1 friend">
                    <FriendRow {...args} />
                </Group>
            </View>
        );
    }
};

export const Suggestion: Story = {
    args: { variant: "suggestion" },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Group title="1 found">
                    <FriendRow {...args} />
                </Group>
            </View>
        );
    }
};
