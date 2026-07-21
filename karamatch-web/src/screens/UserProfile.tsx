import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, R, S, S2, T } from "../design/tokens";
import { Icon, StarIcon } from "../design/icons";
import {
    AppBar,
    Avatar,
    BottomBar,
    Button,
    Chip,
    ConfirmDialog,
    ErrorNote,
    Group,
    ListRow,
    Loading,
    ScrollBody,
    Section
} from "../ui";
import { useAsync } from "../ui";

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
        return (
            <>
                <AppBar onBack={app.closeProfile} />
                <Loading label="Opening profile…" />
            </>
        );
    }

    if (profile.error || !profile.data) {
        return (
            <>
                <AppBar title="Profile" onBack={app.closeProfile} />
                <ScrollBody style={{ paddingTop: S.md }}>
                    <ErrorNote message={profile.error ?? "Singer not found"} />
                </ScrollBody>
            </>
        );
    }

    const user = profile.data;
    const topGenres = Object.entries(user.genreProfile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    return (
        <>
            <AppBar
                title="Profile"
                onBack={app.closeProfile}
                right={
                    user.isSelf ? (
                        <Button label="Edit" variant="ghost" size="sm" onClick={() => app.go("profile")} />
                    ) : null
                }
            />

            <ScrollBody gap={S.lg} style={{ paddingTop: S.sm }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: S.sm, flexShrink: 0 }}>
                    <Avatar name={user.name} photoUrl={user.photoUrl} seed={user.id} size={96} />
                    <div style={{ textAlign: "center" }}>
                        <div style={{ ...T.title, fontSize: 20, color: C.text }}>{user.name}</div>
                        <div style={{ ...T.callout, color: C.textMuted, marginTop: 2 }}>@{user.username}</div>
                    </div>
                    {user.bio ? (
                        <p style={{ ...T.callout, color: C.textDim, textAlign: "center", maxWidth: 280, margin: 0 }}>
                            {user.bio}
                        </p>
                    ) : null}
                </div>

                {/* Stats read as one strip rather than three floating cards. */}
                <div
                    style={{
                        display: "flex",
                        background: C.surface1,
                        border: "1px solid " + C.border,
                        borderRadius: R.lg,
                        overflow: "hidden",
                        flexShrink: 0
                    }}
                >
                    <Stat
                        label="rating"
                        value={user.singerRating.toFixed(1)}
                        icon={<StarIcon size={13} color={C.gold} />}
                        color={C.gold}
                    />
                    <Stat
                        label={user.eventsCount === 1 ? "night out" : "nights out"}
                        value={String(user.eventsCount)}
                        last={user.matchPct === null}
                    />
                    {user.matchPct !== null ? (
                        <Stat label="taste match" value={user.matchPct + "%"} color={C.tintSoft} last />
                    ) : null}
                </div>

                {user.commonSongs.length > 0 ? (
                    <Section title="You both sing">
                        <div style={{ display: "flex", gap: S2.s6, flexWrap: "wrap" }}>
                            {user.commonSongs.map(title => (
                                <Chip key={title} label={title} icon="music" tone="cyan" />
                            ))}
                        </div>
                    </Section>
                ) : null}

                {topGenres.length > 0 ? (
                    <Section title="Genres">
                        <div style={{ display: "flex", gap: S2.s6, flexWrap: "wrap" }}>
                            {topGenres.map(([genre, count]) => (
                                <Chip key={genre} label={genre + " · " + count} tone="tint" />
                            ))}
                        </div>
                    </Section>
                ) : null}

                <Section title={"Favourite songs · " + user.favoriteSongs.length}>
                    {user.favoriteSongs.length === 0 ? (
                        <div style={{ ...T.caption, color: C.textMuted }}>No favourites picked yet.</div>
                    ) : (
                        <Group>
                            {user.favoriteSongs.map((song, index) => (
                                <ListRow
                                    key={song.id}
                                    last={index === user.favoriteSongs.length - 1}
                                    leading={
                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: R.sm,
                                                background: C.surface3,
                                                color: C.tintSoft,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0
                                            }}
                                        >
                                            <Icon name="music" size={16} />
                                        </div>
                                    }
                                    title={song.title}
                                    subtitle={song.artist}
                                />
                            ))}
                        </Group>
                    )}
                </Section>
            </ScrollBody>

            {user.isSelf ? null : (
                <BottomBar>
                    {user.isFriend ? (
                        <Button label="Remove from friends" variant="danger" onClick={() => setConfirmRemove(true)} />
                    ) : (
                        <Button label="Add to friends" icon="userPlus" onClick={add} busy={adding} disabled={adding} />
                    )}
                </BottomBar>
            )}

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
        </>
    );
}

function Stat({
    label,
    value,
    color,
    icon,
    last
}: {
    label: string;
    value: string;
    color?: string;
    icon?: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div
            style={{
                flex: 1,
                padding: S2.s12 + "px " + S.sm + "px",
                textAlign: "center",
                borderRight: last ? "none" : "1px solid " + C.border
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    ...T.bodyStrong,
                    fontSize: 17,
                    color: color ?? C.text
                }}
            >
                {icon}
                {value}
            </div>
            <div style={{ ...T.footnote, fontSize: 10, color: C.textMuted, marginTop: 2 }}>{label}</div>
        </div>
    );
}
