import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_VENUE } from "../../mocks/data";
import { VenueCard } from "./VenueCard";

const meta: Meta<typeof VenueCard> = {
    title: "Domain/VenueCard",
    component: VenueCard,
    args: { venue: MOCK_VENUE }
};

export default meta;
type Story = StoryObj<typeof VenueCard>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <VenueCard {...args} onPress={() => {}} />
            </View>
        );
    }
};

export const Unrated: Story = {
    args: { venue: { ...MOCK_VENUE, reviewsCount: 0 } }
};
