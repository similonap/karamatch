import { Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { formatAgo } from "../../utils/format";
import type { VenueReview } from "../../types";
import { Avatar } from "../primitives/Avatar";
import { Card } from "../primitives/Card";
import { StarRow } from "../primitives/StarRow";

// Ported from karamatch-web/src/screens/VenueDetail.tsx's inline review card.
export function ReviewCard({ review }: { review: VenueReview }) {
    const { C, S2, T } = useTheme();

    return (
        <Card style={{ gap: S2.s6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S2.s10 }}>
                <Avatar name={review.from?.name ?? "Someone"} photoUrl={review.from?.photoUrl ?? null} seed={review.from?.id ?? 0} size={28} />
                <Text style={[T.captionStrong, { flex: 1, color: C.text }]} numberOfLines={1}>
                    {review.from?.name ?? "A singer"}
                </Text>
                <StarRow value={review.stars} />
                <Text style={[T.footnote, { color: C.textFaint }]}>{formatAgo(review.createdAt)}</Text>
            </View>
            {review.text ? <Text style={[T.caption, { color: C.textDim }]}>{review.text}</Text> : null}
        </Card>
    );
}
