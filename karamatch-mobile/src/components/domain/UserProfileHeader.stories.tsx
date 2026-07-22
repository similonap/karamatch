import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_USER_PROFILE } from "../../mocks/data";
import { UserProfileHeader } from "./UserProfileHeader";

const meta: Meta<typeof UserProfileHeader> = {
    title: "Domain/UserProfileHeader",
    component: UserProfileHeader,
    args: { user: MOCK_USER_PROFILE }
};

export default meta;
type Story = StoryObj<typeof UserProfileHeader>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <UserProfileHeader {...args} />
            </View>
        );
    }
};

export const SelfProfile: Story = {
    args: { user: { ...MOCK_USER_PROFILE, isSelf: true, matchPct: null } }
};
