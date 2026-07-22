import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_VENUE_REVIEW } from "../../mocks/data";
import { ReviewCard } from "./ReviewCard";

const meta: Meta<typeof ReviewCard> = {
    title: "Domain/ReviewCard",
    component: ReviewCard,
    args: { review: MOCK_VENUE_REVIEW }
};

export default meta;
type Story = StoryObj<typeof ReviewCard>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <ReviewCard {...args} />
            </View>
        );
    }
};

export const Anonymous: Story = {
    args: { review: { ...MOCK_VENUE_REVIEW, from: null, text: "" } }
};
