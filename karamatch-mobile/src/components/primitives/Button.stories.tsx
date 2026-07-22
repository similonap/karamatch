import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
    title: "Primitives/Button",
    component: Button,
    argTypes: {
        onPress: { action: "pressed" },
        variant: { control: "select", options: ["primary", "tinted", "secondary", "ghost", "danger"] },
        size: { control: "select", options: ["lg", "md", "sm"] },
        icon: { control: "select", options: [undefined, "mic", "check", "plus", "trash"] }
    },
    args: {
        label: "Book this room",
        variant: "primary",
        size: "lg",
        disabled: false,
        busy: false
    }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    render: args => {
        const { C, S } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.sm }}>
                <Button {...args} />
            </View>
        );
    }
};

export const AllVariants: Story = {
    render: args => {
        const { C, S } = useTheme();
        const variants = ["primary", "tinted", "secondary", "ghost", "danger"] as const;
        return (
            <View style={{ padding: 24, backgroundColor: C.surface, gap: S.sm }}>
                {variants.map(variant => (
                    <Button key={variant} {...args} variant={variant} label={variant} />
                ))}
            </View>
        );
    }
};

export const Busy: Story = {
    args: { busy: true }
};
