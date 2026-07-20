import { Avatar, Toast } from "karamatch-web";

// Toast is position:absolute (bottom:110, left/right:24) — it anchors to its
// nearest positioned ancestor, which in the app is the PhoneFrame screen.
// The preview recreates a screen-sized positioned box so it sits where it
// really sits, floating above the tab bar rather than the browser viewport.
function Screen({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                position: "relative",
                width: 360,
                height: 420,
                overflow: "hidden",
                borderRadius: 24,
                background: "linear-gradient(180deg,#0D0718 0%,#0A0512 100%)",
                color: "#F5F1FA",
                fontFamily: "Outfit, sans-serif"
            }}
        >
            {/* Screen content behind the toast, so it reads as an overlay. */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>Friends</div>
                {[
                    { name: "Ines Okafor", handle: "@ines", seed: "ines" },
                    { name: "Rafael Duarte", handle: "@rafa", seed: "rafa" },
                    { name: "Mei Tanaka", handle: "@mei", seed: "mei" }
                ].map(person => (
                    <div key={person.handle} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar name={person.name} seed={person.seed} size={44} fontSize={16} />
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 600 }}>{person.name}</div>
                            <div style={{ color: "#9A8FB0", fontSize: 13 }}>{person.handle}</div>
                        </div>
                    </div>
                ))}
            </div>
            {children}
        </div>
    );
}

// The success toast from UserProfile after adding someone.
export function AddedToFriends() {
    return (
        <Screen>
            <Toast message="@ines added to friends" />
        </Screen>
    );
}

// The confirmation toast from Profile after saving — short, with the ✓ the
// app appends to "done" messages.
export function ProfileUpdated() {
    return (
        <Screen>
            <Toast message="Profile updated ✓" />
        </Screen>
    );
}

// A longer message that wraps onto a second line — from Profile's song limit.
export function Wrapping() {
    return (
        <Screen>
            <Toast message="Max 10 songs — remove one before you add another favourite" />
        </Screen>
    );
}
