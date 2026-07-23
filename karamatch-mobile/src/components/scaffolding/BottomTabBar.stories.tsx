import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { BottomTabBar } from "./BottomTabBar";
import type { TabKey } from "./BottomTabBar";

const meta: Meta<typeof BottomTabBar> = {
    title: "Scaffolding/BottomTabBar",
    component: BottomTabBar
};

export default meta;
type Story = StoryObj<typeof BottomTabBar>;

export const Default: Story = {
    render: () => {
        const { C } = useTheme();
        const [tab, setTab] = useState<TabKey>("venues");
        return (
            <View style={{ height: 400, justifyContent: "flex-end", backgroundColor: C.surface2 }}>
                <BottomTabBar current={tab} onSelect={setTab} />
            </View>
        );
    }
};
