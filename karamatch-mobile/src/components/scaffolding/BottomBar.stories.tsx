import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../primitives/Button";
import { BottomBar } from "./BottomBar";

const meta: Meta<typeof BottomBar> = {
    title: "Scaffolding/BottomBar",
    component: BottomBar
};

export default meta;
type Story = StoryObj<typeof BottomBar>;

export const Default: Story = {
    render: () => {
        const { C } = useTheme();
        return (
            <View style={{ backgroundColor: C.surface, justifyContent: "flex-end", height: 200 }}>
                <BottomBar>
                    <Button label="Book this room · €18" onPress={() => {}} />
                </BottomBar>
            </View>
        );
    }
};
