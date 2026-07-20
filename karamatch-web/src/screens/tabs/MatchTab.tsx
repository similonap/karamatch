import { useState } from "react";
import { api } from "../../api";
import type { MatchView } from "../../api";
import { useApp } from "../../AppContext";
import { C, GRAD, screenTitle } from "../../theme";
import { EmptyCard, ErrorNote, Loading, formatWhen, money, plural, useAsync } from "../../ui";

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
            <div style={screenTitle}>Find a match</div>
            <div style={{ color: C.textDim, fontSize: 14, marginTop: -6 }}>
                Parties ranked by how much their setlist overlaps with yours.
            </div>

            {matches.loading ? <Loading label="Scoring parties against your taste…" /> : null}
            {matches.error ? <ErrorNote message={matches.error} /> : null}
            {!matches.loading && (matches.data ?? []).length === 0 ? (
                <EmptyCard>
                    No matches nearby yet.
                    <br />
                    Add more favourite songs to widen the net.
                </EmptyCard>
            ) : null}

            {(matches.data ?? []).map(match => {
                const strong = match.matchPct >= 60;
                return (
                    <div
                        key={match.id}
                        style={{
                            borderRadius: 20,
                            border: "1px solid " + (strong ? "rgba(255,61,143,.5)" : "rgba(255,255,255,.1)"),
                            background: "rgba(255,255,255,.04)",
                            padding: 16,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            boxShadow: strong ? "0 0 26px rgba(255,61,143,.14)" : "none",
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div
                                style={{
                                    width: 58,
                                    height: 58,
                                    borderRadius: "50%",
                                    flexShrink: 0,
                                    background:
                                        "conic-gradient(#FF3D8F " + match.matchPct * 3.6 + "deg, rgba(255,255,255,.09) 0)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <div
                                    style={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: "50%",
                                        background: C.panel,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: 14,
                                        color: C.pinkSoft
                                    }}
                                >
                                    {match.matchPct}%
                                </div>
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{match.title}</div>
                                <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
                                    {match.venue.name} · {formatWhen(match.start)} ·{" "}
                                    {plural(match.spotsOpen, "spot open", "spots open")}
                                </div>
                            </div>
                        </div>

                        {match.commonSongs.length > 0 ? (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {match.commonSongs.map(title => (
                                    <span
                                        key={title}
                                        style={{
                                            fontSize: 12,
                                            color: C.cyan,
                                            background: "rgba(41,224,255,.1)",
                                            border: "1px solid rgba(41,224,255,.25)",
                                            padding: "3px 10px",
                                            borderRadius: 999
                                        }}
                                    >
                                        ♪ {title}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: C.textMuted }}>
                                No shared songs — matched on genre affinity.
                            </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontSize: 14, color: C.textDim }}>
                                your share <span style={{ color: C.text, fontWeight: 700 }}>{money(match.share)}</span>
                            </div>
                            <button
                                onClick={() => join(match)}
                                disabled={joining === match.id}
                                style={{
                                    height: 40,
                                    padding: "0 20px",
                                    border: "none",
                                    borderRadius: 12,
                                    background: GRAD,
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 14,
                                    fontFamily: "Outfit, sans-serif",
                                    cursor: "pointer",
                                    opacity: joining === match.id ? 0.6 : 1
                                }}
                            >
                                {joining === match.id ? "Joining…" : "Join match"}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
