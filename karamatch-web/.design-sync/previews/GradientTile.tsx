import { GradientTile } from "karamatch-web";

// The tile carries its own pink→purple gradient, but the surrounding labels and
// row chrome are dark-surface tokens, so wrap it like every other component.
const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20
};

const caption: React.CSSProperties = { color: "#9A8FB0", fontSize: 13 };

// size drives both the box and the glyph (fontSize = 45% of size).
export function Sizes() {
    return (
        <div style={{ ...surface, display: "flex", alignItems: "center", gap: 16 }}>
            <GradientTile size={72} radius={20}>
                🎤
            </GradientTile>
            <GradientTile size={54} radius={16}>
                🎤
            </GradientTile>
            <GradientTile size={40} radius={12}>
                🎤
            </GradientTile>
            <GradientTile size={28} radius={9}>
                🎤
            </GradientTile>
            <div style={caption}>72 · 54 · 40 · 28</div>
        </div>
    );
}

// radius is independent of size: square, soft, squircle, full circle.
export function Radii() {
    return (
        <div style={{ ...surface, display: "flex", alignItems: "center", gap: 16 }}>
            <GradientTile size={56} radius={0}>
                ♪
            </GradientTile>
            <GradientTile size={56} radius={10}>
                ♪
            </GradientTile>
            <GradientTile size={56} radius={18}>
                ♪
            </GradientTile>
            <GradientTile size={56} radius={28}>
                ♪
            </GradientTile>
            <div style={caption}>radius 0 · 10 · 18 · 28</div>
        </div>
    );
}

// Its real job: the leading thumbnail on a box / venue row.
export function AsThumbnail() {
    const boxes = [
        { glyph: "🎤", title: "Friday Night Pop", meta: "Kokoro Karaoke · 21:00 · 3 spots" },
        { glyph: "🎸", title: "Rock Classics", meta: "Sing Sing Antwerpen · 20:30 · full" },
        { glyph: "💃", title: "Latin Hour", meta: "Casa Melodía · 22:00 · 1 spot" }
    ];
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 8 }}>
            {boxes.map(box => (
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
                        <div style={{ ...caption, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {box.meta}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
