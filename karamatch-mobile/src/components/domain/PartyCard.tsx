import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { formatWhen, money, plural } from "../../utils/format";
import type { PartyView } from "../../types";
import { AppPressable } from "../primitives/AppPressable";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { Chip } from "../primitives/Chip";

export type PartyCardVariant = "open" | "match" | "upcoming" | "past";

// Ported from three different inline card layouts, one per screen, that all
// render a `PartyView` (or its `MatchView`/`PastPartyView` extensions):
// - "open"     karamatch-web/src/screens/tabs/OpenPartiesTab.tsx  (spots chip + host row + join)
// - "match"    karamatch-web/src/screens/tabs/MatchTab.tsx        (match ring + common songs + join)
// - "upcoming" karamatch-web/src/screens/tabs/MineTab.tsx         (host/joined chip)
// - "past"     karamatch-web/src/screens/tabs/MineTab.tsx         (rate-crew / review-venue actions)
// A shelf composite can't fork per screen the way the app did, so this is
// one component with the variant-specific data passed as optional props.
export function PartyCard({
    party,
    variant,
    onPress,
    onHostPress,
    onJoin,
    joining,
    matchPct,
    commonSongs,
    isHost,
    rated,
    venueReviewed,
    onRateCrew,
    onReviewVenue
}: {
    party: PartyView;
    variant: PartyCardVariant;
    onPress?: () => void;
    /** variant="open" | "match" — taps the host row to open their profile. */
    onHostPress?: () => void;
    /** variant="open" | "match" */
    onJoin?: () => void;
    joining?: boolean;
    /** variant="match" */
    matchPct?: number;
    commonSongs?: string[];
    /** variant="upcoming" */
    isHost?: boolean;
    /** variant="past" */
    rated?: boolean;
    venueReviewed?: boolean;
    onRateCrew?: () => void;
    onReviewVenue?: () => void;
}) {
    const { C, S, S2, T } = useTheme();
    const strongMatch = (matchPct ?? 0) >= 60;

    return (
        <Card onPress={onPress} highlight={variant === "match" ? strongMatch : variant === "upcoming"} style={{ gap: S2.s12 }}>
            {variant === "match" ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: S2.s12 }}>
                    <MatchRing pct={matchPct ?? 0} />
                    <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
                        <Text style={[T.bodyStrong, { fontSize: 16, color: C.text }]} numberOfLines={1}>
                            {party.title}
                        </Text>
                        <Text style={[T.caption, { color: C.textMuted }]} numberOfLines={1}>
                            {party.venue.name} · {formatWhen(party.start)}
                        </Text>
                        <Text style={[T.caption, { color: C.textMuted }]}>{plural(party.spotsOpen, "spot open", "spots open")}</Text>
                    </View>
                </View>
            ) : (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: S2.s10 }}>
                    <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
                        <Text style={[T.bodyStrong, { fontSize: 16, color: C.text }]} numberOfLines={1}>
                            {party.title}
                        </Text>
                        <Text style={[T.caption, { color: C.textMuted }]} numberOfLines={1}>
                            {party.venue.name} ·{" "}
                            {variant === "past" ? plural(party.membersCount, "singer", "singers") : formatWhen(party.start)}
                        </Text>
                    </View>
                    {variant === "open" ? <Chip label={plural(party.spotsOpen, "spot", "spots")} tone="cyan" /> : null}
                    {variant === "upcoming" ? (
                        <Chip label={isHost ? "Host" : "Joined"} icon={isHost ? "crown" : "check"} tone="tint" />
                    ) : null}
                    {variant === "past" ? <Text style={[T.footnote, { color: C.textFaint }]}>{formatWhen(party.start)}</Text> : null}
                </View>
            )}

            {(variant === "open" || variant === "match") ? (
                <AppPressable onPress={onHostPress} scaleTo={1} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, alignSelf: "flex-start" }}>
                    <Avatar name={party.host.name} photoUrl={party.host.photoUrl} seed={party.host.id} size={28} />
                    <Text style={[T.caption, { color: C.textMuted }]}>
                        @{party.host.username} · {plural(party.membersCount, "singer", "singers")}
                    </Text>
                </AppPressable>
            ) : null}

            {variant === "match" ? (
                commonSongs && commonSongs.length > 0 ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
                        {commonSongs.map(title => (
                            <Chip key={title} label={title} icon="music" tone="cyan" />
                        ))}
                    </View>
                ) : (
                    <Text style={[T.footnote, { fontSize: 12, color: C.textFaint }]}>No shared songs — matched on genre affinity.</Text>
                )
            ) : null}

            {(variant === "open" || variant === "match") ? (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: S2.s12,
                        paddingTop: S2.s12,
                        borderTopWidth: 1,
                        borderTopColor: C.border
                    }}
                >
                    <Text style={[T.caption, { color: C.textMuted }]}>
                        Your share <Text style={[T.bodyStrong, { color: C.text }]}>{money(party.share)}</Text>
                    </Text>
                    <Button label={joining ? "Joining" : "Join"} variant="tinted" size="md" busy={joining} onPress={() => onJoin?.()} />
                </View>
            ) : null}

            {variant === "upcoming" ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.sm }}>
                    {isHost ? (
                        <Text style={[T.caption, { color: C.textMuted }]}>
                            {party.membersCount}/{party.capacity} singers
                        </Text>
                    ) : (
                        <AppPressable onPress={onHostPress} scaleTo={1} style={{ flexDirection: "row", alignItems: "center", gap: S2.s6 }}>
                            <Avatar name={party.host.name} photoUrl={party.host.photoUrl} seed={party.host.id} size={22} />
                            <Text style={[T.caption, { color: C.textMuted }]}>@{party.host.username}</Text>
                        </AppPressable>
                    )}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={[T.captionStrong, { color: C.tintSoft }]}>Open room</Text>
                        <Icon name="chevronRight" size={14} strokeWidth={2.2} color={C.tintSoft} />
                    </View>
                </View>
            ) : null}

            {variant === "past" ? (
                <View style={{ gap: S2.s6 }}>
                    {rated ? (
                        <Chip label="Crew rated" icon="check" tone="green" />
                    ) : (
                        <Button label="Rate your crew" icon="star" variant="secondary" size="md" onPress={() => onRateCrew?.()} />
                    )}
                    {venueReviewed ? (
                        <Chip label="Venue reviewed" icon="check" tone="green" />
                    ) : (
                        <Button label="Review venue" icon="star" variant="secondary" size="md" onPress={() => onReviewVenue?.()} />
                    )}
                </View>
            ) : null}
        </Card>
    );
}

const RING_SIZE = 56;
const RING_STROKE = 5.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// The compatibility score as a progress ring — the single most important
// number on the match screen, so it gets the geometry rather than a text
// pill. The web version drew it with a CSS `conic-gradient`; RN has no
// conic-gradient support, so this is an SVG circle with a dashed stroke
// instead, which is the standard native technique for a percentage ring.
function MatchRing({ pct }: { pct: number }) {
    const { C, T } = useTheme();
    const strong = pct >= 60;
    const tone = strong ? C.tint : C.textMuted;
    const offset = RING_CIRCUMFERENCE * (1 - pct / 100);

    return (
        <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
                <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={C.surface3} strokeWidth={RING_STROKE} fill="none" />
                <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={tone}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    fill="none"
                    // The web ring starts at 12 o'clock via conic-gradient's
                    // default angle origin; SVG circles start at 3 o'clock,
                    // so this rotates the stroke back to match.
                    rotation={-90}
                    origin={RING_SIZE / 2 + ", " + RING_SIZE / 2}
                />
            </Svg>
            <View style={{ width: 45, height: 45, borderRadius: 22.5, backgroundColor: C.surface1, alignItems: "center", justifyContent: "center" }}>
                <Text style={[T.captionStrong, { fontSize: 14, lineHeight: 16, color: tone }]}>{pct}</Text>
                <Text style={[T.footnote, { fontSize: 8, lineHeight: 9, opacity: 0.75, color: tone }]}>MATCH</Text>
            </View>
        </View>
    );
}
