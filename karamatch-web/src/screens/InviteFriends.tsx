import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, primaryButton, roundBack } from "../theme";
import { Avatar, CheckRing, EmptyCard, ErrorNote, Loading, MatchBadge, plural, useAsync } from "../ui";

export default function InviteFriends() {
    const app = useApp();
    const boxId = app.boxId;
    const friends = useAsync(() => api.friends(), []);
    const room = useAsync(() => api.box(boxId!), [boxId]);
    const [selected, setSelected] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const box = room.data;
    // Only people who are not already in the box or pending an invite.
    const invitable = (friends.data ?? []).filter(friend => {
        if (!box) {
            return true;
        }
        return (
            !box.members.some(member => member.id === friend.id) &&
            !box.invitedUsernames.includes(friend.username)
        );
    });

    function toggle(username: string) {
        setSelected(current =>
            current.includes(username) ? current.filter(other => other !== username) : [...current, username]
        );
    }

    async function send() {
        if (selected.length === 0 || !boxId) {
            return;
        }
        setBusy(true);
        try {
            const result = await api.invite(boxId, selected);
            app.toast(plural(result.invited.length, "invite sent", "invites sent"));
            app.go("room");
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "24px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 24px" }}>
                <button onClick={() => app.go("room")} style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}>
                    ‹
                </button>
                <div>
                    <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>
                        Invite friends
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 13 }}>
                        {box ? box.title + " · " + plural(box.spotsLeft, "spot left", "spots left") : "…"}
                    </div>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "18px 24px 120px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                }}
            >
                {friends.loading || room.loading ? <Loading /> : null}
                {friends.error ? <ErrorNote message={friends.error} /> : null}
                {!friends.loading && invitable.length === 0 ? (
                    <EmptyCard>
                        Nobody left to invite.
                        <br />
                        Add more friends from the Friends tab.
                    </EmptyCard>
                ) : null}

                {invitable.map(friend => {
                    const on = selected.includes(friend.username);
                    return (
                        <div
                            key={friend.id}
                            onClick={() => toggle(friend.username)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 14px",
                                borderRadius: 16,
                                cursor: "pointer",
                                border: "1px solid " + (on ? "rgba(255,61,143,.55)" : "rgba(255,255,255,.09)"),
                                background: on ? "rgba(255,61,143,.1)" : "rgba(255,255,255,.04)",
                                flexShrink: 0
                            }}
                        >
                            <Avatar
                                name={friend.name}
                                photoUrl={friend.photoUrl}
                                seed={friend.id}
                                size={44}
                                fontSize={17}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{friend.name}</div>
                                <div style={{ color: C.textMuted, fontSize: 13 }}>
                                    @{friend.username} · ★ {friend.singerRating.toFixed(1)}
                                </div>
                            </div>
                            <MatchBadge pct={friend.matchPct} />
                            <CheckRing on={on} />
                        </div>
                    );
                })}
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "16px 24px 36px",
                    background: "linear-gradient(180deg,transparent,#08040F 40%)"
                }}
            >
                <button onClick={send} style={primaryButton(selected.length > 0 && !busy)}>
                    {busy
                        ? "Sending…"
                        : selected.length > 0
                          ? "Send " + plural(selected.length, "invite", "invites")
                          : "Select friends"}
                </button>
            </div>
        </div>
    );
}
