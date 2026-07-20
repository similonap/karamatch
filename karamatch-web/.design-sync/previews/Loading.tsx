import { Loading } from "karamatch-web";

// Loading is flex:1 and centres itself, so it needs a parent with real height
// to centre inside — otherwise it collapses to the spinner alone.
const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    width: 320,
    height: 200
};

// The bare form used by list tabs (Rate, Notifications, FriendsTab) where the
// screen header already says what is loading.
export function NoLabel() {
    return (
        <div style={surface}>
            <Loading />
        </div>
    );
}

// The labelled form from VenuesTab — the longest label in the app.
export function WithLabel() {
    return (
        <div style={surface}>
            <Loading label="Finding karaoke near you…" />
        </div>
    );
}

// Short labels from PartyRoom and UserProfile — the common "opening X" shape.
export function ShortLabel() {
    return (
        <div style={surface}>
            <Loading label="Opening the room…" />
        </div>
    );
}
