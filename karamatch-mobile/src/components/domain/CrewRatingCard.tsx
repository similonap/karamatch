import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import type { CrewMember } from "../../types";
import { Avatar } from "../primitives/Avatar";
import { Card } from "../primitives/Card";
import { MatchBadge } from "../primitives/MatchBadge";
import { StarInput } from "../primitives/StarInput";
import { TextField } from "../primitives/TextField";

const STAR_WORDS = ["", "Rough night", "Off-key", "Solid", "Great voice", "Absolute star"];

// Ported from karamatch-web/src/screens/Rate.tsx's inline per-crew-member
// card — star the person, and only once they have a star does the optional
// review box appear, so an unrated crew doesn't read as a wall of textareas.
export function CrewRatingCard({
    member,
    stars,
    text,
    onStarsChange,
    onTextChange
}: {
    member: CrewMember;
    stars: number;
    text: string;
    onStarsChange: (stars: number) => void;
    onTextChange: (text: string) => void;
}) {
    const { C, S, S2, T } = useTheme();

    return (
        <Card highlight={stars > 0} style={{ gap: S2.s12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S2.s12 }}>
                <Avatar name={member.name} photoUrl={member.photoUrl} seed={member.id} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[T.bodyStrong, { color: C.text }]}>{member.name}</Text>
                    <Text style={[T.caption, { color: C.textMuted }]}>@{member.username}</Text>
                </View>
                <MatchBadge pct={member.matchPct} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
                <StarInput value={stars} onChange={onStarsChange} />
                {stars > 0 ? <Text style={[T.caption, { color: C.gold }]}>{STAR_WORDS[stars]}</Text> : null}
            </View>

            {stars > 0 ? (
                <TextField value={text} onChange={onTextChange} placeholder="Add a few words (optional)" multiline maxLength={280} />
            ) : null}
        </Card>
    );
}
