import { useRef, useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, inputStyle, primaryButton, roundBack, sectionLabel } from "../theme";
import { ErrorNote, Loading, useAsync, useDebounced } from "../ui";
import { SongRow } from "./SongPicker";

const MAX_SONGS = 10;
const MIN_SONGS = 3;

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
            app.toast("Profile updated ✓");
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 12px", flexShrink: 0 }}>
                <button onClick={() => app.go("app")} style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}>
                    ‹
                </button>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700, flex: 1 }}>
                    Edit profile
                </div>
                <button
                    onClick={app.logout}
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
                    Sign out
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "8px 24px 130px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 22
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div
                        onClick={() => fileInput.current?.click()}
                        style={{
                            position: "relative",
                            width: 104,
                            height: 104,
                            borderRadius: "50%",
                            boxShadow: "0 0 34px rgba(255,61,143,.35)",
                            background: me.photoUrl ? "transparent" : "rgba(255,255,255,.06)",
                            border: "1px dashed rgba(255,255,255,.25)",
                            cursor: "pointer",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.textMuted,
                            fontSize: 13,
                            boxSizing: "border-box"
                        }}
                    >
                        {me.photoUrl ? (
                            <img
                                src={me.photoUrl}
                                alt={me.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        ) : (
                            "Add photo"
                        )}
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg,#FF3D8F,#B23DFF)",
                                border: "2px solid #0A0512",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                color: "#fff",
                                pointerEvents: "none"
                            }}
                        >
                            ✎
                        </div>
                    </div>
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
                    <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", maxWidth: 260 }}>
                        Tap the circle to upload a photo.
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={sectionLabel}>DETAILS</div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Display name</span>
                        <input
                            value={name}
                            onChange={event => setName(event.target.value)}
                            placeholder="Full name"
                            style={{ ...inputStyle, height: 52 }}
                        />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Username</span>
                        <div
                            style={{
                                height: 52,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,.14)",
                                background: "rgba(255,255,255,.04)",
                                color: C.textMuted,
                                padding: "0 18px",
                                fontSize: 16,
                                display: "flex",
                                alignItems: "center",
                                fontWeight: 500,
                                boxSizing: "border-box"
                            }}
                        >
                            @{me.username}
                        </div>
                        <div style={{ fontSize: 11, color: C.textFaint }}>
                            Usernames can't be changed. Contact support if needed.
                        </div>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Bio</span>
                        <textarea
                            value={bio}
                            onChange={event => setBio(event.target.value)}
                            placeholder="Say what you love to sing…"
                            rows={2}
                            style={{
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,.14)",
                                background: "rgba(255,255,255,.06)",
                                color: C.text,
                                padding: "12px 18px",
                                fontSize: 15,
                                fontFamily: "Outfit, sans-serif",
                                resize: "none"
                            }}
                        />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Location</span>
                        <button
                            onClick={() => void editLocation()}
                            disabled={busy}
                            style={{
                                height: 52,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,.14)",
                                background: "rgba(255,255,255,.06)",
                                color: C.text,
                                padding: "0 18px",
                                fontSize: 15,
                                fontFamily: "Outfit, sans-serif",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                textAlign: "left",
                                cursor: busy ? "default" : "pointer",
                                boxSizing: "border-box"
                            }}
                        >
                            <span style={{ flexShrink: 0 }}>📍</span>
                            <span
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: me.location ? C.text : C.textMuted
                                }}
                            >
                                {me.location
                                    ? me.location.label ||
                                      me.location.lat.toFixed(4) + ", " + me.location.lng.toFixed(4)
                                    : "Set your location"}
                            </span>
                            <span style={{ color: C.textMuted, fontSize: 18, flexShrink: 0 }}>›</span>
                        </button>
                        <div style={{ fontSize: 11, color: C.textFaint }}>
                            This decides which venues and boxes you see.
                        </div>
                    </label>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <div style={sectionLabel}>FAVOURITE SONGS</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>
                            {picked.length}/{MAX_SONGS}
                        </div>
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
                        These drive your match score — pick the songs you love to sing.
                    </div>

                    {pickedSongs.length > 0 ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {pickedSongs.map(song => (
                                <div
                                    key={song.id}
                                    onClick={() => toggle(song.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        background: "rgba(255,61,143,.12)",
                                        border: "1px solid rgba(255,61,143,.45)",
                                        borderRadius: 999,
                                        padding: "6px 10px 6px 12px",
                                        cursor: "pointer",
                                        maxWidth: "100%"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: C.pinkPale,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            maxWidth: 220
                                        }}
                                    >
                                        ♪ {song.title}
                                    </span>
                                    <span
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: "50%",
                                            background: "rgba(255,61,143,.3)",
                                            color: "#fff",
                                            fontSize: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0
                                        }}
                                    >
                                        ×
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <input
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="Search songs or artists to add"
                        style={{ ...inputStyle, height: 48, borderRadius: 14, fontSize: 15, padding: "0 16px" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {visibleSongs.map(song => (
                            <SongRow
                                key={song.id}
                                song={song}
                                selected={picked.includes(song.id)}
                                onToggle={() => toggle(song.id)}
                                compact
                            />
                        ))}
                    </div>
                </div>

                {error ? <ErrorNote message={error} /> : null}
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
                <button onClick={save} style={primaryButton(canSave)}>
                    {busy ? "Saving…" : "Save profile"}
                </button>
            </div>
        </div>
    );
}
