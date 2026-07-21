import { useState } from "react";
import { api } from "../../api";
import type { MatchView } from "../../api";
import { useApp } from "../../AppContext";
import { C, S, S2, T } from "../../design/tokens";
import { Button, Card, Chip, EmptyState, ErrorNote, ScrollBody, Skeleton, formatWhen, money, plural, useAsync } from "../../ui";

export default function MatchTab() {
    const app = useApp();
    const matches = useAsync(() => api.matches(3, 0), []);
    const [joining, setJoining] = useState<string | null>(null);

    async function join(match: MatchView) {
        setJoining(match.id);
        try {
            const result = await api.joinParty(match.id);
            app.startPay({
                kind: "join",
                partyId: result.partyId,
                amount: result.share,
                hostUsername: match.host.username
            });
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setJoining(null);
        }
    }

    return (
        <ScrollBody bottomPad={S.md}>
            <div style={{ paddingTop: S.xs, paddingBottom: S.sm, flexShrink: 0 }}>
                <h1 style={{ ...T.title, color: C.text, margin: 0 }}>Find a match</h1>
                <div style={{ ...T.caption, color: C.textMuted, marginTop: 3 }}>
                    Parties ranked by how much their setlist overlaps with yours.
                </div>
            </div>

            {matches.loading ? <Skeleton height={160} count={3} /> : null}
            {matches.error ? <ErrorNote message={matches.error} /> : null}

            {!matches.loading && !matches.error && (matches.data ?? []).length === 0 ? (
                <EmptyState
                    icon="spark"
                    title="No matches yet"
                    body="Add more favourite songs and we can widen the net."
                    action={<Button label="Edit your songs" variant="tinted" size="md" onClick={() => app.go("songs")} />}
                />
            ) : null}

            {(matches.data ?? []).map(match => {
                const strong = match.matchPct >= 60;
                return (
                    <Card key={match.id} highlight={strong} style={{ gap: S2.s12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: S2.s12 }}>
                            <MatchRing pct={match.matchPct} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ ...T.bodyStrong, fontSize: 16, color: C.text }}>{match.title}</div>
                                <div style={{ ...T.caption, color: C.textMuted, marginTop: 2 }}>
                                    {match.venue.name} · {formatWhen(match.start)}
                                </div>
                                <div style={{ ...T.caption, color: C.textMuted }}>
                                    {plural(match.spotsOpen, "spot open", "spots open")}
                                </div>
                            </div>
                        </div>

                        {match.commonSongs.length > 0 ? (
                            <div style={{ display: "flex", gap: S.xs, flexWrap: "wrap" }}>
                                {match.commonSongs.map(title => (
                                    <Chip key={title} label={title} icon="music" tone="cyan" />
                                ))}
                            </div>
                        ) : (
                            <div style={{ ...T.footnote, fontSize: 12, color: C.textFaint }}>
                                No shared songs — matched on genre affinity.
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: S2.s12,
                                paddingTop: S2.s12,
                                borderTop: "1px solid " + C.border
                            }}
                        >
                            <div style={{ ...T.caption, color: C.textMuted }}>
                                Your share{" "}
                                <span style={{ ...T.bodyStrong, color: C.text }}>{money(match.share)}</span>
                            </div>
                            <Button
                                label={joining === match.id ? "Joining" : "Join"}
                                variant="tinted"
                                size="md"
                                busy={joining === match.id}
                                onClick={() => join(match)}
                            />
                        </div>
                    </Card>
                );
            })}
        </ScrollBody>
    );
}

// The compatibility score as a progress ring. It is the single most important
// number on this screen, so it gets the geometry rather than a text pill.
function MatchRing({ pct }: { pct: number }) {
    const strong = pct >= 60;
    return (
        <div
            style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                    "conic-gradient(" + (strong ? "#FF3D8F" : "#8D82A5") + " " + pct * 3.6 + "deg, var(--km-surface-3) 0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <div
                style={{
                    width: 45,
                    height: 45,
                    borderRadius: "50%",
                    background: C.surface1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: strong ? C.tintSoft : C.textDim
                }}
            >
                <span style={{ ...T.captionStrong, fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{pct}</span>
                <span style={{ ...T.footnote, fontSize: 8, opacity: 0.75, lineHeight: 1, marginTop: 1 }}>MATCH</span>
            </div>
        </div>
    );
}
