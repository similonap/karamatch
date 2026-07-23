import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_PARTY_HOST_MEMBER, MOCK_PARTY_ROOM_MEMBER } from "../../mocks/data";
import { CrewMemberChip, InvitedMemberChip } from "./CrewMemberChip";

const meta: Meta<typeof CrewMemberChip> = {
    title: "Domain/CrewMemberChip",
    component: CrewMemberChip,
    argTypes: { onPress: { action: "opened" } }
};

export default meta;
type Story = StoryObj<typeof CrewMemberChip>;

export const Crew: Story = {
    render: () => {
        const { C, S2 } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", flexWrap: "wrap", gap: S2.s6 }}>
                <CrewMemberChip member={MOCK_PARTY_HOST_MEMBER} isMe={false} onPress={() => {}} />
                <CrewMemberChip member={MOCK_PARTY_ROOM_MEMBER} isMe={false} onPress={() => {}} />
                <CrewMemberChip member={{ ...MOCK_PARTY_ROOM_MEMBER, id: 9, paid: true }} isMe onPress={() => {}} />
                <InvitedMemberChip username="joniferrer" />
            </View>
        );
    }
};
