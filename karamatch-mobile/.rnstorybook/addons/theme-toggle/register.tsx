import { useState } from "react";
import { addons, types } from "storybook/manager-api";
import { UPDATE_GLOBALS } from "storybook/internal/core-events";
import { Pressable, Text, View } from "react-native";

// The on-device Storybook UI (unlike web Storybook) never renders a toolbar
// for `globalTypes` — it only renders addon *panels* (the Controls/Actions/
// Backgrounds tabs in the bottom sheet), the same way
// @storybook/addon-ondevice-backgrounds does. So switching the "theme"
// global needs its own panel rather than the `toolbar` config in preview.tsx,
// which has no UI to attach to here.
//
// Two things that don't work in this on-device setup, both discovered the
// hard way:
// - `useGlobals()`/`useStorybookApi()` throw ("Cannot read property
//   'getGlobals' of undefined") — `addons.add`'s `render()` is invoked as a
//   plain function call (react-native-ui's `MobileAddonsPanel.tsx`), not
//   inside whatever provider those hooks need.
// - `api.getGlobals()`/`api.updateGlobals()` (the `api` object handed to
//   `addons.register`'s callback) throw "undefined is not a function" — the
//   RN manager composes a reduced set of API modules and doesn't include
//   the "globals" one (it targets a web-only "storybook-preview-iframe").
// What does work, taken straight from @storybook/react-native's own bundled
// backgrounds panel: emitting the core `UPDATE_GLOBALS` event on the addons
// channel directly.
const ADDON_ID = "karamatch/theme-toggle";
const PANEL_ID = ADDON_ID + "/panel";

function ThemeOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                flex: 1,
                height: 44,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: active ? "#ff3d8f" : "#3a3a3a",
                backgroundColor: active ? "rgba(255,61,143,0.14)" : "transparent",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <Text style={{ color: active ? "#ff3d8f" : "#8d8d8d", fontWeight: "700" }}>{label}</Text>
        </Pressable>
    );
}

function ThemePanel() {
    // No reliable way to read the live current global here (see above), so
    // this just tracks its own local UI state, starting from preview.tsx's
    // `globalTypes.theme.defaultValue`.
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    function choose(value: "dark" | "light") {
        setTheme(value);
        addons.getChannel().emit(UPDATE_GLOBALS, { globals: { theme: value } });
    }

    return (
        <View style={{ flexDirection: "row", gap: 8, padding: 16 }}>
            <ThemeOption label="Dark" active={theme === "dark"} onPress={() => choose("dark")} />
            <ThemeOption label="Light" active={theme === "light"} onPress={() => choose("light")} />
        </View>
    );
}

addons.register(ADDON_ID, () => {
    addons.add(PANEL_ID, {
        type: types.PANEL,
        title: "Theme",
        render: () => <ThemePanel />
    });
});
