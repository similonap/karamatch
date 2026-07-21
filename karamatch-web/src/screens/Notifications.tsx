import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, roundBack } from "../theme";
import { Avatar, EmptyCard, ErrorNote, Loading, formatWhen, money, useAsync } from "../ui";

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
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                padding: "24px 24px 40px",
                gap: 16
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => app.go("app")} style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}>
                    ‹
                </button>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>Notifications</div>
            </div>

            {notifications.loading ? <Loading /> : null}
            {notifications.error ? <ErrorNote message={notifications.error} /> : null}
            {!notifications.loading && list.length === 0 ? (
                <EmptyCard>
                    No new notifications.
                    <br />
                    Invites to karaoke parties show up here.
                </EmptyCard>
            ) : null}

            {list.map(notification => (
                <div
                    key={notification.id}
                    style={{
                        borderRadius: 20,
                        border: "1px solid rgba(255,61,143,.35)",
                        background: "rgba(255,61,143,.06)",
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        flexShrink: 0
                    }}
                >
                    <div
                        onClick={() => app.openProfile(notification.from.username)}
                        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    >
                        <Avatar
                            name={notification.from.name}
                            photoUrl={notification.from.photoUrl}
                            seed={notification.from.id}
                            size={42}
                            fontSize={16}
                        />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, lineHeight: 1.45 }}>
                                <span style={{ fontWeight: 700 }}>@{notification.from.username}</span> invited you to{" "}
                                <span style={{ fontWeight: 700, color: C.pinkSoft }}>{notification.party.title}</span>
                            </div>
                            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                                {notification.party.venueName} · {formatWhen(notification.party.start)}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={() => accept(notification.id, notification.from.username)}
                            disabled={busy === notification.id}
                            style={{
                                flex: 1,
                                height: 44,
                                border: "none",
                                borderRadius: 12,
                                background: GRAD,
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 14,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer",
                                opacity: busy === notification.id ? 0.6 : 1
                            }}
                        >
                            Accept · pay {money(notification.party.share)}
                        </button>
                        <button
                            onClick={() => decline(notification.id)}
                            disabled={busy === notification.id}
                            style={{
                                flex: 1,
                                height: 44,
                                border: "1px solid var(--km-veil-16)",
                                borderRadius: 12,
                                background: "var(--km-veil-05)",
                                color: C.textDim,
                                fontWeight: 600,
                                fontSize: 14,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer"
                            }}
                        >
                            Decline
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
