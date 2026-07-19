import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { BoxRoom as BoxRoomView, ChatMessage } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, roundBack } from "../theme";
import { Avatar, ErrorNote, Loading, formatWhen, plural, useAsync } from "../ui";

const POLL_MS = 4000;

export default function BoxRoom() {
    const app = useApp();
    const boxId = app.boxId;
    const room = useAsync(() => api.box(boxId!), [boxId]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [inviteInput, setInviteInput] = useState("");
    const chatEnd = useRef<HTMLDivElement | null>(null);

    // A past box opens the same room, read-only: the chat is history and the
    // crew can still be rated.
    const ended = room.data?.status === "ended";

    // The chat is polled — the API has no websockets by design.
    useEffect(() => {
        if (!boxId) {
            return;
        }
        let live = true;
        const load = () => {
            api.messages(boxId)
                .then(list => {
                    if (live) {
                        setMessages(list);
                    }
                })
                .catch(() => undefined);
        };
        load();
        if (ended) {
            // Nothing new can arrive — one load is enough.
            return () => {
                live = false;
            };
        }
        const timer = window.setInterval(load, POLL_MS);
        return () => {
            live = false;
            window.clearInterval(timer);
        };
    }, [boxId, ended]);

    useEffect(() => {
        chatEnd.current?.scrollIntoView({ block: "end" });
    }, [messages.length]);

    if (room.loading) {
        return <Loading label="Opening the room…" />;
    }
    if (room.error || !room.data) {
        return (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <button onClick={() => app.go("app")} style={roundBack}>
                    ‹
                </button>
                <ErrorNote message={room.error ?? "Box not found"} />
            </div>
        );
    }

    const box: BoxRoomView = room.data;
    const myMember = box.members.find(member => member.id === app.me?.id);
    const isHost = myMember?.role === "host";

    async function send() {
        const text = draft.trim();
        if (!text || !boxId) {
            return;
        }
        setDraft("");
        try {
            const message = await api.sendMessage(boxId, text);
            setMessages(current => [...current, message]);
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    async function sendInvite() {
        const target = inviteInput.trim();
        if (!target || !boxId) {
            return;
        }
        try {
            const result = await api.invite(boxId, [target]);
            setInviteInput("");
            room.reload();
            app.toast("Invite sent to @" + result.invited.join(", @"));
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    async function togglePublic() {
        if (!boxId) {
            return;
        }
        try {
            await api.setOpenToPublic(boxId, !box.openToPublic);
            room.reload();
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
                style={{
                    padding: "14px 20px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderBottom: "1px solid rgba(255,255,255,.08)",
                    flexShrink: 0
                }}
            >
                <button onClick={() => app.go("app")} style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}>
                    ‹
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: 16,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}
                    >
                        {box.title}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>
                        {box.venue?.name} · {formatWhen(box.start)} · 1h
                    </div>
                </div>
                <div
                    style={{
                        flexShrink: 0,
                        background: ended
                            ? "rgba(255,255,255,.06)"
                            : myMember?.paid
                              ? "rgba(61,255,154,.1)"
                              : "rgba(255,193,69,.1)",
                        border:
                            "1px solid " +
                            (ended
                                ? "rgba(255,255,255,.16)"
                                : myMember?.paid
                                  ? "rgba(61,255,154,.35)"
                                  : "rgba(255,193,69,.35)"),
                        color: ended ? C.textMuted : myMember?.paid ? C.green : C.gold,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 999
                    }}
                >
                    {ended ? "ENDED" : myMember?.paid ? "PAID" : "UNPAID"}
                </div>
            </div>

            <div
                style={{
                    padding: "14px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    borderBottom: "1px solid rgba(255,255,255,.08)",
                    flexShrink: 0
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {box.members.map(member => (
                        <div
                            key={member.id}
                            onClick={() => app.openProfile(member.username)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                background: "rgba(255,255,255,.06)",
                                border: "1px solid rgba(255,255,255,.12)",
                                borderRadius: 999,
                                padding: "5px 12px 5px 5px",
                                cursor: "pointer"
                            }}
                        >
                            <Avatar
                                name={member.name}
                                photoUrl={member.photoUrl}
                                seed={member.id}
                                size={26}
                                fontSize={11}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                                {member.id === app.me?.id ? "You" : member.name}
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: member.role === "host" ? C.gold : member.paid ? C.green : C.textMuted
                                }}
                            >
                                {member.role === "host" ? "host" : member.paid ? "paid" : "unpaid"}
                            </span>
                            {member.matchPct !== null ? (
                                <span
                                    title={member.matchPct + "% taste match with you"}
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: member.matchPct >= 60 ? C.pinkSoft : C.textMuted
                                    }}
                                >
                                    {member.matchPct}%
                                </span>
                            ) : null}
                        </div>
                    ))}
                    {box.invitedUsernames.map(username => (
                        <div
                            key={username}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                background: "rgba(255,255,255,.04)",
                                border: "1px solid rgba(255,255,255,.12)",
                                borderRadius: 999,
                                padding: "5px 12px"
                            }}
                        >
                            <span style={{ fontSize: 13, fontWeight: 600 }}>@{username}</span>
                            <span style={{ fontSize: 11, color: C.cyan }}>invited</span>
                        </div>
                    ))}
                    {ended ? null : (
                        <div style={{ fontSize: 13, color: C.textMuted }}>
                            {plural(box.spotsLeft, "spot left", "spots left")}
                        </div>
                    )}
                </div>

                {ended ? (
                    box.rated ? (
                        <div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>★ Crew rated — thanks!</div>
                    ) : (
                        <button
                            onClick={() => app.openRate(box.id)}
                            style={{
                                height: 46,
                                border: "1px solid rgba(255,193,69,.45)",
                                borderRadius: 12,
                                background: "rgba(255,193,69,.08)",
                                color: C.gold,
                                fontWeight: 700,
                                fontSize: 14,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer"
                            }}
                        >
                            ★ Rate your crew
                        </button>
                    )
                ) : isHost ? (
                    <>
                        <button
                            onClick={() => app.go("invitefriends")}
                            style={{
                                height: 46,
                                border: "1px solid rgba(255,61,143,.45)",
                                borderRadius: 12,
                                background: "rgba(255,61,143,.08)",
                                color: C.pinkSoft,
                                fontWeight: 700,
                                fontSize: 14,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer"
                            }}
                        >
                            ♪ Invite from friends list
                        </button>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input
                                value={inviteInput}
                                onChange={event => setInviteInput(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === "Enter") {
                                        void sendInvite();
                                    }
                                }}
                                placeholder="Invite by @username or email"
                                style={{
                                    flex: 1,
                                    height: 44,
                                    borderRadius: 12,
                                    border: "1px solid rgba(255,255,255,.14)",
                                    background: "rgba(255,255,255,.06)",
                                    color: C.text,
                                    padding: "0 14px",
                                    fontSize: 14,
                                    fontFamily: "Outfit, sans-serif",
                                    minWidth: 0
                                }}
                            />
                            <button
                                onClick={sendInvite}
                                style={{
                                    height: 44,
                                    padding: "0 16px",
                                    borderRadius: 12,
                                    background: "rgba(41,224,255,.14)",
                                    border: "1px solid rgba(41,224,255,.4)",
                                    color: C.cyan,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    fontFamily: "Outfit, sans-serif",
                                    cursor: "pointer"
                                }}
                            >
                                Invite
                            </button>
                        </div>
                        <div
                            onClick={togglePublic}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer"
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>Open to everyone</div>
                                <div style={{ fontSize: 12, color: C.textMuted }}>
                                    Show this box in Open boxes &amp; Match
                                </div>
                            </div>
                            <div
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 999,
                                    background: box.openToPublic ? C.green : "rgba(255,255,255,.15)",
                                    position: "relative",
                                    transition: "background .2s",
                                    flexShrink: 0
                                }}
                            >
                                <div
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: "50%",
                                        background: "#fff",
                                        position: "absolute",
                                        top: 3,
                                        left: box.openToPublic ? 23 : 3,
                                        transition: "left .2s"
                                    }}
                                />
                            </div>
                        </div>
                    </>
                ) : null}
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                }}
            >
                {messages.length === 0 ? (
                    <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginTop: 20 }}>
                        {ended ? "Nothing was said in this box." : "No messages yet — say hi to your crew."}
                    </div>
                ) : null}
                {messages.map(message => {
                    const mine = message.userId === app.me?.id;
                    return (
                        <div
                            key={message.id}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: mine ? "flex-end" : "flex-start",
                                gap: 3
                            }}
                        >
                            <div style={{ fontSize: 11, color: C.textMuted, padding: "0 6px" }}>
                                {mine ? "You" : (message.from?.name ?? "Someone")}
                            </div>
                            <div
                                style={{
                                    maxWidth: "75%",
                                    padding: "10px 14px",
                                    borderRadius: 16,
                                    fontSize: 14,
                                    lineHeight: 1.45,
                                    background: mine ? GRAD : "rgba(255,255,255,.07)",
                                    color: "#fff",
                                    border: "1px solid " + (mine ? "transparent" : "rgba(255,255,255,.1)")
                                }}
                            >
                                {message.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEnd} />
            </div>

            {ended ? (
                <div
                    style={{
                        padding: "16px 20px 32px",
                        borderTop: "1px solid rgba(255,255,255,.08)",
                        color: C.textMuted,
                        fontSize: 13,
                        textAlign: "center",
                        flexShrink: 0
                    }}
                >
                    This night is over — the chat is closed.
                </div>
            ) : (
                <div
                    style={{
                        padding: "12px 20px 32px",
                        display: "flex",
                        gap: 8,
                        borderTop: "1px solid rgba(255,255,255,.08)",
                        flexShrink: 0
                    }}
                >
                    <input
                        value={draft}
                        onChange={event => setDraft(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === "Enter") {
                                void send();
                            }
                        }}
                        placeholder="Message the box…"
                        style={{
                            flex: 1,
                            height: 46,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,.14)",
                            background: "rgba(255,255,255,.06)",
                            color: C.text,
                            padding: "0 16px",
                            fontSize: 14,
                            fontFamily: "Outfit, sans-serif",
                            minWidth: 0
                        }}
                    />
                    <button
                        onClick={send}
                        style={{
                            width: 46,
                            height: 46,
                            border: "none",
                            borderRadius: 14,
                            background: GRAD,
                            color: "#fff",
                            fontSize: 17,
                            cursor: "pointer",
                            flexShrink: 0
                        }}
                    >
                        ➤
                    </button>
                </div>
            )}
        </div>
    );
}
