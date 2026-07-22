import { Linking, Platform, Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { AppPressable } from "../primitives/AppPressable";
import { Card } from "../primitives/Card";

// Replaces karamatch-web/src/ui.tsx's `VenueMap` (a read-only Leaflet
// embed). A live map needs a dev-client/prebuild — out of scope for a shelf
// that has to run in plain Expo Go — so this is a static placeholder with
// the same footprint (rounded panel, pin, attribution-height caption) that
// hands off to the device's own Maps app instead of embedding one.
export function VenueLocationCard({
    name,
    lat,
    lng,
    height = 132
}: {
    name: string;
    lat: number;
    lng: number;
    height?: number;
}) {
    const { C, R, S, T } = useTheme();

    const openInMaps = () => {
        const label = encodeURIComponent(name);
        const url = Platform.select({
            ios: "maps:0,0?q=" + label + "@" + lat + "," + lng,
            android: "geo:" + lat + "," + lng + "?q=" + lat + "," + lng + "(" + label + ")",
            default: "https://maps.google.com/?q=" + lat + "," + lng
        });
        Linking.openURL(url).catch(() => {});
    };

    return (
        <AppPressable onPress={openInMaps} scaleTo={0.99} opacityTo={0.9}>
            <Card padded={false}>
                <View
                    style={{
                        height,
                        backgroundColor: C.surface3,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6
                    }}
                >
                    <View
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: C.tintBg,
                            borderWidth: 1,
                            borderColor: C.tintBorder,
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <Icon name="pin" size={18} color={C.tintSoft} />
                    </View>
                    <Text style={[T.footnote, { color: C.textFaint }]}>
                        {lat.toFixed(4)}, {lng.toFixed(4)}
                    </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.sm, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={[T.captionStrong, { color: C.text, flexShrink: 1 }]} numberOfLines={1}>
                        {name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={[T.captionStrong, { color: C.tintSoft }]}>Open in Maps</Text>
                        <Icon name="chevronRight" size={14} strokeWidth={2.2} color={C.tintSoft} />
                    </View>
                </View>
            </Card>
        </AppPressable>
    );
}
