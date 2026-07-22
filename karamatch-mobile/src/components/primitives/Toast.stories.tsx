import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { Button } from "./Button";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
    title: "Primitives/Toast",
    component: Toast,
    args: { message: "Invite sent to @theolindqvist" }
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
    render: args => {
        const [visible, setVisible] = useState(false);
        return (
            <View style={{ flex: 1, padding: 24 }}>
                <Button
                    label="Show toast for 2s"
                    variant="secondary"
                    onPress={() => {
                        setVisible(true);
                        setTimeout(() => setVisible(false), 2000);
                    }}
                />
                <Toast {...args} visible={visible} />
            </View>
        );
    }
};
