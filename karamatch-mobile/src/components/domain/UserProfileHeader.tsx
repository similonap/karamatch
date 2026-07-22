import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";
import { StarIcon } from "../../icons/StarIcon";
import type { UserProfile } from "../../types";
import { Avatar } from "../primitives/Avatar";

// Ported from karamatch-web/src/screens/UserProfile.tsx's header block: an
// avatar, name/@handle, bio, and a stat strip (rating, nights out, and
// taste match when the profile isn't your own) that reads as one strip
// rather than three floating cards.
export function UserProfileHeader({ user }: { user: UserProfile }) {
    const { C, R, S, T } = useTheme();

    return (
        <View style={{ gap: S.lg }}>
            <View style={{ alignItems: "center", gap: S.sm }}>
                <Avatar name={user.name} photoUrl={user.photoUrl} seed={user.id} size={96} />
                <View style={{ alignItems: "center" }}>
                    <Text style={[T.title, { fontSize: 20, color: C.text }]}>{user.name}</Text>
                    <Text style={[T.callout, { color: C.textMuted, marginTop: 2 }]}>@{user.username}</Text>
                </View>
                {user.bio ? (
                    <Text style={[T.callout, { color: C.textDim, textAlign: "center", maxWidth: 280 }]}>{user.bio}</Text>
                ) : null}
            </View>

            <View style={{ flexDirection: "row", backgroundColor: C.surface1, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, borderCurve: "continuous", overflow: "hidden" }}>
                <Stat label="rating" value={user.singerRating.toFixed(1)} icon={<StarIcon size={13} color={C.gold} />} color={C.gold} />
                <Stat label={user.eventsCount === 1 ? "night out" : "nights out"} value={String(user.eventsCount)} last={user.matchPct === null} />
                {user.matchPct !== null ? <Stat label="taste match" value={user.matchPct + "%"} color={C.tintSoft} last /> : null}
            </View>
        </View>
    );
}

function Stat({ label, value, color, icon, last }: { label: string; value: string; color?: string; icon?: ReactNode; last?: boolean }) {
    const { C, S, S2, T } = useTheme();
    return (
        <View
            style={{
                flex: 1,
                paddingVertical: S2.s12,
                paddingHorizontal: S.sm,
                alignItems: "center",
                borderRightWidth: last ? 0 : 1,
                borderRightColor: C.border
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                {icon}
                <Text style={[T.bodyStrong, { fontSize: 17, color: color ?? C.text }]}>{value}</Text>
            </View>
            <Text style={[T.footnote, { fontSize: 10, color: C.textMuted, marginTop: 2 }]}>{label}</Text>
        </View>
    );
}
