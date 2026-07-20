import { useState } from "react";
import type { CSSProperties } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, roundBack, sectionLabel } from "../theme";
import { Avatar, ConfirmDialog, ErrorNote, Loading, useAsync } from "../ui";

// Add / remove / "already friends" all sit in the same slot at the bottom of
// the profile, so they share one party model and line up at the same height.
const friendAction: CSSProperties = {
    height: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0
};

// Read-only profile of another singer, opened by tapping them anywhere they
// are listed: friends, people search, party members, a party host. Your own
// profile stays editable on the "profile" screen.
export default function UserProfile() {
    const app = useApp();
    const username = app.profileUsername;
    const profile = useAsync(() => api.user(username!), [username]);
    const [adding, setAdding] = useState(false);
    // Unfriending goes through a confirmation dialog first.
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [removing, setRemoving] = useState(false);

    async function add() {
        if (!username) {
            return;
        }
        setAdding(true);
        try {
            await api.addFriend(username);
            profile.reload();
            app.toast("@" + username + " added to friends");
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setAdding(false);
        }
    }

    async function remove() {
        if (!username) {
            return;
        }
        setRemoving(true);
        try {
            await api.removeFriend(username);
            profile.reload();
            app.toast("@" + username + " removed from friends");
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setRemoving(false);
            setConfirmRemove(false);
        }
    }

    if (profile.loading) {
        return <Loading label="Opening profile…" />;
    }
    if (profile.error || !profile.data) {
        return (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <button onClick={app.closeProfile} style={roundBack}>
                    ‹
                </button>
                <ErrorNote message={profile.error ?? "Singer not found"} />
            </div>
        );
    }

    const user = profile.data;
    const topGenres = Object.entries(user.genreProfile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 12px", flexShrink: 0 }}>
                <button onClick={app.closeProfile} style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}>
                    ‹
                </button>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700, flex: 1 }}>
                    Profile
                </div>
                {user.isSelf ? (
                    <button
                        onClick={() => app.go("profile")}
                        style={{
                            height: 32,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.16)",
                            background: "rgba(255,255,255,.05)",
                            color: C.textDim,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "Outfit, sans-serif",
                            cursor: "pointer"
                        }}
                    >
                        Edit
                    </button>
                ) : null}
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "8px 24px 40px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 22
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Avatar name={user.name} photoUrl={user.photoUrl} seed={user.id} size={104} fontSize={38} />
                    <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>
                        {user.name}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 14 }}>@{user.username}</div>
                    {user.bio ? (
                        <div
                            style={{
                                color: C.textDim,
                                fontSize: 14,
                                lineHeight: 1.55,
                                textAlign: "center",
                                maxWidth: 280
                            }}
                        >
                            {user.bio}
                        </div>
                    ) : null}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <Stat label="singer rating" value={"★ " + user.singerRating.toFixed(1)} color={C.gold} />
                    <Stat label={user.eventsCount === 1 ? "night out" : "nights out"} value={String(user.eventsCount)} />
                    {user.matchPct !== null ? (
                        <Stat label="taste match" value={user.matchPct + "%"} color={C.pinkSoft} />
                    ) : null}
                </div>

                {user.commonSongs.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={sectionLabel}>YOU BOTH SING</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {user.commonSongs.map(title => (
                                <span
                                    key={title}
                                    style={{
                                        fontSize: 12,
                                        color: C.cyan,
                                        background: "rgba(41,224,255,.1)",
                                        border: "1px solid rgba(41,224,255,.25)",
                                        padding: "4px 10px",
                                        borderRadius: 999
                                    }}
                                >
                                    ♪ {title}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                {topGenres.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={sectionLabel}>GENRES</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {topGenres.map(([genre, count]) => (
                                <span
                                    key={genre}
                                    style={{
                                        fontSize: 12,
                                        color: C.pinkPale,
                                        background: "rgba(255,61,143,.1)",
                                        border: "1px solid rgba(255,61,143,.3)",
                                        padding: "4px 10px",
                                        borderRadius: 999
                                    }}
                                >
                                    {genre} · {count}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={sectionLabel}>FAVOURITE SONGS · {user.favoriteSongs.length}</div>
                    {user.favoriteSongs.length === 0 ? (
                        <div style={{ color: C.textMuted, fontSize: 13 }}>No favourites picked yet.</div>
                    ) : null}
                    {user.favoriteSongs.map(song => (
                        <div
                            key={song.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 14px",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,.09)",
                                background: "rgba(255,255,255,.04)"
                            }}
                        >
                            <span style={{ color: C.pinkSoft, fontSize: 15 }}>♪</span>
                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}
                                >
                                    {song.title}
                                </div>
                                <div style={{ color: C.textMuted, fontSize: 12 }}>{song.artist}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {user.isSelf ? null : user.isFriend ? (
                    <button
                        onClick={() => setConfirmRemove(true)}
                        style={{
                            ...friendAction,
                            color: C.pinkSoft,
                            border: "1px solid rgba(255,61,143,.4)",
                            background: "rgba(255,61,143,.1)",
                            fontFamily: "Outfit, sans-serif",
                            cursor: "pointer"
                        }}
                    >
                        Remove from friends
                    </button>
                ) : (
                    <button
                        onClick={add}
                        disabled={adding}
                        style={{
                            ...friendAction,
                            color: C.cyan,
                            border: "1px solid rgba(41,224,255,.4)",
                            background: "rgba(41,224,255,.1)",
                            fontFamily: "Outfit, sans-serif",
                            cursor: "pointer",
                            opacity: adding ? 0.6 : 1
                        }}
                    >
                        {adding ? "Adding…" : "+ Add to friends"}
                    </button>
                )}
            </div>

            {confirmRemove ? (
                <ConfirmDialog
                    title="Remove from friends?"
                    body={"@" + user.username + " goes off your friends list, and you off theirs."}
                    confirmLabel="Remove"
                    busy={removing}
                    onConfirm={remove}
                    onCancel={() => setConfirmRemove(false)}
                />
            ) : null}
        </div>
    );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div
            style={{
                flex: 1,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.1)",
                background: "rgba(255,255,255,.04)",
                padding: "12px 10px",
                textAlign: "center"
            }}
        >
            <div style={{ fontWeight: 700, fontSize: 16, color: color ?? C.text }}>{value}</div>
            <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{label}</div>
        </div>
    );
}
