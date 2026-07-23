import type { Meta, StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { TABS } from "../components/scaffolding/BottomTabBar";
import { Icon } from "./Icon";
import type { IconName } from "./types";

// One story per karamatch-web/src/screens/MainTabs.tsx bottom-tab icon
// (outline + the tab bar's `solid` selected form), so each can be found on
// its own in the sidebar instead of only inside the Icon/AllIcons gallery.
const meta: Meta<typeof Icon> = {
    title: "Icons/TabIcons",
    component: Icon
};

export default meta;
type Story = StoryObj<typeof Icon>;

function TabIconDemo({ name, label }: { name: IconName; label: string }) {
    const { C, S, T } = useTheme();
    return (
        <View style={{ padding: 24, backgroundColor: C.surface, flexDirection: "row", gap: S.xl }}>
            <View style={{ alignItems: "center", gap: 6 }}>
                <Icon name={name} size={24} strokeWidth={1.8} color={C.textMuted} />
                <Text style={[T.footnote, { color: C.textMuted }]}>{label}</Text>
            </View>
            <View style={{ alignItems: "center", gap: 6 }}>
                <Icon name={name} size={24} strokeWidth={1.8} solid color={C.tint} />
                <Text style={[T.footnote, { color: C.tint }]}>{label}</Text>
            </View>
        </View>
    );
}

export const Venues: Story = { render: () => <TabIconDemo name={TABS[0].icon} label={TABS[0].label} /> };
export const Parties: Story = { render: () => <TabIconDemo name={TABS[1].icon} label={TABS[1].label} /> };
export const Match: Story = { render: () => <TabIconDemo name={TABS[2].icon} label={TABS[2].label} /> };
export const Friends: Story = { render: () => <TabIconDemo name={TABS[3].icon} label={TABS[3].label} /> };
export const Mine: Story = { render: () => <TabIconDemo name={TABS[4].icon} label={TABS[4].label} /> };
