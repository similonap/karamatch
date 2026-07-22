import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Chip } from "./Chip";
import { ListRow } from "./ListRow";

const meta: Meta<typeof ListRow> = {
    title: "Primitives/ListRow",
    component: ListRow,
    argTypes: { onPress: { action: "pressed" } },
    args: {
        icon: "calendar",
        title: "Friday night session",
        subtitle: "Neon Nights · 21:00",
        chevron: true,
        danger: false,
        last: true
    }
};

export default meta;
type Story = StoryObj<typeof ListRow>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface1 }}>
                <ListRow {...args} />
            </View>
        );
    }
};

export const WithTrailing: Story = {
    args: { chevron: false },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface1 }}>
                <ListRow {...args} trailing={<Chip label="2 spots" tone="cyan" />} />
            </View>
        );
    }
};

export const Danger: Story = {
    args: { icon: "trash", title: "Delete account", subtitle: undefined, danger: true }
};
