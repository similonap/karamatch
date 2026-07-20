import { EmptyCard } from "karamatch-web";

const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20
};

// The empty state from VenuesTab.
export function NoVenues() {
    return (
        <div style={surface}>
            <EmptyCard>
                No venues within 3 km.
                <br />
                Move your pin from the profile screen.
            </EmptyCard>
        </div>
    );
}

// From InviteFriends — an empty state that points at the fix.
export function NobodyToInvite() {
    return (
        <div style={surface}>
            <EmptyCard>
                Nobody left to invite.
                <br />
                Add more friends from the Friends tab.
            </EmptyCard>
        </div>
    );
}

// From Rate — a single short line, the most common shape.
export function OneLiner() {
    return (
        <div style={surface}>
            <EmptyCard>You sang this one solo — nobody to rate.</EmptyCard>
        </div>
    );
}
