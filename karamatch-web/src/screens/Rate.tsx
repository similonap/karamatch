import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, roundBack } from "../theme";
import { Avatar, EmptyCard, ErrorNote, Loading, MatchBadge, useAsync } from "../ui";

interface Draft {
    stars: number;
    text: string;
}

export default function Rate() {
    const app = useApp();
    const partyId = app.ratePartyId;
    const crew = useAsync(() => api.crew(partyId!), [partyId]);
    const party = useAsync(() => api.party(partyId!), [partyId]);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function draftFor(username: string) {
        return drafts[username] ?? { stars: 0, text: "" };
    }

    function update(username: string, changes: Partial<Draft>) {
        setDrafts(current => ({ ...current, [username]: { ...draftFor(username), ...changes } }));
    }

    async function submit() {
        if (!partyId) {
            return;
        }
        // Only people you actually gave stars to get submitted.
        const ratings = Object.entries(drafts)
            .filter(([, draft]) => draft.stars > 0)
            .map(([username, draft]) => ({ username, stars: draft.stars, text: draft.text }));

        if (ratings.length === 0) {
            app.toast("Give at least one singer a star rating");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await api.rate(partyId, ratings);
            app.toast("Reviews posted — thanks!");
            app.goTab("mine");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                padding: "24px 24px 40px",
                gap: 18
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => app.goTab("mine")} style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}>
                    ‹
                </button>
                <div>
                    <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>
                        Rate your crew
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 13 }}>
                        {party.data ? party.data.title + " · " + (party.data.venue?.name ?? "") : "…"}
                    </div>
                </div>
            </div>

            {crew.loading ? <Loading /> : null}
            {crew.error ? <ErrorNote message={crew.error} /> : null}
            {error ? <ErrorNote message={error} /> : null}
            {!crew.loading && (crew.data ?? []).length === 0 ? (
                <EmptyCard>You sang this one solo — nobody to rate.</EmptyCard>
            ) : null}

            {(crew.data ?? []).map(member => {
                const draft = draftFor(member.username);
                return (
                    <div
                        key={member.id}
                        style={{
                            borderRadius: 20,
                            border: "1px solid rgba(255,255,255,.1)",
                            background: "rgba(255,255,255,.04)",
                            padding: 16,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar
                                name={member.name}
                                photoUrl={member.photoUrl}
                                seed={member.id}
                                size={44}
                                fontSize={17}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</div>
                                <div style={{ color: C.textMuted, fontSize: 12 }}>@{member.username}</div>
                            </div>
                            <MatchBadge pct={member.matchPct} />
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => update(member.username, { stars: star })}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        border: "none",
                                        background: "none",
                                        fontSize: 26,
                                        cursor: "pointer",
                                        color: star <= draft.stars ? C.gold : "rgba(255,255,255,.18)",
                                        padding: 0
                                    }}
                                >
                                    ★
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={draft.text}
                            onChange={event => update(member.username, { text: event.target.value })}
                            placeholder="Write a short review…"
                            rows={2}
                            style={{
                                borderRadius: 12,
                                border: "1px solid rgba(255,255,255,.14)",
                                background: "rgba(255,255,255,.06)",
                                color: C.text,
                                padding: "10px 14px",
                                fontSize: 14,
                                fontFamily: "Outfit, sans-serif",
                                resize: "none"
                            }}
                        />
                    </div>
                );
            })}

            <button
                onClick={submit}
                disabled={busy}
                style={{
                    height: 56,
                    border: "none",
                    borderRadius: 18,
                    background: GRAD,
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: 700,
                    fontFamily: "Outfit, sans-serif",
                    cursor: "pointer",
                    flexShrink: 0,
                    opacity: busy ? 0.6 : 1
                }}
            >
                {busy ? "Posting…" : "Submit reviews"}
            </button>
        </div>
    );
}
