import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AppPressable } from "./AppPressable";

const meta: Meta<typeof AppPressable> = {
    title: "Primitives/AppPressable",
    component: AppPressable,
    argTypes: {
        onPress: { action: "pressed" }
    },
    args: {
        disabled: false,
        scaleTo: 0.97,
        opacityTo: 0.72
    }
};

export default meta;
type Story = StoryObj<typeof AppPressable>;

function Demo(props: React.ComponentProps<typeof AppPressable>) {
    const { C, R, S } = useTheme();
    return (
        <AppPressable
            {...props}
            style={[
                { backgroundColor: C.surface2, borderRadius: R.md, padding: S.md, borderCurve: "continuous" },
                props.style
            ]}
        >
            <Text style={{ color: C.text }}>Press me</Text>
        </AppPressable>
    );
}

export const Default: Story = {
    render: args => (
        <View style={{ padding: 24 }}>
            <Demo {...args} />
        </View>
    )
};

export const Disabled: Story = {
    args: { disabled: true },
    render: args => (
        <View style={{ padding: 24 }}>
            <Demo {...args} />
        </View>
    )
};
