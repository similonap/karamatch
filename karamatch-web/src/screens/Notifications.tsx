import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, S, S2, T } from "../design/tokens";
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

    async function decline(id: string) {
        setBusy(id);
        try {
            await api.declineInvite(id);
            notifications.reload();
            app.refreshNotifCount();
            app.toast("Invite declined");
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
                    <EmptyState icon="bell" title="You're all caught up" body="Invites to karaoke parties will show up here." />
                ) : null}

                {list.map(notification => (
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
                                onClick={() => decline(notification.id)}
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
                ))}
            </ScrollBody>
        </>
    );
}
