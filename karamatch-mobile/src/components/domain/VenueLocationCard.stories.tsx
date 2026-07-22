import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { VenueLocationCard } from "./VenueLocationCard";

const meta: Meta<typeof VenueLocationCard> = {
    title: "Domain/VenueLocationCard",
    component: VenueLocationCard,
    args: { name: "Neon Nights Karaoke", lat: 52.37, lng: 4.9, height: 132 }
};

export default meta;
type Story = StoryObj<typeof VenueLocationCard>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <VenueLocationCard {...args} />
            </View>
        );
    }
};
