import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarIcon } from "../../icons/StarIcon";
import type { MatchedUser } from "../../types";
import { AppPressable } from "../primitives/AppPressable";
import { Avatar } from "../primitives/Avatar";
import { CheckRing } from "../primitives/CheckRing";
import { MatchBadge } from "../primitives/MatchBadge";

// Ported from karamatch-web/src/screens/InviteFriends.tsx's inline friend
// row — SongRow's bordered/CheckRing shape (not ListRow's flush hairline
// shape), because picking several friends to invite is a multi-select list
// like the song picker, not a single navigable list.
export function InviteFriendRow({
    friend,
    selected,
    onToggle
}: {
    friend: MatchedUser;
    selected: boolean;
    onToggle: () => void;
}) {
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
            <Avatar name={friend.name} photoUrl={friend.photoUrl} seed={friend.id} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[T.bodyStrong, { color: C.text }]}>{friend.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={[T.caption, { color: C.textMuted }]}>@{friend.username}</Text>
                    <StarIcon size={10} color={C.gold} />
                    <Text style={[T.caption, { color: C.textMuted }]}>{friend.singerRating.toFixed(1)}</Text>
                </View>
            </View>
            <MatchBadge pct={friend.matchPct} />
            <CheckRing on={selected} />
        </AppPressable>
    );
}
