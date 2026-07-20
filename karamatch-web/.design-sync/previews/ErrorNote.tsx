import { ErrorNote } from "karamatch-web";

const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20
};

// The shortest real message in the app — from Pay, when the cart is empty.
export function Short() {
    return (
        <div style={surface}>
            <ErrorNote message="Nothing to pay for." />
        </div>
    );
}

// The "not found" fallbacks used by VenueDetail, PartyRoom and UserProfile.
export function NotFound() {
    return (
        <div style={{ ...surface, display: "flex", flexDirection: "column", gap: 10 }}>
            <ErrorNote message="Venue not found" />
            <ErrorNote message="Party not found" />
            <ErrorNote message="Singer not found" />
        </div>
    );
}

// A longer validation message from Register that wraps to multiple lines —
// the padding and pink border have to hold around a block of text.
export function Wrapping() {
    return (
        <div style={{ ...surface, maxWidth: 340 }}>
            <ErrorNote message="That email is already registered. Sign in instead, or use the password reset link on the sign-in screen." />
        </div>
    );
}
