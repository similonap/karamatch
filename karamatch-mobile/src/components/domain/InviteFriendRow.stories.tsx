import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_MATCHED_USER } from "../../mocks/data";
import { InviteFriendRow } from "./InviteFriendRow";

const meta: Meta<typeof InviteFriendRow> = {
    title: "Domain/InviteFriendRow",
    component: InviteFriendRow,
    args: { friend: MOCK_MATCHED_USER }
};

export default meta;
type Story = StoryObj<typeof InviteFriendRow>;

export const Unselected: Story = {
    args: { selected: false },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <InviteFriendRow {...args} onToggle={() => {}} />
            </View>
        );
    }
};

export const Selected: Story = {
    args: { selected: true },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <InviteFriendRow {...args} onToggle={() => {}} />
            </View>
        );
    }
};

export const List: Story = {
    render: () => {
        const { C, S } = useTheme();
        const friends = [MOCK_MATCHED_USER, { ...MOCK_MATCHED_USER, id: 3, name: "Priya Nair", username: "priyanair", matchPct: 54 }];
        const [selected, setSelected] = useState<number[]>([]);
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.sm }}>
                {friends.map(friend => (
                    <InviteFriendRow
                        key={friend.id}
                        friend={friend}
                        selected={selected.includes(friend.id)}
                        onToggle={() =>
                            setSelected(current =>
                                current.includes(friend.id) ? current.filter(id => id !== friend.id) : [...current, friend.id]
                            )
                        }
                    />
                ))}
            </View>
        );
    }
};
