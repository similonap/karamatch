import { BackButton } from "karamatch-web";

// Every KaraMatch component is designed against the dark app surface; on a light
// background the near-white glyph and the translucent border vanish completely.
const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20
};

const screenTitle: React.CSSProperties = {
    fontFamily: "Unbounded, sans-serif",
    fontSize: 22,
    fontWeight: 700
};

// The bare control: a 38px round button with a chevron, sitting on the app
// background it was drawn for.
export function Standalone() {
    return (
        <div style={{ ...surface, display: "flex", alignItems: "center", gap: 14 }}>
            <BackButton onClick={() => {}} />
            <div style={{ color: "#9A8FB0", fontSize: 13 }}>38&thinsp;px · rgba(255,255,255,.06) fill</div>
        </div>
    );
}

// How it is actually used: leading the header row of a pushed screen.
export function ScreenHeader() {
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <BackButton onClick={() => {}} />
                <div style={screenTitle}>Pick your songs</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <BackButton onClick={() => {}} />
                <div style={screenTitle}>Invite friends</div>
            </div>
        </div>
    );
}

// The header of a booking screen — back, a two-line title block, and a trailing
// counter. The button holds its 38px size next to taller content (flexShrink: 0).
export function HeaderWithTrailing() {
    return (
        <div style={{ ...surface }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <BackButton onClick={() => {}} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...screenTitle, fontSize: 20 }}>Kokoro Karaoke</div>
                    <div style={{ color: "#9A8FB0", fontSize: 13 }}>Antwerpen · 1.2 km away</div>
                </div>
                <div
                    style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,61,143,.55)",
                        background: "rgba(255,61,143,.12)",
                        color: "#FF6FAE",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0
                    }}
                >
                    3 rooms
                </div>
            </div>
        </div>
    );
}
