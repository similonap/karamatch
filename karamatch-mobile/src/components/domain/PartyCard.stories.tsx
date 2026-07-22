import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_MATCH_PARTY, MOCK_OPEN_PARTY, MOCK_PAST_PARTY } from "../../mocks/data";
import { PartyCard } from "./PartyCard";

const meta: Meta<typeof PartyCard> = {
    title: "Domain/PartyCard",
    component: PartyCard
};

export default meta;
type Story = StoryObj<typeof PartyCard>;

export const Open: Story = {
    render: () => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <PartyCard party={MOCK_OPEN_PARTY} variant="open" onJoin={() => {}} onHostPress={() => {}} />
            </View>
        );
    }
};

export const Match: Story = {
    render: () => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <PartyCard
                    party={MOCK_MATCH_PARTY}
                    variant="match"
                    matchPct={MOCK_MATCH_PARTY.matchPct}
                    commonSongs={MOCK_MATCH_PARTY.commonSongs}
                    onJoin={() => {}}
                    onHostPress={() => {}}
                />
            </View>
        );
    }
};

export const UpcomingAsHost: Story = {
    render: () => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <PartyCard party={MOCK_OPEN_PARTY} variant="upcoming" isHost onPress={() => {}} />
            </View>
        );
    }
};

export const UpcomingAsGuest: Story = {
    render: () => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <PartyCard party={MOCK_OPEN_PARTY} variant="upcoming" isHost={false} onPress={() => {}} onHostPress={() => {}} />
            </View>
        );
    }
};

export const Past: Story = {
    render: () => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <PartyCard
                    party={MOCK_PAST_PARTY}
                    variant="past"
                    rated={MOCK_PAST_PARTY.rated}
                    venueReviewed={MOCK_PAST_PARTY.venueReviewed}
                    onPress={() => {}}
                    onRateCrew={() => {}}
                    onReviewVenue={() => {}}
                />
            </View>
        );
    }
};
