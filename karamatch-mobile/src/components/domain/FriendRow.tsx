import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { StarIcon } from "../../icons/StarIcon";
import type { MatchedUser } from "../../types";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { ListRow } from "../primitives/ListRow";
import { MatchBadge } from "../primitives/MatchBadge";

// Ported from karamatch-web/src/screens/tabs/FriendsTab.tsx's two `ListRow`
// usages: the friend list (chevron + singer rating) and the search-results
// list (an "Add" button instead). Both are the same row shape over a
// `MatchedUser`, so one composite with a `variant` covers both.
export function FriendRow({
    person,
    variant,
    onPress,
    onAdd,
    last
}: {
    person: MatchedUser;
    variant: "friend" | "suggestion";
    onPress?: () => void;
    /** variant="suggestion" */
    onAdd?: () => void;
    last?: boolean;
}) {
    const { C, S, T } = useTheme();

    return (
        <ListRow
            onPress={onPress}
            last={last}
            leading={<Avatar name={person.name} photoUrl={person.photoUrl} seed={person.id} size={variant === "friend" ? 44 : 40} />}
            title={person.name}
            subtitle={variant === "friend" ? "@" + person.username + " · " + person.eventsCount + " nights" : "@" + person.username}
            chevron={variant === "friend"}
            trailing={
                <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
                    <MatchBadge pct={person.matchPct} />
                    {variant === "friend" ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <StarIcon size={12} color={C.gold} />
                            <Text style={[T.captionStrong, { color: C.gold }]}>{person.singerRating.toFixed(1)}</Text>
                        </View>
                    ) : (
                        <Button label="Add" icon="userPlus" variant="tinted" size="sm" onPress={() => onAdd?.()} />
                    )}
                </View>
            }
        />
    );
}
