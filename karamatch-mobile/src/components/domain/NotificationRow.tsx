import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { formatWhen, money } from "../../utils/format";
import type { NotificationView } from "../../types";
import { AppPressable } from "../primitives/AppPressable";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";

// Ported from karamatch-web/src/screens/Notifications.tsx's inline card,
// which branches on `kind`: an "invite" (accept/decline, paying your share)
// or a "review" nudge (dismiss/review) once a past night's party has ended.
export function NotificationRow({
    notification,
    busy,
    onOpen,
    onPrimary,
    onDismiss
}: {
    notification: NotificationView;
    busy?: boolean;
    /** Taps the row itself — opens the profile (invite) or the review form (review). */
    onOpen: () => void;
    /** "Accept · €12" (invite) or "Review" (review). */
    onPrimary: () => void;
    /** "Decline" (invite) or "Dismiss" (review). */
    onDismiss: () => void;
}) {
    const { C, S, S2, T } = useTheme();

    return (
        <Card highlight style={{ gap: S2.s12 }}>
            {notification.kind === "review" ? (
                <AppPressable onPress={onOpen} scaleTo={1} style={{ flexDirection: "row", alignItems: "center", gap: S2.s12 }}>
                    <VenueThumb imageUrl={notification.venue.imageUrl} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[T.callout, { color: C.textDim }]}>
                            {"How was "}
                            <Text style={{ fontFamily: T.bodyStrong.fontFamily, color: C.text }}>{notification.venue.name}</Text>?
                        </Text>
                        <Text style={[T.footnote, { color: C.textMuted, marginTop: 3 }]}>
                            {notification.party.title} · {formatWhen(notification.party.start)}
                        </Text>
                    </View>
                    <Icon name="chevronRight" size={16} strokeWidth={2.2} color={C.textFaint} />
                </AppPressable>
            ) : (
                <AppPressable onPress={onOpen} scaleTo={1} style={{ flexDirection: "row", alignItems: "center", gap: S2.s12 }}>
                    <Avatar name={notification.from.name} photoUrl={notification.from.photoUrl} seed={notification.from.id} size={42} />
                    <View style={{ minWidth: 0, flex: 1 }}>
                        <Text style={[T.callout, { color: C.textDim }]}>
                            <Text style={{ fontFamily: T.bodyStrong.fontFamily, color: C.text }}>@{notification.from.username}</Text>
                            {" invited you to "}
                            <Text style={{ fontFamily: T.bodyStrong.fontFamily, color: C.tintSoft }}>{notification.party.title}</Text>
                        </Text>
                        <Text style={[T.footnote, { color: C.textMuted, marginTop: 3 }]}>
                            {notification.party.venueName} · {formatWhen(notification.party.start)}
                        </Text>
                    </View>
                </AppPressable>
            )}

            <View style={{ flexDirection: "row", gap: S.sm }}>
                <Button
                    label={notification.kind === "review" ? "Dismiss" : "Decline"}
                    variant="secondary"
                    size="md"
                    disabled={busy}
                    onPress={onDismiss}
                    style={{ flex: 1 }}
                />
                <Button
                    label={notification.kind === "review" ? "Review" : "Accept · " + money(notification.party.share)}
                    icon={notification.kind === "review" ? "star" : undefined}
                    size="md"
                    busy={notification.kind === "invite" && busy}
                    onPress={onPrimary}
                    style={{ flex: 1.4 }}
                />
            </View>
        </Card>
    );
}

/** The review notification's venue thumbnail, with the same broken-image fallback as SongArt/Avatar. */
function VenueThumb({ imageUrl }: { imageUrl: string }) {
    const { C, R } = useTheme();
    const [broken, setBroken] = useState(false);
    const showPhoto = imageUrl && !broken;

    return (
        <View
            style={{
                width: 42,
                height: 42,
                borderRadius: R.md,
                borderCurve: "continuous",
                overflow: "hidden",
                backgroundColor: C.surface2,
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            {showPhoto ? (
                <Image source={{ uri: imageUrl }} onError={() => setBroken(true)} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
                <Icon name="star" size={20} color={C.gold} />
            )}
        </View>
    );
}
