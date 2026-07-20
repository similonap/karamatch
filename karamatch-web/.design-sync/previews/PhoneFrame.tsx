import { Avatar, BackButton, GradientTile, MatchBadge, PhoneFrame } from "karamatch-web";

// PhoneFrame brings its own radial dark backdrop and a full-height 402x874
// device shell, so unlike the other components it needs no surface wrapper.

const screenTitle: React.CSSProperties = {
    fontFamily: "Unbounded, sans-serif",
    fontSize: 22,
    fontWeight: 700
};

const caption: React.CSSProperties = { color: "#9A8FB0", fontSize: 13 };

const matches = [
    { title: "Friday Night Pop", glyph: "🎤", host: "Ines Okafor", seed: "ines", meta: "Kokoro Karaoke · 21:00", pct: 82 },
    { title: "Rock Classics", glyph: "🎸", host: "Bram de Vries", seed: "bramdv", meta: "Sing Sing · 20:30", pct: 64 },
    { title: "Latin Hour", glyph: "💃", host: "Sofia Rossi", seed: "sofia", meta: "Casa Melodía · 22:00", pct: 47 }
];

// Named `Screen` because config.json pins PhoneFrame to cardMode "single" with
// primaryStory "Screen" — this is the export the card renders.
export function Screen() {
    return (
        <PhoneFrame>
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <BackButton onClick={() => {}} />
                    <div style={screenTitle}>Tonight</div>
                </div>

                <div style={{ color: "#B9AECF", fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>
                    YOUR MATCHES
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {matches.map(box => (
                        <div
                            key={box.title}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 14px",
                                borderRadius: 20,
                                border: "1px solid rgba(255,255,255,.1)",
                                background: "rgba(255,255,255,.04)"
                            }}
                        >
                            <GradientTile size={48} radius={14}>
                                {box.glyph}
                            </GradientTile>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{box.title}</div>
                                <div
                                    style={{
                                        ...caption,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}
                                >
                                    {box.meta}
                                </div>
                            </div>
                            <MatchBadge pct={box.pct} />
                        </div>
                    ))}
                </div>

                <div style={{ color: "#B9AECF", fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>
                    SINGERS NEAR YOU
                </div>

                <div style={{ display: "flex", gap: 14 }}>
                    {matches.map(box => (
                        <div
                            key={box.seed}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72 }}
                        >
                            <Avatar name={box.host} seed={box.seed} size={56} fontSize={21} />
                            <div
                                style={{
                                    fontSize: 12,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "100%"
                                }}
                            >
                                {box.host.split(" ")[0]}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    style={{
                        height: 56,
                        border: "none",
                        borderRadius: 18,
                        background: "linear-gradient(90deg,#FF3D8F,#B23DFF)",
                        color: "#fff",
                        fontSize: 17,
                        fontWeight: 700,
                        fontFamily: "Outfit, sans-serif",
                        cursor: "pointer",
                        width: "100%",
                        marginTop: 4
                    }}
                >
                    Host a box
                </button>
            </div>
        </PhoneFrame>
    );
}
