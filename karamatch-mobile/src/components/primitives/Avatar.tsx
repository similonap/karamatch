import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "../../theme/ThemeProvider";
import { avatarColor, initial } from "../../utils/avatar";

// Ported from karamatch-web/src/ui.tsx's `Avatar`. `expo-image` replaces the
// web `<img>`; its `onError` gives the same broken-photo fallback to the
// initial.
export function Avatar({
    name,
    photoUrl,
    seed,
    size = 40,
    ring
}: {
    name: string;
    photoUrl?: string | null;
    seed?: string | number;
    size?: number;
    ring?: boolean;
}) {
    const { C } = useTheme();
    const [broken, setBroken] = useState(false);
    const showPhoto = photoUrl && !broken;

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: avatarColor(seed ?? name),
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: ring ? "0 0 0 2px " + C.surface + ", 0 0 0 4px " + C.tint : undefined
            }}
        >
            {showPhoto ? (
                <Image
                    source={{ uri: photoUrl }}
                    onError={() => setBroken(true)}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                />
            ) : (
                <Text style={{ fontSize: Math.round(size * 0.38), fontWeight: "700", color: "#fff" }}>{initial(name)}</Text>
            )}
        </View>
    );
}
