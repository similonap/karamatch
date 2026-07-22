import type { Preview } from "@storybook/react-native";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useTheme, ThemeProvider } from "../src/theme/ThemeProvider";

// Every story renders inside SafeAreaProvider + ThemeProvider, so a
// component pulled straight from the shelf behaves exactly like it would in
// a student's own app — no per-story boilerplate. The "Theme" toolbar
// global drives ThemeProvider's initial mode; `key`-ing the provider on it
// forces a clean remount when the toolbar is switched, since ThemeProvider
// only reads `initialMode` once.
const preview: Preview = {
    globalTypes: {
        theme: {
            description: "Colour scheme",
            defaultValue: "dark",
            toolbar: {
                title: "Theme",
                icon: "mirror",
                items: [
                    { value: "dark", title: "Dark" },
                    { value: "light", title: "Light" }
                ],
                dynamicTitle: true
            }
        }
    },
    decorators: [
        (Story, context) => {
            const mode = context.globals.theme === "light" ? "light" : "dark";
            return (
                <SafeAreaProvider>
                    <ThemeProvider key={mode} initialMode={mode}>
                        <ThemedBackground>
                            <Story />
                        </ThemedBackground>
                    </ThemeProvider>
                </SafeAreaProvider>
            );
        }
    ]
};

export default preview;

function ThemedBackground({ children }: { children: React.ReactNode }) {
    const { C } = useTheme();
    return <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>;
}
