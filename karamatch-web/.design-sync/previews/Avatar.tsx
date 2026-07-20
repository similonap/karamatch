import { Avatar, MatchBadge } from "karamatch-web";

// Every KaraMatch component is designed against the dark app surface; on a light
// background the near-white text and translucent borders vanish.
const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20
};

export function Sizes() {
    return (
        <div style={{ ...surface, display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar name="Ines Okafor" seed="ines" size={104} fontSize={38} />
            <Avatar name="Bram de Vries" seed="bram" size={44} fontSize={17} />
            <Avatar name="Yuki Tanaka" seed="yuki" size={38} />
            <Avatar name="Sofia Rossi" seed="sofia" size={28} />
        </div>
    );
}

// avatarColor() hashes the seed, so a singer keeps one colour across screens.
export function Colours() {
    return (
        <div style={{ ...surface, display: "flex", gap: 10 }}>
            <Avatar name="Ines Okafor" seed="ines" size={44} fontSize={17} />
            <Avatar name="Bram de Vries" seed="bram" size={44} fontSize={17} />
            <Avatar name="Yuki Tanaka" seed="yuki" size={44} fontSize={17} />
            <Avatar name="Sofia Rossi" seed="sofia" size={44} fontSize={17} />
            <Avatar name="Tomás Silva" seed="tomas" size={44} fontSize={17} />
            <Avatar name="Priya Nair" seed="priya" size={44} fontSize={17} />
        </div>
    );
}

// The friend row from InviteFriends / Rate — the composition Avatar is built for.
export function InListRow() {
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
                { name: "Ines Okafor", username: "ines", rating: "4.8", pct: 82 },
                { name: "Bram de Vries", username: "bramdv", rating: "4.1", pct: 47 }
            ].map(friend => (
                <div
                    key={friend.username}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,.09)",
                        background: "rgba(255,255,255,.04)"
                    }}
                >
                    <Avatar name={friend.name} seed={friend.username} size={44} fontSize={17} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{friend.name}</div>
                        <div style={{ color: "#9A8FB0", fontSize: 13 }}>
                            @{friend.username} · ★ {friend.rating}
                        </div>
                    </div>
                    <MatchBadge pct={friend.pct} />
                </div>
            ))}
        </div>
    );
}
