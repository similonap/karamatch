import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";

const meta: Meta<typeof ConfirmDialog> = {
    title: "Primitives/ConfirmDialog",
    component: ConfirmDialog,
    args: {
        title: "Leave this party?",
        body: "You'll give up your spot and it may be claimed by someone else.",
        confirmLabel: "Leave party",
        busy: false
    }
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
    render: args => {
        const [visible, setVisible] = useState(false);
        return (
            <View style={{ flex: 1, padding: 24 }}>
                <Button label="Open dialog" variant="danger" onPress={() => setVisible(true)} />
                <ConfirmDialog
                    {...args}
                    visible={visible}
                    onCancel={() => setVisible(false)}
                    onConfirm={() => setVisible(false)}
                />
            </View>
        );
    }
};
