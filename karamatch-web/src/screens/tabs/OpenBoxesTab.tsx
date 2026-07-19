import { useState } from "react";
import { api } from "../../api";
import type { BoxView } from "../../api";
import { useApp } from "../../AppContext";
import { C, GRAD, screenTitle } from "../../theme";
import { Avatar, EmptyCard, ErrorNote, Loading, formatWhen, money, plural, useAsync } from "../../ui";

export default function OpenBoxesTab() {
    const app = useApp();
    const boxes = useAsync(() => api.openBoxes(3), []);
    const [joining, setJoining] = useState<string | null>(null);

    async function join(box: BoxView) {
        setJoining(box.id);
        try {
            const result = await api.joinBox(box.id);
            app.startPay({
                kind: "join",
                boxId: result.boxId,
                amount: result.share,
                hostUsername: box.host.username
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
            <div style={screenTitle}>Open boxes</div>
            <div style={{ color: C.textDim, fontSize: 14, marginTop: -6 }}>
                Rooms with free spots — jump in and sing.
            </div>

            {boxes.loading ? <Loading label="Looking for open boxes…" /> : null}
            {boxes.error ? <ErrorNote message={boxes.error} /> : null}
            {!boxes.loading && (boxes.data ?? []).length === 0 ? (
                <EmptyCard>
                    No open boxes nearby right now.
                    <br />
                    Book one yourself from the Venues tab.
                </EmptyCard>
            ) : null}

            {(boxes.data ?? []).map(box => (
                <div
                    key={box.id}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{box.title}</div>
                            <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
                                {box.venue.name} · {formatWhen(box.start)}
                            </div>
                        </div>
                        <div
                            style={{
                                flexShrink: 0,
                                background: "rgba(41,224,255,.12)",
                                border: "1px solid rgba(41,224,255,.35)",
                                color: C.cyan,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: 999
                            }}
                        >
                            {plural(box.spotsOpen, "spot open", "spots open")}
                        </div>
                    </div>

                    <div
                        onClick={() => app.openProfile(box.host.username)}
                        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", alignSelf: "flex-start" }}
                    >
                        <Avatar
                            name={box.host.name}
                            photoUrl={box.host.photoUrl}
                            seed={box.host.id}
                            size={32}
                            fontSize={13}
                        />
                        <div style={{ color: C.textMuted, fontSize: 13 }}>
                            hosted by @{box.host.username} · {plural(box.membersCount, "singer", "singers")}
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontSize: 14, color: C.textDim }}>
                            your share <span style={{ color: C.text, fontWeight: 700 }}>{money(box.share)}</span>
                        </div>
                        <button
                            onClick={() => join(box)}
                            disabled={joining === box.id}
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
                                opacity: joining === box.id ? 0.6 : 1
                            }}
                        >
                            {joining === box.id ? "Joining…" : "Join"}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
