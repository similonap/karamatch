import { Avatar, MatchBadge } from "karamatch-web";

const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 10
};

// pct >= 60 is the "strong match" threshold — pink text, pink border, pink
// wash. 60 itself is the boundary and is included on purpose.
export function Strong() {
    return (
        <div style={surface}>
            <MatchBadge pct={92} />
            <MatchBadge pct={74} />
            <MatchBadge pct={60} />
        </div>
    );
}

// Below 60 drops to the muted treatment: grey text on a plain white-alpha
// border. 59 sits one point under the threshold.
export function Muted() {
    return (
        <div style={surface}>
            <MatchBadge pct={59} />
            <MatchBadge pct={38} />
            <MatchBadge pct={7} />
        </div>
    );
}

// The real usage from FriendsTab — the badge trailing a friend row, which is
// the only place it appears. Note MatchBadge renders nothing at all when pct
// is null (that row is you), which is why there is no null cell here.
export function InFriendRow() {
    return (
        <div style={{ ...surface, flexDirection: "column", alignItems: "stretch", width: 320, gap: 14 }}>
            {[
                { name: "Ines Okafor", handle: "@ines", seed: "ines", pct: 92 },
                { name: "Rafael Duarte", handle: "@rafa", seed: "rafa", pct: 64 },
                { name: "Mei Tanaka", handle: "@mei", seed: "mei", pct: 41 }
            ].map(person => (
                <div key={person.handle} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={person.name} seed={person.seed} size={44} fontSize={16} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{person.name}</div>
                        <div style={{ color: "#9A8FB0", fontSize: 13 }}>{person.handle}</div>
                    </div>
                    <MatchBadge pct={person.pct} />
                </div>
            ))}
        </div>
    );
}
