import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Group } from "./Group";
import { ListRow } from "./ListRow";

const meta: Meta<typeof Group> = {
    title: "Primitives/Group",
    component: Group,
    args: { title: "Account" }
};

export default meta;
type Story = StoryObj<typeof Group>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Group {...args}>
                    <ListRow icon="pencil" title="Edit profile" chevron onPress={() => {}} />
                    <ListRow icon="bell" title="Notifications" chevron onPress={() => {}} />
                    <ListRow icon="logout" title="Log out" danger last onPress={() => {}} />
                </Group>
            </View>
        );
    }
};
