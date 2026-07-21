import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, R, S, S2, T } from "../design/tokens";
import { Icon } from "../design/icons";
import { AppBar, Avatar, Button, Card, EmptyState, ErrorNote, Pressable, ScrollBody, Skeleton, formatWhen, money, useAsync } from "../ui";

export default function Notifications() {
    const app = useApp();
    const notifications = useAsync(() => api.notifications(), []);
    const [busy, setBusy] = useState<string | null>(null);

    async function accept(id: string, hostUsername: string) {
        setBusy(id);
        try {
            const result = await api.acceptInvite(id);
            app.refreshNotifCount();
            app.startPay({ kind: "join", partyId: result.partyId, amount: result.share, hostUsername });
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setBusy(null);
        }
    }

    // Declining is what dismissing is underneath — both kinds of notification
    // are put to rest the same way, only the wording differs.
    async function dismiss(id: string, message: string) {
        setBusy(id);
        try {
            await api.declineInvite(id);
            notifications.reload();
            app.refreshNotifCount();
            app.toast(message);
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setBusy(null);
        }
    }

    const list = notifications.data ?? [];

    return (
        <>
            <AppBar title="Notifications" onBack={() => app.go("app")} />

            <ScrollBody style={{ paddingTop: S.md }}>
                {notifications.loading ? <Skeleton height={140} count={2} /> : null}
                {notifications.error ? <ErrorNote message={notifications.error} /> : null}

                {!notifications.loading && !notifications.error && list.length === 0 ? (
                    <EmptyState
                        icon="bell"
                        title="You're all caught up"
                        body="Party invites, and the odd nudge to review a venue, show up here."
                    />
                ) : null}

                {list.map(notification =>
                    notification.kind === "review" ? (
                        // The whole card opens the review form; dismissing is the
                        // deliberate, smaller action underneath it.
                        <Card key={notification.id} highlight style={{ gap: S2.s12 }}>
                            <Pressable
                                onClick={() => app.openVenueReview(notification.party.id)}
                                scaleTo={1}
                                style={{ display: "flex", alignItems: "center", gap: S2.s12 }}
                            >
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: R.md,
                                        flexShrink: 0,
                                        overflow: "hidden",
                                        background: C.surface2,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: C.gold
                                    }}
                                >
                                    {notification.venue.imageUrl ? (
                                        <img
                                            src={notification.venue.imageUrl}
                                            alt=""
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            onError={event => {
                                                (event.currentTarget as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <Icon name="star" size={20} />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ ...T.callout, color: C.textDim }}>
                                        {"How was "}
                                        <span style={{ fontWeight: 700, color: C.text }}>{notification.venue.name}</span>
                                        ?
                                    </div>
                                    <div style={{ ...T.footnote, color: C.textMuted, marginTop: 3 }}>
                                        {notification.party.title} · {formatWhen(notification.party.start)}
                                    </div>
                                </div>
                                <Icon name="chevronRight" size={16} strokeWidth={2.2} style={{ color: C.textFaint }} />
                            </Pressable>

                            <div style={{ display: "flex", gap: S.sm }}>
                                <Button
                                    label="Dismiss"
                                    variant="secondary"
                                    size="md"
                                    disabled={busy === notification.id}
                                    onClick={() => dismiss(notification.id, "Review dismissed")}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    label="Review"
                                    icon="star"
                                    size="md"
                                    onClick={() => app.openVenueReview(notification.party.id)}
                                    style={{ flex: 1.4 }}
                                />
                            </div>
                        </Card>
                    ) : (
                    <Card key={notification.id} highlight style={{ gap: S2.s12 }}>
                        <Pressable
                            onClick={() => app.openProfile(notification.from.username)}
                            scaleTo={1}
                            style={{ display: "flex", alignItems: "center", gap: S2.s12 }}
                        >
                            <Avatar
                                name={notification.from.name}
                                photoUrl={notification.from.photoUrl}
                                seed={notification.from.id}
                                size={42}
                            />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ ...T.callout, color: C.textDim }}>
                                    <span style={{ fontWeight: 700, color: C.text }}>@{notification.from.username}</span>
                                    {" invited you to "}
                                    <span style={{ fontWeight: 700, color: C.tintSoft }}>{notification.party.title}</span>
                                </div>
                                <div style={{ ...T.footnote, color: C.textMuted, marginTop: 3 }}>
                                    {notification.party.venueName} · {formatWhen(notification.party.start)}
                                </div>
                            </div>
                        </Pressable>

                        <div style={{ display: "flex", gap: S.sm }}>
                            <Button
                                label="Decline"
                                variant="secondary"
                                size="md"
                                disabled={busy === notification.id}
                                onClick={() => dismiss(notification.id, "Invite declined")}
                                style={{ flex: 1 }}
                            />
                            <Button
                                label={"Accept · " + money(notification.party.share)}
                                size="md"
                                busy={busy === notification.id}
                                onClick={() => accept(notification.id, notification.from.username)}
                                style={{ flex: 1.4 }}
                            />
                        </div>
                    </Card>
                    )
                )}
            </ScrollBody>
        </>
    );
}
