import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { money, plural } from "../../utils/format";
import type { VenueNearby } from "../../types";
import { Card } from "../primitives/Card";
import { Rating } from "../primitives/Rating";

// Ported from karamatch-web/src/screens/tabs/VenuesTab.tsx's inline venue
// card — a 124px photo (distance badge riding on top-left) over a name /
// rating line and a rooms · from-price line.
export function VenueCard({ venue, onPress }: { venue: VenueNearby; onPress?: () => void }) {
    const { C, R, S, S2, T } = useTheme();
    const [broken, setBroken] = useState(false);
    const showPhoto = venue.imageUrl && !broken;

    return (
        <Card onPress={onPress} padded={false}>
            <View style={{ height: 124, backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }}>
                {showPhoto ? (
                    <Image
                        source={{ uri: venue.imageUrl }}
                        onError={() => setBroken(true)}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                    />
                ) : (
                    <Icon name="mic" size={28} color={C.textFaint} />
                )}
                {/* Distance rides on the image so the row below stays a clean
                    name/price line. */}
                <View
                    style={{
                        position: "absolute",
                        top: S.sm,
                        left: S.sm,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        height: 24,
                        paddingHorizontal: 8,
                        borderRadius: R.sm,
                        backgroundColor: "rgba(7,4,13,0.72)"
                    }}
                >
                    <Icon name="pin" size={12} strokeWidth={2} color="#fff" />
                    <Text style={[T.footnote, { fontSize: 11, color: "#fff" }]}>{venue.distanceKm} km</Text>
                </View>
            </View>

            <View style={{ paddingTop: S2.s12, paddingHorizontal: S.md, paddingBottom: S.md, gap: S2.s6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: S.sm }}>
                    <Text style={[T.bodyStrong, { fontSize: 16, color: C.text, flexShrink: 1 }]} numberOfLines={1}>
                        {venue.name}
                    </Text>
                    {/* A venue with no reviews yet has no rating to show. */}
                    {venue.reviewsCount > 0 ? <Rating value={venue.rating} /> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
                    <Text style={[T.caption, { color: C.textMuted }]}>{plural(venue.rooms.length, "room", "rooms")}</Text>
                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.textFaint }} />
                    <Text style={[T.caption, { color: C.cyan }]}>from {money(venue.fromPrice)}/hr</Text>
                </View>
            </View>
        </Card>
    );
}
