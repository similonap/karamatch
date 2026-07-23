import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { MOCK_CREW_MEMBER } from "../../mocks/data";
import { CrewRatingCard } from "./CrewRatingCard";

const meta: Meta<typeof CrewRatingCard> = {
    title: "Domain/CrewRatingCard",
    component: CrewRatingCard,
    args: { member: MOCK_CREW_MEMBER }
};

export default meta;
type Story = StoryObj<typeof CrewRatingCard>;

export const Interactive: Story = {
    render: args => {
        const { C } = useTheme();
        const [stars, setStars] = useState(0);
        const [text, setText] = useState("");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <CrewRatingCard {...args} stars={stars} text={text} onStarsChange={setStars} onTextChange={setText} />
            </View>
        );
    }
};

export const Rated: Story = {
    render: args => {
        const { C } = useTheme();
        const [stars, setStars] = useState(4);
        const [text, setText] = useState("Carried the whole room on Mr. Brightside.");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <CrewRatingCard {...args} stars={stars} text={text} onStarsChange={setStars} onTextChange={setText} />
            </View>
        );
    }
};
