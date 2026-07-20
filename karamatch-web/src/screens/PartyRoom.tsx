import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { PartyRoom as PartyRoomView, ChatMessage } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, roundBack } from "../theme";
import { Avatar, ErrorNote, Loading, formatWhen, plural, useAsync } from "../ui";

const POLL_MS = 4000;

// The party screen holds two things that each want the whole height: the chat,
// and everything about the party itself. They take turns.
type Pane = "chat" | "details";

const PANES: { key: Pane; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "details", label: "Details" }
];

export default function PartyRoom() {
    const app = useApp();
    const partyId = app.partyId;
    const loaded = useAsync(() => api.party(partyId!), [partyId]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [inviteInput, setInviteInput] = useState("");
    const [pane, setPane] = useState<Pane>("chat");
    // How many messages had arrived last time the chat was on screen, so the
    // Chat tab can show that something was said while Details was open.
    const [seenCount, setSeenCount] = useState(0);
    const chatEnd = useRef<HTMLDivElement | null>(null);

    // A past party opens the same screen, read-only: the chat is history and the
    // crew can still be rated.
    const ended = loaded.data?.status === "ended";

    // The chat is polled — the API has no websockets by design.
    useEffect(() => {
        if (!partyId) {
            return;
        }
        let live = true;
        const load = () => {
            api.messages(partyId)
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
    }, [partyId, ended]);

    // Whatever is on screen counts as read; switching back to Chat clears the dot
    // and drops the view at the newest message.
    useEffect(() => {
        if (pane === "chat") {
            setSeenCount(messages.length);
            chatEnd.current?.scrollIntoView({ block: "end" });
        }
    }, [pane, messages.length]);

    const unread = pane === "chat" ? 0 : Math.max(0, messages.length - seenCount);

    if (loaded.loading) {
        return <Loading label="Opening the party…" />;
    }
    if (loaded.error || !loaded.data) {
        return (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <button onClick={() => app.go("app")} style={roundBack}>
                    ‹
                </button>
                <ErrorNote message={loaded.error ?? "Party not found"} />
            </div>
        );
    }

    const party: PartyRoomView = loaded.data;
    const myMember = party.members.find(member => member.id === app.me?.id);
    const isHost = myMember?.role === "host";

    async function send() {
        const text = draft.trim();
        if (!text || !partyId) {
            return;
        }
        setDraft("");
        try {
            const message = await api.sendMessage(partyId, text);
            setMessages(current => [...current, message]);
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    async function sendInvite() {
        const target = inviteInput.trim();
        if (!target || !partyId) {
            return;
        }
        try {
            const result = await api.invite(partyId, [target]);
            setInviteInput("");
            loaded.reload();
            app.toast("Invite sent to @" + result.invited.join(", @"));
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    async function togglePublic() {
        if (!partyId) {
            return;
        }
        try {
            await api.setOpenToPublic(partyId, !party.openToPublic);
            loaded.reload();
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
                        {party.title}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>
                        {party.venue?.name} · {formatWhen(party.start)} · 1h
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

            <div style={{ padding: "12px 20px", flexShrink: 0 }}>
                <div
                    style={{
                        display: "flex",
                        background: "rgba(255,255,255,.06)",
                        border: "1px solid rgba(255,255,255,.1)",
                        borderRadius: 16,
                        padding: 4
                    }}
                >
                    {PANES.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setPane(item.key)}
                            style={{
                                flex: 1,
                                height: 36,
                                border: "none",
                                borderRadius: 12,
                                background: pane === item.key ? GRAD : "transparent",
                                color: pane === item.key ? "#fff" : C.textMuted,
                                fontFamily: "Outfit, sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 7
                            }}
                        >
                            {item.label}
                            {item.key === "chat" && unread > 0 ? (
                                <span
                                    title={plural(unread, "new message", "new messages")}
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: C.pink,
                                        boxShadow: "0 0 8px rgba(255,61,143,.8)"
                                    }}
                                />
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>

            <div
                style={{
                    display: pane === "details" ? "flex" : "none",
                    padding: "2px 20px 28px",
                    flex: 1,
                    overflow: "auto",
                    flexDirection: "column",
                    gap: 12
                }}
            >
                {party.roomName === "" ? null : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>Your room</span>
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                minWidth: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                        >
                            {party.roomName}
                        </span>
                    </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {party.members.map(member => (
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
                    {party.invitedUsernames.map(username => (
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
                            {plural(party.spotsLeft, "spot left", "spots left")}
                        </div>
                    )}
                </div>

                {ended ? (
                    party.rated ? (
                        <div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>★ Crew rated — thanks!</div>
                    ) : (
                        <button
                            onClick={() => app.openRate(party.id)}
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
                                    Show this party in Open parties &amp; Match
                                </div>
                            </div>
                            <div
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 999,
                                    background: party.openToPublic ? C.green : "rgba(255,255,255,.15)",
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
                                        left: party.openToPublic ? 23 : 3,
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
                    padding: "4px 20px 16px",
                    display: pane === "chat" ? "flex" : "none",
                    flexDirection: "column",
                    gap: 10
                }}
            >
                {messages.length === 0 ? (
                    <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginTop: 20 }}>
                        {ended ? "Nothing was said in this party." : "No messages yet — say hi to your crew."}
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

            {pane !== "chat" ? null : ended ? (
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
                        placeholder="Message the party…"
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
