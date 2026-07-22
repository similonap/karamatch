import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_INVITE_NOTIFICATION, MOCK_REVIEW_NOTIFICATION } from "../../mocks/data";
import { NotificationRow } from "./NotificationRow";

const meta: Meta<typeof NotificationRow> = {
    title: "Domain/NotificationRow",
    component: NotificationRow,
    argTypes: {
        onOpen: { action: "opened" },
        onPrimary: { action: "primary" },
        onDismiss: { action: "dismissed" }
    },
    args: { busy: false }
};

export default meta;
type Story = StoryObj<typeof NotificationRow>;

export const Invite: Story = {
    args: { notification: MOCK_INVITE_NOTIFICATION },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <NotificationRow {...args} />
            </View>
        );
    }
};

export const Review: Story = {
    args: { notification: MOCK_REVIEW_NOTIFICATION },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <NotificationRow {...args} />
            </View>
        );
    }
};
