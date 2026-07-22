import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Section } from "./Section";

const meta: Meta<typeof Section> = {
    title: "Primitives/Section",
    component: Section,
    args: { title: "About", hint: "Visible to other singers." }
};

export default meta;
type Story = StoryObj<typeof Section>;

export const Default: Story = {
    render: args => {
        const { C, T } = useTheme();
        return (
            <View style={{ padding: 24, backgroundColor: C.surface }}>
                <Section {...args}>
                    <Text style={[T.body, { color: C.text }]}>Alto, loves 2000s pop-punk and karaoke ballads.</Text>
                </Section>
            </View>
        );
    }
};
