import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";

// Ported from karamatch-web/src/ui.tsx's `SongArt` — album art for a song,
// falling back to the music icon when the API has no coverArt for it, or
// when the image fails to load.
export function SongArt({
    coverArt,
    size = 38,
    radius,
    background,
    /** The brand gradient instead of a flat `background` — e.g. a selected song row. */
    gradient,
    color
}: {
    coverArt?: string;
    size?: number;
    radius?: number;
    background?: string;
    gradient?: boolean;
    color?: string;
}) {
    const { C, GRAD, R } = useTheme();
    const [broken, setBroken] = useState(false);
    const showArt = coverArt && !broken;

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: radius ?? R.sm,
                borderCurve: "continuous",
                ...(gradient ? { experimental_backgroundImage: GRAD } : { backgroundColor: background ?? C.surface3 }),
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
            }}
        >
            {showArt ? (
                <Image
                    source={{ uri: coverArt }}
                    onError={() => setBroken(true)}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                />
            ) : (
                <Icon name="music" size={Math.round(size * 0.47)} color={color ?? C.textFaint} />
            )}
        </View>
    );
}
