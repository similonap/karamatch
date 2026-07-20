import { Spinner } from "karamatch-web";

const surface: React.CSSProperties = {
    background: "#0A0512",
    color: "#F5F1FA",
    fontFamily: "Outfit, sans-serif",
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 20
};

// The size Loading uses internally — the one that ships on every screen.
export function Default() {
    return (
        <div style={surface}>
            <Spinner size={40} />
        </div>
    );
}

// The full 64px default, used standalone on a blocking screen.
export function Large() {
    return (
        <div style={surface}>
            <Spinner />
        </div>
    );
}

// The size axis side by side. The ring is 3px at every size, so the smallest
// reads as a heavier stroke — worth seeing next to the others.
export function Sizes() {
    return (
        <div style={surface}>
            <Spinner size={24} />
            <Spinner size={40} />
            <Spinner size={64} />
        </div>
    );
}
