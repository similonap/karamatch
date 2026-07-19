import { useState } from "react";
import { api } from "../../api";
import { useApp } from "../../AppContext";
import { C, inputStyle, screenTitle, sectionLabel } from "../../theme";
import { Avatar, EmptyCard, ErrorNote, Loading, MatchBadge, useAsync, useDebounced } from "../../ui";

export default function FriendsTab() {
    const app = useApp();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query);
    const friends = useAsync(() => api.friends(), []);
    const suggestions = useAsync(
        () => (debouncedQuery.trim() ? api.searchUsers(debouncedQuery.trim()) : Promise.resolve([])),
        [debouncedQuery]
    );

    async function add(username: string) {
        try {
            await api.addFriend(username);
            setQuery("");
            friends.reload();
            suggestions.reload();
            app.toast("@" + username + " added to friends");
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    const friendList = friends.data ?? [];
    const people = suggestions.data ?? [];

    return (
        <div
            style={{
                flex: 1,
                overflow: "auto",
                padding: "4px 24px 110px",
                display: "flex",
                flexDirection: "column",
                gap: 14
            }}
        >
            <div style={screenTitle}>Friends</div>

            <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Add by @username or email"
                style={{ ...inputStyle, height: 48, borderRadius: 14, fontSize: 15, padding: "0 16px", flexShrink: 0 }}
            />

            {people.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={sectionLabel}>PEOPLE</div>
                    {people.map(person => (
                        <div
                            key={person.id}
                            onClick={() => app.openProfile(person.username)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 12px",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,.09)",
                                background: "rgba(255,255,255,.04)",
                                flexShrink: 0,
                                cursor: "pointer"
                            }}
                        >
                            <Avatar name={person.name} photoUrl={person.photoUrl} seed={person.id} size={38} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>{person.name}</div>
                                <div style={{ color: C.textMuted, fontSize: 13 }}>@{person.username}</div>
                            </div>
                            <MatchBadge pct={person.matchPct} />
                            <button
                                onClick={event => {
                                    event.stopPropagation();
                                    void add(person.username);
                                }}
                                style={{
                                    height: 36,
                                    padding: "0 14px",
                                    border: "1px solid rgba(41,224,255,.4)",
                                    borderRadius: 10,
                                    background: "rgba(41,224,255,.1)",
                                    color: C.cyan,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    fontFamily: "Outfit, sans-serif",
                                    cursor: "pointer"
                                }}
                            >
                                + Add
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}

            <div style={sectionLabel}>YOUR FRIENDS · {friendList.length}</div>

            {friends.loading ? <Loading /> : null}
            {friends.error ? <ErrorNote message={friends.error} /> : null}
            {!friends.loading && friendList.length === 0 ? (
                <EmptyCard>
                    No friends yet.
                    <br />
                    Search for a singer above and add them.
                </EmptyCard>
            ) : null}

            {friendList.map(friend => (
                <div
                    key={friend.id}
                    onClick={() => app.openProfile(friend.username)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,.09)",
                        background: "rgba(255,255,255,.04)",
                        flexShrink: 0,
                        cursor: "pointer"
                    }}
                >
                    <Avatar name={friend.name} photoUrl={friend.photoUrl} seed={friend.id} size={44} fontSize={17} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{friend.name}</div>
                        <div style={{ color: C.textMuted, fontSize: 13 }}>
                            @{friend.username} · {friend.eventsCount} nights
                        </div>
                    </div>
                    <MatchBadge pct={friend.matchPct} />
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: C.gold, fontWeight: 700, fontSize: 15 }}>
                            ★ {friend.singerRating.toFixed(1)}
                        </div>
                        <div style={{ color: C.textMuted, fontSize: 11 }}>singer rating</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
