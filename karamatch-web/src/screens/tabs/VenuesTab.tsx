import { api } from "../../api";
import { useApp } from "../../AppContext";
import { C, screenTitle } from "../../theme";
import { EmptyCard, ErrorNote, Loading, money, useAsync } from "../../ui";

export default function VenuesTab() {
    const app = useApp();
    const venues = useAsync(() => api.venues(3), []);

    return (
        <div
            style={{
                flex: 1,
                overflow: "auto",
                padding: "4px 24px 110px",
                display: "flex",
                flexDirection: "column",
                gap: 14
            }}
        >
            <div style={screenTitle}>
                Karaoke near you
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: C.textDim,
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: 400
                    }}
                >
                    ◎ {app.me?.location?.label || "Set location"}
                </div>
            </div>

            {venues.loading ? <Loading label="Finding karaoke near you…" /> : null}
            {venues.error ? <ErrorNote message={venues.error} /> : null}
            {!venues.loading && (venues.data ?? []).length === 0 ? (
                <EmptyCard>
                    No venues within 3 km.
                    <br />
                    Move your pin from the profile screen.
                </EmptyCard>
            ) : null}

            {(venues.data ?? []).map(venue => (
                <div
                    key={venue.id}
                    onClick={() => app.openVenue(venue.id)}
                    style={{
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,.1)",
                        background: "rgba(255,255,255,.04)",
                        overflow: "hidden",
                        cursor: "pointer",
                        flexShrink: 0
                    }}
                >
                    <div
                        style={{
                            height: 110,
                            background: "repeating-linear-gradient(45deg,#2A1548,#2A1548 10px,#1C0E33 10px,#1C0E33 20px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {venue.imageUrl ? (
                            <img
                                src={venue.imageUrl}
                                alt={venue.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={event => {
                                    (event.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ) : null}
                    </div>
                    <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{venue.name}</div>
                            <div
                                style={{
                                    color: C.gold,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    whiteSpace: "nowrap"
                                }}
                            >
                                ★ {venue.rating.toFixed(1)}
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                color: C.textMuted,
                                fontSize: 13,
                                flexWrap: "wrap"
                            }}
                        >
                            <span>{venue.distanceKm} km</span>
                            <span>·</span>
                            <span>{venue.rooms.length} parties</span>
                            <span>·</span>
                            <span style={{ color: C.cyan }}>from {money(venue.fromPrice)}/hr</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
