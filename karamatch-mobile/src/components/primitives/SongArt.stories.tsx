import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { SongArt } from "./SongArt";

const meta: Meta<typeof SongArt> = {
    title: "Primitives/SongArt",
    component: SongArt,
    args: { size: 48 }
};

export default meta;
type Story = StoryObj<typeof SongArt>;

export const Fallback: Story = {
    render: args => {
        const { C } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <SongArt {...args} />
            </View>
        );
    }
};

export const WithCoverArt: Story = {
    args: { coverArt: "https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd/829521842-250.jpg" }
};
