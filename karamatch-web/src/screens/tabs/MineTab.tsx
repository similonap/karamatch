import { api } from "../../api";
import { useApp } from "../../AppContext";
import { C, screenTitle, sectionLabel } from "../../theme";
import { Avatar, EmptyCard, ErrorNote, Loading, formatWhen, plural, useAsync } from "../../ui";

export default function MineTab() {
    const app = useApp();
    const mine = useAsync(() => api.myBoxes(), []);

    const upcoming = mine.data?.upcoming ?? [];
    const past = mine.data?.past ?? [];

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
            <div style={screenTitle}>My boxes</div>

            {mine.loading ? <Loading /> : null}
            {mine.error ? <ErrorNote message={mine.error} /> : null}

            {!mine.loading ? <div style={sectionLabel}>UPCOMING</div> : null}

            {!mine.loading && upcoming.length === 0 ? (
                <EmptyCard>
                    No upcoming boxes yet.
                    <br />
                    Book a venue or join a match to get started.
                </EmptyCard>
            ) : null}

            {upcoming.map(box => {
                const isHost = box.host.id === app.me?.id;
                return (
                    <div
                        key={box.id}
                        onClick={() => app.openRoom(box.id)}
                        style={{
                            borderRadius: 20,
                            border: "1px solid rgba(255,61,143,.4)",
                            background: "linear-gradient(135deg,rgba(255,61,143,.12),rgba(138,43,226,.1))",
                            padding: 16,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            boxShadow: "0 0 30px rgba(255,61,143,.15)",
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{box.title}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.pinkSoft, flexShrink: 0 }}>
                                {isHost ? "HOST" : "JOINED"}
                            </div>
                        </div>
                        <div style={{ color: C.textDim, fontSize: 13 }}>
                            {box.venue.name} · {formatWhen(box.start)} · {box.membersCount}/{box.capacity} singers
                        </div>
                        {isHost ? null : (
                            <div
                                onClick={event => {
                                    event.stopPropagation();
                                    app.openProfile(box.host.username);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    alignSelf: "flex-start",
                                    cursor: "pointer"
                                }}
                            >
                                <Avatar
                                    name={box.host.name}
                                    photoUrl={box.host.photoUrl}
                                    seed={box.host.id}
                                    size={26}
                                    fontSize={11}
                                />
                                <span style={{ color: C.textMuted, fontSize: 13 }}>
                                    hosted by @{box.host.username}
                                </span>
                            </div>
                        )}
                        <div style={{ color: C.cyan, fontSize: 13, fontWeight: 600 }}>Open room · chat &amp; invites →</div>
                    </div>
                );
            })}

            {!mine.loading ? <div style={{ ...sectionLabel, marginTop: 8 }}>PAST</div> : null}

            {!mine.loading && past.length === 0 ? (
                <EmptyCard>Nothing sung yet — your past nights will show up here.</EmptyCard>
            ) : null}

            {past.map(box => (
                <div
                    key={box.id}
                    onClick={() => app.openRoom(box.id)}
                    style={{
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,.1)",
                        background: "rgba(255,255,255,.04)",
                        padding: 16,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{box.title}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>
                            ended · {formatWhen(box.start)}
                        </div>
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 13 }}>
                        {box.venue.name} · {plural(box.membersCount, "singer", "singers")}
                    </div>
                    <div style={{ color: C.cyan, fontSize: 13, fontWeight: 600 }}>Open room · chat &amp; crew →</div>
                    {box.rated ? (
                        <div style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>★ Crew rated — thanks!</div>
                    ) : (
                        <button
                            onClick={event => {
                                event.stopPropagation();
                                app.openRate(box.id);
                            }}
                            style={{
                                height: 44,
                                border: "1px solid rgba(255,193,69,.45)",
                                borderRadius: 12,
                                background: "rgba(255,193,69,.08)",
                                color: C.gold,
                                fontWeight: 700,
                                fontSize: 14,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer"
                            }}
                        >
                            ★ Rate your crew
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
