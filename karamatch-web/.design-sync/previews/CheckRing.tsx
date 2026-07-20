import { Avatar, CheckRing, MatchBadge } from "karamatch-web";

// CheckRing is a translucent-bordered control drawn for the dark app surface —
// on a light background the "off" ring is invisible.
const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20
};

const caption: React.CSSProperties = { color: "#9A8FB0", fontSize: 13 };

// The whole variant axis: on = filled pink with a check, off = hollow ring.
export function States() {
    return (
        <div style={{ ...surface, display: "flex", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <CheckRing on={true} />
                <div style={caption}>on</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <CheckRing on={false} />
                <div style={caption}>off</div>
            </div>
        </div>
    );
}

// size defaults to 24; the border stays 2px so small rings read heavier.
export function Sizes() {
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <CheckRing on={true} size={32} />
                <CheckRing on={true} size={24} />
                <CheckRing on={true} size={18} />
                <div style={caption}>32 · 24 (default) · 18</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <CheckRing on={false} size={32} />
                <CheckRing on={false} size={24} />
                <CheckRing on={false} size={18} />
                <div style={caption}>same sizes, off</div>
            </div>
        </div>
    );
}

// SongPicker: the ring is the only selection affordance on a song row.
export function SongRows() {
    const songs = [
        { title: "Blinding Lights", artist: "The Weeknd", picked: true },
        { title: "Dancing Queen", artist: "ABBA", picked: true },
        { title: "Zombie", artist: "The Cranberries", picked: false },
        { title: "Non, je ne regrette rien", artist: "Édith Piaf", picked: false }
    ];
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 8 }}>
            {songs.map(song => (
                <div
                    key={song.title}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 16,
                        border: "1px solid " + (song.picked ? "rgba(255,61,143,.55)" : "rgba(255,255,255,.09)"),
                        background: song.picked ? "rgba(255,61,143,.1)" : "rgba(255,255,255,.04)"
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: 15,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                        >
                            {song.title}
                        </div>
                        <div style={{ ...caption, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {song.artist}
                        </div>
                    </div>
                    <CheckRing on={song.picked} />
                </div>
            ))}
        </div>
    );
}

// InviteFriends: the ring sits after the match badge on a friend row.
export function FriendRows() {
    const friends = [
        { name: "Ines Okafor", username: "ines", rating: "4.8", pct: 82, invited: true },
        { name: "Bram de Vries", username: "bramdv", rating: "4.1", pct: 47, invited: false },
        { name: "Yuki Tanaka", username: "yuki", rating: "4.6", pct: 71, invited: true }
    ];
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map(friend => (
                <div
                    key={friend.username}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 16,
                        border: "1px solid " + (friend.invited ? "rgba(255,61,143,.55)" : "rgba(255,255,255,.09)"),
                        background: friend.invited ? "rgba(255,61,143,.1)" : "rgba(255,255,255,.04)"
                    }}
                >
                    <Avatar name={friend.name} seed={friend.username} size={44} fontSize={17} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{friend.name}</div>
                        <div style={caption}>
                            @{friend.username} · ★ {friend.rating}
                        </div>
                    </div>
                    <MatchBadge pct={friend.pct} />
                    <CheckRing on={friend.invited} />
                </div>
            ))}
        </div>
    );
}
