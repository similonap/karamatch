import { api } from "../../api";
import { useApp } from "../../AppContext";
import { C, R, S, S2, T } from "../../design/tokens";
import { Icon } from "../../design/icons";
import { Card, EmptyState, ErrorNote, Pressable, Rating, ScrollBody, Skeleton, money, plural, useAsync } from "../../ui";

export default function VenuesTab() {
    const app = useApp();
    const venues = useAsync(() => api.venues(3), []);

    return (
        <ScrollBody bottomPad={S.md}>
            {/* Large title, then a tappable location chip — the location is the
                one input that changes this whole list, so it belongs in reach. */}
            <div style={{ paddingTop: S.xs, paddingBottom: S.sm, flexShrink: 0 }}>
                <h1 style={{ ...T.title, color: C.text, margin: 0 }}>Karaoke near you</h1>
                <Pressable
                    onClick={app.openLocationEditor}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        marginTop: S2.s6,
                        padding: "5px 10px 5px 8px",
                        borderRadius: R.sm,
                        background: C.surface2,
                        border: "1px solid " + C.border,
                        color: C.textDim
                    }}
                >
                    <Icon name="pin" size={13} strokeWidth={2} />
                    <span style={{ ...T.footnote, fontSize: 12, fontWeight: 600 }}>
                        {app.me?.location?.label || "Set your location"}
                    </span>
                    <Icon name="chevronRight" size={12} strokeWidth={2} style={{ opacity: 0.6 }} />
                </Pressable>
            </div>

            {venues.loading ? <Skeleton height={186} count={2} /> : null}
            {venues.error ? <ErrorNote message={venues.error} /> : null}

            {!venues.loading && !venues.error && (venues.data ?? []).length === 0 ? (
                <EmptyState
                    icon="pin"
                    title="Nothing within 3 km"
                    body="No karaoke venues near this pin yet. Try moving it somewhere busier."
                />
            ) : null}

            {(venues.data ?? []).map(venue => (
                <Card key={venue.id} onClick={() => app.openVenue(venue.id)} padded={false}>
                    <div
                        style={{
                            height: 124,
                            background: C.surface3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.textFaint,
                            position: "relative"
                        }}
                    >
                        {venue.imageUrl ? (
                            <img
                                src={venue.imageUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={event => {
                                    (event.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ) : (
                            <Icon name="mic" size={28} />
                        )}
                        {/* Distance rides on the image so the row below stays a
                            clean name/price line. */}
                        <div
                            style={{
                                position: "absolute",
                                top: S.sm,
                                left: S.sm,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                height: 24,
                                padding: "0 8px",
                                borderRadius: R.sm,
                                background: "rgba(7,4,13,.72)",
                                color: "#fff",
                                ...T.footnote,
                                fontSize: 11,
                                fontWeight: 700
                            }}
                        >
                            <Icon name="pin" size={12} strokeWidth={2} />
                            {venue.distanceKm} km
                        </div>
                    </div>

                    <div style={{ padding: S2.s12 + "px " + S.md + "px " + S.md + "px", display: "flex", flexDirection: "column", gap: S2.s6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: S.sm }}>
                            <div style={{ ...T.bodyStrong, fontSize: 16, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {venue.name}
                            </div>
                            <Rating value={venue.rating} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: S.sm, ...T.caption, color: C.textMuted }}>
                            <span>{plural(venue.rooms.length, "room", "rooms")}</span>
                            <span style={{ width: 3, height: 3, borderRadius: 2, background: C.textFaint }} />
                            <span style={{ color: C.cyan, fontWeight: 600 }}>from {money(venue.fromPrice)}/hr</span>
                        </div>
                    </div>
                </Card>
            ))}
        </ScrollBody>
    );
}
