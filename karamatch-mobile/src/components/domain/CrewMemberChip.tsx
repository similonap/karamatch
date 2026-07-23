import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { PartyRoomMember } from "../../types";
import { AppPressable } from "../primitives/AppPressable";
import { Avatar } from "../primitives/Avatar";

// Ported from karamatch-web/src/screens/PartyRoom.tsx's inline crew pills —
// a joined member (avatar + first name/"You" + role glyph) and a dashed
// "invited, not joined yet" placeholder. Two different shapes (the invited
// one has no avatar and isn't tappable), so two exports from one file.
export function CrewMemberChip({
    member,
    isMe,
    onPress
}: {
    member: PartyRoomMember;
    isMe: boolean;
    onPress?: () => void;
}) {
    const { C, R, T } = useTheme();

    return (
        <AppPressable
            onPress={onPress}
            scaleTo={0.96}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                backgroundColor: C.surface1,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: R.full,
                paddingVertical: 4,
                paddingLeft: 4,
                paddingRight: 11
            }}
        >
            <Avatar name={member.name} photoUrl={member.photoUrl} seed={member.id} size={24} />
            <Text style={[T.captionStrong, { color: C.text }]}>{isMe ? "You" : member.name.split(" ")[0]}</Text>
            {member.role === "host" ? (
                <Icon name="crown" size={12} color={C.gold} />
            ) : member.paid ? (
                <Icon name="check" size={12} strokeWidth={2.6} color={C.green} />
            ) : (
                <Icon name="clock" size={12} color={C.textFaint} />
            )}
        </AppPressable>
    );
}

export function InvitedMemberChip({ username }: { username: string }) {
    const { C, R, T } = useTheme();

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: C.borderStrong,
                borderRadius: R.full,
                paddingVertical: 6,
                paddingHorizontal: 11
            }}
        >
            <Text style={[T.footnote, { color: C.textMuted }]}>@{username}</Text>
            <Text style={[T.footnote, { color: C.cyan }]}>invited</Text>
        </View>
    );
}
