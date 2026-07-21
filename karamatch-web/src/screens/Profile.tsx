import { useRef, useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import type { ThemeName } from "../AppContext";
import { C, R, S, S2, T } from "../design/tokens";
import { Icon } from "../design/icons";
import type { IconName } from "../design/icons";
import {
    AppBar,
    BottomBar,
    Button,
    ErrorNote,
    Group,
    ListRow,
    Loading,
    Pressable,
    ScrollBody,
    SearchField,
    Section,
    TextField,
    useAsync,
    useDebounced
} from "../ui";
import { SongRow } from "./SongPicker";

const MAX_SONGS = 10;
const MIN_SONGS = 3;

const THEMES: { key: ThemeName; label: string; icon: IconName }[] = [
    { key: "dark", label: "Dark", icon: "moon" },
    { key: "light", label: "Light", icon: "sun" }
];

export default function Profile() {
    const app = useApp();
    const me = app.me;
    const [name, setName] = useState(me?.name ?? "");
    const [bio, setBio] = useState(me?.bio ?? "");
    const [picked, setPicked] = useState<string[]>(me?.favoriteSongIds ?? []);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement | null>(null);

    const songs = useAsync(() => api.songs(debouncedQuery), [debouncedQuery]);
    // Without a query the discovery list is long; show a taste of it.
    const visibleSongs = (songs.data ?? []).slice(0, debouncedQuery ? 22 : 8);

    // Favourites already picked, resolved to titles for the chip row.
    const pickedSongs = picked.map(id => {
        const fromMe = me?.favoriteSongs.find(song => song.id === id);
        const fromList = (songs.data ?? []).find(song => song.id === id);
        return fromMe ?? fromList ?? { id, title: id, artist: "", genre: [] };
    });

    function toggle(id: string) {
        if (picked.includes(id)) {
            setPicked(picked.filter(other => other !== id));
        } else if (picked.length < MAX_SONGS) {
            setPicked([...picked, id]);
        } else {
            app.toast("Max 10 songs — remove one first");
        }
    }

    async function uploadPhoto(file: File) {
        try {
            await api.uploadPhoto(file);
            await app.refreshMe();
            app.toast("Photo updated");
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    // Writes the form to the API. Returns false when validation or the request
    // stopped it, so callers know whether it is safe to navigate away.
    async function persist() {
        if (!name) {
            app.toast("Add your name first");
            return false;
        }
        if (picked.length < MIN_SONGS) {
            app.toast("Pick at least 3 favourite songs");
            return false;
        }
        setBusy(true);
        setError(null);
        try {
            await api.updateMe({ name, bio, favoriteSongIds: picked });
            await app.refreshMe();
            return true;
        } catch (err) {
            setError((err as Error).message);
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function save() {
        if (await persist()) {
            app.toast("Profile updated");
            app.go("app");
        }
    }

    // The location editor is its own screen, so the form has to be saved first
    // or the edits made above it would be lost on the way there.
    async function editLocation() {
        if (await persist()) {
            app.openLocationEditor();
        }
    }

    if (!me) {
        return <Loading />;
    }

    const canSave = Boolean(name) && picked.length >= MIN_SONGS && !busy;

    return (
        <>
            <AppBar title="Edit profile" onBack={() => app.go("app")} />

            <ScrollBody gap={S.lg} style={{ paddingTop: S.md }}>
                {/* Avatar with a camera badge — the badge is what makes it read as
                    editable, rather than the old dashed "Add photo" ring. */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: S.sm, flexShrink: 0 }}>
                    <Pressable
                        onClick={() => fileInput.current?.click()}
                        ariaLabel="Change profile photo"
                        style={{ position: "relative", width: 96, height: 96 }}
                    >
                        <div
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: C.surface2,
                                border: "1px solid " + C.border,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: C.textFaint,
                                boxSizing: "border-box"
                            }}
                        >
                            {me.photoUrl ? (
                                <img src={me.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <Icon name="camera" size={28} />
                            )}
                        </div>
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background: C.tint,
                                border: "2.5px solid " + C.surface,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: C.onTint,
                                boxSizing: "border-box"
                            }}
                        >
                            <Icon name="camera" size={14} strokeWidth={2} />
                        </div>
                    </Pressable>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={event => {
                            const file = event.target.files?.[0];
                            if (file) {
                                void uploadPhoto(file);
                            }
                        }}
                    />
                    <div style={{ ...T.footnote, color: C.textMuted }}>Tap to change your photo</div>
                </div>

                <Section title="Details" gap={S2.s12}>
                    <TextField value={name} onChange={setName} label="Display name" placeholder="Full name" />
                    <TextField
                        value={bio}
                        onChange={setBio}
                        label="Bio"
                        placeholder="Say what you love to sing…"
                        multiline
                        maxLength={200}
                    />
                    <Group>
                        <ListRow icon="users" title="Username" value={"@" + me.username} />
                        <ListRow
                            icon="pin"
                            title="Location"
                            subtitle={
                                me.location
                                    ? me.location.label || me.location.lat.toFixed(4) + ", " + me.location.lng.toFixed(4)
                                    : "Not set — venues and parties need this"
                            }
                            chevron
                            last
                            onClick={() => void editLocation()}
                        />
                    </Group>
                </Section>

                <Section title="Appearance" hint="Saved on this device — it is not part of your profile.">
                    <div style={{ display: "flex", gap: S.sm }}>
                        {THEMES.map(option => {
                            const on = app.theme === option.key;
                            return (
                                <Pressable
                                    key={option.key}
                                    onClick={() => app.setTheme(option.key)}
                                    scaleTo={0.97}
                                    style={{
                                        flex: 1,
                                        height: 62,
                                        borderRadius: R.md,
                                        border: "1px solid " + (on ? C.tintBorder : C.border),
                                        background: on ? C.tintBg : C.surface1,
                                        color: on ? C.tintSoft : C.textDim,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 4,
                                        transition: "background 140ms ease, border-color 140ms ease"
                                    }}
                                >
                                    <Icon name={option.icon} size={20} />
                                    <span style={{ ...T.footnote, fontWeight: 700 }}>{option.label}</span>
                                </Pressable>
                            );
                        })}
                    </div>
                </Section>

                <Section title={"Favourite songs · " + picked.length + "/" + MAX_SONGS} gap={S2.s12}>
                    <div style={{ ...T.caption, color: C.textMuted }}>
                        These drive your match score — pick the songs you love to sing.
                    </div>

                    {pickedSongs.length > 0 ? (
                        <div style={{ display: "flex", gap: S2.s6, flexWrap: "wrap" }}>
                            {pickedSongs.map(song => (
                                <Pressable
                                    key={song.id}
                                    onClick={() => toggle(song.id)}
                                    ariaLabel={"Remove " + song.title}
                                    scaleTo={0.95}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        background: C.tintBg,
                                        border: "1px solid " + C.tintBorder,
                                        borderRadius: R.full,
                                        padding: "5px 8px 5px 11px",
                                        maxWidth: "100%"
                                    }}
                                >
                                    <span
                                        style={{
                                            ...T.footnote,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: C.tintSoft,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            maxWidth: 200
                                        }}
                                    >
                                        {song.title}
                                    </span>
                                    <Icon name="close" size={13} strokeWidth={2.4} style={{ color: C.tintSoft, opacity: 0.8 }} />
                                </Pressable>
                            ))}
                        </div>
                    ) : null}

                    <SearchField value={query} onChange={setQuery} placeholder="Search songs or artists to add" />

                    <div style={{ display: "flex", flexDirection: "column", gap: S.sm }}>
                        {visibleSongs.map(song => (
                            <SongRow
                                key={song.id}
                                song={song}
                                selected={picked.includes(song.id)}
                                onToggle={() => toggle(song.id)}
                            />
                        ))}
                    </div>
                </Section>

                {error ? <ErrorNote message={error} /> : null}

                <Button label="Sign out" icon="logout" variant="secondary" onClick={app.logout} />
            </ScrollBody>

            <BottomBar>
                <Button label={busy ? "Saving" : "Save profile"} onClick={save} disabled={!canSave} busy={busy} />
            </BottomBar>
        </>
    );
}
