import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./Icon";
import type { IconName } from "./types";

const ALL_ICONS: IconName[] = [
    "pin", "mic", "spark", "users", "calendar", "bell", "star", "check", "close",
    "chevronLeft", "chevronRight", "chevronDown", "search", "plus", "minus", "camera",
    "send", "sun", "moon", "logout", "crown", "music", "locate", "pencil", "clock",
    "card", "userPlus", "trash", "heart", "info", "share", "sliders"
];

const meta: Meta<typeof Icon> = {
    title: "Icons/Icon",
    component: Icon,
    argTypes: { name: { control: "select", options: ALL_ICONS } },
    args: { name: "mic", size: 28, strokeWidth: 1.75, solid: false }
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Icon {...args} color={C.text} />
            </View>
        );
    }
};

export const AllIcons: Story = {
    render: () => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", flexWrap: "wrap", gap: S.md }}>
                {ALL_ICONS.map(name => (
                    <View key={name} style={{ width: 64, alignItems: "center", gap: 4 }}>
                        <Icon name={name} size={24} color={C.text} />
                        <Text style={{ color: C.textMuted, fontSize: 9 }}>{name}</Text>
                    </View>
                ))}
            </View>
        );
    }
};
