import { useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
// Imported from each weight's own subpath, not the package root — the root
// barrel re-exports every weight from one file, which makes Metro bundle
// every weight's .ttf as an asset even though only these six are ever used.
import { useFonts } from "@expo-google-fonts/outfit/useFonts";
import { Outfit_400Regular } from "@expo-google-fonts/outfit/400Regular";
import { Outfit_500Medium } from "@expo-google-fonts/outfit/500Medium";
import { Outfit_700Bold } from "@expo-google-fonts/outfit/700Bold";
import { Outfit_800ExtraBold } from "@expo-google-fonts/outfit/800ExtraBold";
import { Unbounded_700Bold } from "@expo-google-fonts/unbounded/700Bold";
import { Unbounded_800ExtraBold } from "@expo-google-fonts/unbounded/800ExtraBold";

import StorybookUI from "./.rnstorybook";
import { PlaceholderApp } from "./src/PlaceholderApp";
import { ThemeProvider } from "./src/theme/ThemeProvider";

// This app's whole purpose is an on-device Storybook of the component shelf
// in src/. `EXPO_PUBLIC_STORYBOOK=false npm start` switches to a tiny
// two-screen app instead, just enough to prove the shelf assembles into a
// real screen — see src/PlaceholderApp.tsx.
const SHOW_STORYBOOK = process.env.EXPO_PUBLIC_STORYBOOK !== "false";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
    const [fontsLoaded, fontError] = useFonts({
        Unbounded_700Bold,
        Unbounded_800ExtraBold,
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_700Bold,
        Outfit_800ExtraBold
    });

    const onLayout = useCallback(async () => {
        if (fontsLoaded || fontError) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return null;
    }

    if (SHOW_STORYBOOK) {
        // The Storybook UI brings its own decorators (theme, safe area) via
        // .rnstorybook/preview.tsx, so it doesn't need this file's providers.
        return (
            <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
                <StorybookUI />
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <PlaceholderApp />
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
