import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import type { Song } from "../../types";
import { AppPressable } from "../primitives/AppPressable";
import { CheckRing } from "../primitives/CheckRing";
import { SongArt } from "../primitives/SongArt";

// Ported from karamatch-web/src/screens/SongPicker.tsx's `SongRow`, shared
// there with the profile editor — one row of a song list, toggled on tap.
export function SongRow({ song, selected, onToggle }: { song: Song; selected: boolean; onToggle: () => void }) {
    const { C, R, S2, T } = useTheme();

    return (
        <AppPressable
            onPress={onToggle}
            scaleTo={0.99}
            opacityTo={0.75}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: S2.s12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: R.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: selected ? C.tintBorder : C.border,
                backgroundColor: selected ? C.tintBg : C.surface1
            }}
        >
            <SongArt coverArt={song.coverArt} gradient={selected} color={selected ? "#fff" : C.textFaint} />
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[T.bodyStrong, { color: C.text }]} numberOfLines={1}>
                    {song.title}
                </Text>
                <Text style={[T.caption, { color: C.textMuted }]} numberOfLines={1}>
                    {song.artist}
                </Text>
            </View>
            <CheckRing on={selected} />
        </AppPressable>
    );
}
