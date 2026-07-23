import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { RemovableChip } from "./RemovableChip";

const meta: Meta<typeof RemovableChip> = {
    title: "Primitives/RemovableChip",
    component: RemovableChip,
    argTypes: { onRemove: { action: "removed" } },
    args: { label: "Mr. Brightside" }
};

export default meta;
type Story = StoryObj<typeof RemovableChip>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <RemovableChip {...args} />
            </View>
        );
    }
};

export const Row: Story = {
    render: () => {
        const { C, S2 } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", flexWrap: "wrap", gap: S2.s6 }}>
                <RemovableChip label="Mr. Brightside" onRemove={() => {}} />
                <RemovableChip label="Since U Been Gone" onRemove={() => {}} />
                <RemovableChip label="Take On Me" onRemove={() => {}} />
            </View>
        );
    }
};
