import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { PartyRoom as PartyRoomView, ChatMessage } from "../api";
import { useApp } from "../AppContext";
import { C, FONT, LAYOUT, R, S, S2, T } from "../design/tokens";
import { Icon } from "../design/icons";
import {
    AppBar,
    Avatar,
    Button,
    Chip,
    ErrorNote,
    Loading,
    Pressable,
    ScrollBody,
    Section,
    Segmented,
    Toggle,
    VenueMap,
    formatWhen,
    plural,
    useAsync
} from "../ui";

const POLL_MS = 4000;

// The party screen holds two things that each want the whole height: the chat,
// and everything about the party itself. They take turns.
type Pane = "chat" | "details";

export default function PartyRoom() {
    const app = useApp();
    const partyId = app.partyId;
    const loaded = useAsync(() => api.party(partyId!), [partyId]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [inviteInput, setInviteInput] = useState("");
    const [pane, setPane] = useState<Pane>("details");
    // How many messages had arrived last time the chat was on screen, so the
    // Chat tab can show that something was said while Details was open.
    const [seenCount, setSeenCount] = useState(0);
    const chatEnd = useRef<HTMLDivElement | null>(null);
    const baselineSet = useRef(false);

    // A past party opens the same screen, read-only: the chat is history and the
    // crew can still be rated.
    const ended = loaded.data?.status === "ended";

    // Opening a different party starts its own unread baseline.
    useEffect(() => {
        baselineSet.current = false;
    }, [partyId]);

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
                        // History that was already there when the screen opened is
                        // not "new" — the dot means said-while-you-were-looking-away.
                        if (!baselineSet.current) {
                            baselineSet.current = true;
                            setSeenCount(list.length);
                        }
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
        return (
            <>
                <AppBar onBack={() => app.go("app")} />
                <Loading label="Opening the party…" />
            </>
        );
    }

    if (loaded.error || !loaded.data) {
        return (
            <>
                <AppBar title="Party" onBack={() => app.go("app")} />
                <ScrollBody style={{ paddingTop: S.md }}>
                    <ErrorNote message={loaded.error ?? "Party not found"} />
                </ScrollBody>
            </>
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

    const status = ended ? "Ended" : myMember?.paid ? "Paid" : "Unpaid";

    return (
        <>
            <AppBar
                title={party.title}
                onBack={() => app.go("app")}
                right={
                    <span style={{ paddingRight: S.sm }}>
                        <Chip
                            label={status}
                            tone={ended ? "neutral" : myMember?.paid ? "green" : "gold"}
                            icon={ended ? undefined : myMember?.paid ? "check" : "clock"}
                        />
                    </span>
                }
            />

            <div style={{ padding: "0 " + LAYOUT.gutter + "px " + S2.s12 + "px", flexShrink: 0, display: "flex", flexDirection: "column", gap: S2.s12 }}>
                <div style={{ ...T.caption, color: C.textMuted }}>
                    {party.venue?.name} · {formatWhen(party.start)} · 1h
                </div>
                <Segmented<Pane>
                    value={pane}
                    onChange={setPane}
                    items={[
                        { key: "details", label: "Details" },
                        { key: "chat", label: "Chat", dot: unread > 0 }
                    ]}
                />
            </div>

            {/* Both panes stay mounted: the chat keeps its scroll position and the
                map keeps its tiles when you flip between them. */}
            <div
                className="km-scroll"
                style={{
                    display: pane === "details" ? "flex" : "none",
                    flex: 1,
                    flexDirection: "column",
                    gap: S.md,
                    padding: "0 " + LAYOUT.gutter + "px",
                    paddingBottom: LAYOUT.safeBottom + S.md,
                    minHeight: 0
                }}
            >
                {party.venue === null ? null : (
                    <VenueMap lat={party.venue.lat} lng={party.venue.lng} active={pane === "details"} />
                )}

                {party.roomName === "" ? null : (
                    <div style={{ display: "flex", alignItems: "center", gap: S.sm, ...T.caption, flexShrink: 0 }}>
                        <span style={{ color: C.textMuted }}>Your room</span>
                        <span style={{ ...T.captionStrong, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {party.roomName}
                        </span>
                    </div>
                )}

                <Section
                    title={"Crew · " + party.members.length}
                    hint={ended ? undefined : plural(party.spotsLeft, "spot left", "spots left")}
                >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: S2.s6 }}>
                        {party.members.map(member => (
                            <Pressable
                                key={member.id}
                                onClick={() => app.openProfile(member.username)}
                                scaleTo={0.96}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    background: C.surface1,
                                    border: "1px solid " + C.border,
                                    borderRadius: R.full,
                                    padding: "4px 11px 4px 4px"
                                }}
                            >
                                <Avatar name={member.name} photoUrl={member.photoUrl} seed={member.id} size={24} />
                                <span style={{ ...T.captionStrong, color: C.text }}>
                                    {member.id === app.me?.id ? "You" : member.name.split(" ")[0]}
                                </span>
                                {member.role === "host" ? (
                                    <Icon name="crown" size={12} style={{ color: C.gold }} />
                                ) : member.paid ? (
                                    <Icon name="check" size={12} strokeWidth={2.6} style={{ color: C.green }} />
                                ) : (
                                    <Icon name="clock" size={12} style={{ color: C.textFaint }} />
                                )}
                            </Pressable>
                        ))}
                        {party.invitedUsernames.map(username => (
                            <div
                                key={username}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    background: "transparent",
                                    border: "1px dashed " + C.borderStrong,
                                    borderRadius: R.full,
                                    padding: "6px 11px",
                                    ...T.footnote,
                                    color: C.textMuted
                                }}
                            >
                                @{username}
                                <span style={{ color: C.cyan }}>invited</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {ended ? (
                    party.rated ? (
                        <Chip label="Crew rated — thanks!" icon="check" tone="green" />
                    ) : (
                        <Button label="Rate your crew" icon="star" variant="secondary" onClick={() => app.openRate(party.id)} />
                    )
                ) : isHost ? (
                    <Section title="Host controls" gap={S2.s12}>
                        <Button
                            label="Invite from friends"
                            icon="userPlus"
                            variant="tinted"
                            onClick={() => app.go("invitefriends")}
                        />

                        <div style={{ display: "flex", gap: S.sm }}>
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
                                    minWidth: 0,
                                    height: 44,
                                    borderRadius: R.md,
                                    border: "1px solid " + C.border,
                                    background: C.surface2,
                                    color: C.text,
                                    padding: "0 14px",
                                    fontSize: 16,
                                    fontFamily: FONT.body,
                                    boxSizing: "border-box"
                                }}
                            />
                            <Button label="Invite" variant="secondary" size="md" onClick={sendInvite} disabled={!inviteInput.trim()} />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: S.md }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ ...T.body, fontWeight: 600, color: C.text }}>Open to everyone</div>
                                <div style={{ ...T.footnote, color: C.textMuted, marginTop: 1 }}>
                                    List this party in Open parties &amp; Match
                                </div>
                            </div>
                            <Toggle on={party.openToPublic} onChange={togglePublic} label="Open to everyone" />
                        </div>
                    </Section>
                ) : null}
            </div>

            <div
                className="km-scroll"
                style={{
                    flex: 1,
                    display: pane === "chat" ? "flex" : "none",
                    flexDirection: "column",
                    gap: S.sm,
                    padding: "0 " + LAYOUT.gutter + "px " + S2.s12 + "px",
                    minHeight: 0
                }}
            >
                {messages.length === 0 ? (
                    <div style={{ ...T.caption, color: C.textMuted, textAlign: "center", marginTop: S.lg }}>
                        {ended ? "Nothing was said in this party." : "No messages yet — say hi to your crew."}
                    </div>
                ) : null}

                {messages.map((message, index) => {
                    const mine = message.userId === app.me?.id;
                    // Consecutive messages from one person only get a name once.
                    const first = index === 0 || messages[index - 1].userId !== message.userId;
                    return (
                        <div
                            key={message.id}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: mine ? "flex-end" : "flex-start",
                                gap: 2,
                                marginTop: first && index > 0 ? S.sm : 0,
                                flexShrink: 0
                            }}
                        >
                            {first ? (
                                <div style={{ ...T.footnote, fontSize: 10, color: C.textFaint, padding: "0 8px" }}>
                                    {mine ? "You" : (message.from?.name ?? "Someone")}
                                </div>
                            ) : null}
                            <div
                                style={{
                                    maxWidth: "78%",
                                    padding: "9px 13px",
                                    // A tail on the outer corner, the way both
                                    // platforms' native bubbles are shaped.
                                    borderRadius: R.lg,
                                    borderBottomRightRadius: mine ? 5 : R.lg,
                                    borderBottomLeftRadius: mine ? R.lg : 5,
                                    ...T.callout,
                                    background: mine ? C.tint : C.surface2,
                                    color: mine ? C.onTint : C.text,
                                    border: mine ? "1px solid transparent" : "1px solid " + C.border
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
                        padding: S.md + "px " + LAYOUT.gutter + "px",
                        paddingBottom: LAYOUT.safeBottom + S.sm,
                        borderTop: "1px solid " + C.border,
                        ...T.caption,
                        color: C.textMuted,
                        textAlign: "center",
                        flexShrink: 0
                    }}
                >
                    This night is over — the chat is closed.
                </div>
            ) : (
                <div
                    style={{
                        padding: S2.s10 + "px " + LAYOUT.gutter + "px",
                        paddingBottom: LAYOUT.safeBottom + S.sm,
                        display: "flex",
                        gap: S.sm,
                        alignItems: "center",
                        borderTop: "1px solid " + C.border,
                        background: C.surface,
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
                            minWidth: 0,
                            height: 44,
                            borderRadius: R.full,
                            border: "1px solid " + C.border,
                            background: C.surface2,
                            color: C.text,
                            padding: "0 16px",
                            fontSize: 16,
                            fontFamily: FONT.body,
                            boxSizing: "border-box"
                        }}
                    />
                    <Pressable
                        onClick={send}
                        disabled={!draft.trim()}
                        ariaLabel="Send message"
                        scaleTo={0.9}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: draft.trim() ? C.tint : C.surface3,
                            color: draft.trim() ? C.onTint : C.textFaint,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "background 160ms ease"
                        }}
                    >
                        <Icon name="send" size={19} strokeWidth={2} />
                    </Pressable>
                </div>
            )}
        </>
    );
}
