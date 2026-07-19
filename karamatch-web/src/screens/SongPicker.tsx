import { useState } from "react";
import { api } from "../api";
import type { Song } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, inputStyle, primaryButton } from "../theme";
import { CheckRing, ErrorNote, Loading, useAsync, useDebounced } from "../ui";

const MAX_SONGS = 10;
const MIN_SONGS = 3;

// One row of the song list — shared with the profile editor.
export function SongRow({
    song,
    selected,
    onToggle,
    compact
}: {
    song: Song;
    selected: boolean;
    onToggle: () => void;
    compact?: boolean;
}) {
    const tile = compact ? 38 : 40;
    return (
        <div
            onClick={onToggle}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: compact ? "11px 14px" : "12px 14px",
                borderRadius: 14,
                cursor: "pointer",
                border: "1px solid " + (selected ? "rgba(255,61,143,.55)" : "rgba(255,255,255,.09)"),
                background: selected ? "rgba(255,61,143,.1)" : "rgba(255,255,255,.04)",
                flexShrink: 0
            }}
        >
            <div
                style={{
                    width: tile,
                    height: tile,
                    borderRadius: compact ? 11 : 12,
                    background: selected ? GRAD : "rgba(255,255,255,.09)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: compact ? 16 : 17,
                    color: "#fff",
                    flexShrink: 0
                }}
            >
                ♪
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: 15,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}
                >
                    {song.title}
                </div>
                <div
                    style={{
                        color: C.textMuted,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}
                >
                    {song.artist}
                </div>
            </div>
            <CheckRing on={selected} />
        </div>
    );
}

export default function SongPicker() {
    const app = useApp();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query);
    const [picked, setPicked] = useState<string[]>(app.me?.favoriteSongIds ?? []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const songs = useAsync(() => api.songs(debouncedQuery), [debouncedQuery]);

    function toggle(id: string) {
        if (picked.includes(id)) {
            setPicked(picked.filter(other => other !== id));
        } else if (picked.length < MAX_SONGS) {
            setPicked([...picked, id]);
        } else {
            app.toast("Max 10 songs — remove one first");
        }
    }

    const ready = picked.length >= MIN_SONGS && !busy;

    async function finish() {
        if (!ready) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await api.updateMe({ favoriteSongIds: picked });
            await app.refreshMe();
            app.goTab("venues");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 0 0", overflow: "hidden" }}>
            <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ color: C.pink, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>STEP 3 OF 3</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 24, fontWeight: 700 }}>
                        Your go-to songs
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>
                        {picked.length}/{MAX_SONGS}
                    </div>
                </div>
                <div style={{ color: C.textDim, fontSize: 14 }}>
                    Pick up to 10 songs you love to sing — we match you by taste.
                </div>
                <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search songs or artists"
                    style={{ ...inputStyle, height: 48, borderRadius: 14, fontSize: 15, padding: "0 16px" }}
                />
                {error ? <ErrorNote message={error} /> : null}
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "14px 24px 120px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                }}
            >
                {songs.loading ? <Loading /> : null}
                {songs.error ? <ErrorNote message={songs.error} /> : null}
                {(songs.data ?? []).map(song => (
                    <SongRow
                        key={song.id}
                        song={song}
                        selected={picked.includes(song.id)}
                        onToggle={() => toggle(song.id)}
                    />
                ))}
                {!songs.loading && (songs.data ?? []).length === 0 ? (
                    <div style={{ color: C.textMuted, fontSize: 14, textAlign: "center", padding: 20 }}>
                        No songs match "{query}".
                    </div>
                ) : null}
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "16px 24px 36px",
                    background: "linear-gradient(180deg,transparent,#0A0512 40%)"
                }}
            >
                <button onClick={finish} style={primaryButton(ready)}>
                    {busy
                        ? "Saving…"
                        : picked.length >= MIN_SONGS
                          ? "Find my people →"
                          : "Pick at least " + MIN_SONGS + " songs"}
                </button>
            </div>
        </div>
    );
}
