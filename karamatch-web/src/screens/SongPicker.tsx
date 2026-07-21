import { useState } from "react";
import { api } from "../api";
import type { Song } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, LAYOUT, R, S, S2, T } from "../design/tokens";
import { Icon } from "../design/icons";
import {
    BottomBar,
    Button,
    CheckRing,
    EmptyState,
    ErrorNote,
    Pressable,
    ScrollBody,
    SearchField,
    Skeleton,
    StepHeader,
    useAsync,
    useDebounced
} from "../ui";

const MAX_SONGS = 10;
const MIN_SONGS = 3;

// One row of the song list — shared with the profile editor.
export function SongRow({
    song,
    selected,
    onToggle
}: {
    song: Song;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <Pressable
            onClick={onToggle}
            scaleTo={0.99}
            opacityTo={0.75}
            style={{
                display: "flex",
                alignItems: "center",
                gap: S2.s12,
                padding: "10px 12px",
                borderRadius: R.md,
                border: "1px solid " + (selected ? C.tintBorder : C.border),
                background: selected ? C.tintBg : C.surface1,
                flexShrink: 0,
                transition: "background 140ms ease, border-color 140ms ease"
            }}
        >
            <div
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: R.sm,
                    background: selected ? GRAD : C.surface3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: selected ? "#fff" : C.textFaint,
                    flexShrink: 0
                }}
            >
                <Icon name="music" size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...T.body, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {song.title}
                </div>
                <div style={{ ...T.caption, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {song.artist}
                </div>
            </div>
            <CheckRing on={selected} />
        </Pressable>
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
    const remaining = MIN_SONGS - picked.length;

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
        <>
            {/* The header is fixed while only the list scrolls, so the search
                field and the running count stay reachable. */}
            <div
                style={{
                    flexShrink: 0,
                    padding: S.md + "px " + LAYOUT.gutter + "px " + S2.s12 + "px",
                    display: "flex",
                    flexDirection: "column",
                    gap: S2.s12
                }}
            >
                <StepHeader
                    step={3}
                    total={3}
                    title="Your go-to songs"
                    subtitle="Pick up to 10 songs you love to sing — we match you by taste."
                    trailing={
                        <span style={{ ...T.captionStrong, color: picked.length >= MIN_SONGS ? C.cyan : C.textMuted }}>
                            {picked.length}/{MAX_SONGS}
                        </span>
                    }
                />
                <SearchField value={query} onChange={setQuery} placeholder="Search songs or artists" />
                {error ? <ErrorNote message={error} /> : null}
            </div>

            <ScrollBody gap={S.sm} bottomPad={S.md}>
                {songs.loading ? <Skeleton height={60} count={5} radius={12} /> : null}
                {songs.error ? <ErrorNote message={songs.error} /> : null}

                {(songs.data ?? []).map(song => (
                    <SongRow key={song.id} song={song} selected={picked.includes(song.id)} onToggle={() => toggle(song.id)} />
                ))}

                {!songs.loading && (songs.data ?? []).length === 0 ? (
                    <EmptyState icon="search" title="No songs found" body={query ? "Nothing matches “" + query + "”." : undefined} />
                ) : null}
            </ScrollBody>

            <BottomBar>
                <Button
                    label={busy ? "Saving" : ready ? "Find my people" : "Pick " + remaining + " more"}
                    onClick={finish}
                    disabled={!ready}
                    busy={busy}
                />
            </BottomBar>
        </>
    );
}
