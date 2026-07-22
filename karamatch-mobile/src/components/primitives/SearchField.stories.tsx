import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { SearchField } from "./SearchField";

const meta: Meta<typeof SearchField> = {
    title: "Primitives/SearchField",
    component: SearchField,
    args: { placeholder: "Search songs" }
};

export default meta;
type Story = StoryObj<typeof SearchField>;

export const Default: Story = {
    render: args => {
        const { C } = useTheme();
        const [value, setValue] = useState("");
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <SearchField {...args} value={value} onChange={setValue} />
            </View>
        );
    }
};
