import { Avatar, ConfirmDialog } from "karamatch-web";

// ConfirmDialog is position:absolute/inset:0 — it dims its nearest positioned
// ancestor, not the browser window. In the app that ancestor is the PhoneFrame
// screen, so the preview recreates a screen-sized positioned box.
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
            {/* Screen content behind the dim, so the backdrop reads as a backdrop. */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Avatar name="Ines Okafor" seed="ines" size={88} fontSize={32} />
                <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>Ines Okafor</div>
                <div style={{ color: "#9A8FB0", fontSize: 14 }}>@ines · ★ 4.8</div>
            </div>
            {children}
        </div>
    );
}

// The real usage from UserProfile — removing a friend.
export function RemoveFriend() {
    return (
        <Screen>
            <ConfirmDialog
                title="Remove from friends?"
                body="@ines goes off your friends list, and you off theirs."
                confirmLabel="Remove"
                onConfirm={() => {}}
                onCancel={() => {}}
            />
        </Screen>
    );
}

// busy disables both buttons and swaps the confirm label to "Removing…".
export function Busy() {
    return (
        <Screen>
            <ConfirmDialog
                title="Remove from friends?"
                body="@ines goes off your friends list, and you off theirs."
                confirmLabel="Remove"
                busy
                onConfirm={() => {}}
                onCancel={() => {}}
            />
        </Screen>
    );
}
