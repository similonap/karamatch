import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_VENUE } from "../../mocks/data";
import { RoomOptionRow } from "./RoomOptionRow";

const meta: Meta<typeof RoomOptionRow> = {
    title: "Domain/RoomOptionRow",
    component: RoomOptionRow,
    args: { room: MOCK_VENUE.rooms[0] }
};

export default meta;
type Story = StoryObj<typeof RoomOptionRow>;

export const Unselected: Story = {
    args: { selected: false },
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <RoomOptionRow {...args} onPress={() => {}} />
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
                <RoomOptionRow {...args} onPress={() => {}} />
            </View>
        );
    }
};

export const RoomList: Story = {
    render: () => {
        const { C, S } = useTheme();
        const rooms = [
            MOCK_VENUE.rooms[0],
            { ...MOCK_VENUE.rooms[0], id: "r2", name: "The Velvet Room", seats: 10, pricePerHour: 90 }
        ];
        const [roomId, setRoomId] = useState(rooms[0].id);
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.sm }}>
                {rooms.map(room => (
                    <RoomOptionRow key={room.id} room={room} selected={roomId === room.id} onPress={() => setRoomId(room.id)} />
                ))}
            </View>
        );
    }
};
