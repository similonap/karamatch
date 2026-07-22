import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Segmented } from "./Segmented";

const meta: Meta<typeof Segmented> = {
    title: "Primitives/Segmented",
    component: Segmented
};

export default meta;
type Story = StoryObj<typeof Segmented>;

export const Default: Story = {
    render: () => {
        const { C } = useTheme();
        const [pane, setPane] = useState<"upcoming" | "past">("upcoming");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Segmented
                    value={pane}
                    onChange={setPane}
                    items={[
                        { key: "upcoming", label: "Upcoming · 2" },
                        { key: "past", label: "Past · 5" }
                    ]}
                />
            </View>
        );
    }
};
