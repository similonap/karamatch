import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, S, S2, T } from "../design/tokens";
import {
    AppBar,
    Avatar,
    BottomBar,
    Button,
    Card,
    Chip,
    ErrorNote,
    Loading,
    Rating,
    ScrollBody,
    Section,
    StarInput,
    StarRow,
    TextField,
    formatAgo,
    plural,
    useAsync
} from "../ui";

// The word under the stars, so the number is never the only feedback.
const STAR_WORDS = ["", "Would not go back", "Off night", "Does the job", "Really good", "Best room in town"];

// How many of the venue's existing reviews to show for context. Enough to see
// what kind of place it is, not so many that the form scrolls away.
const CONTEXT_REVIEWS = 3;

export default function VenueReview() {
    const app = useApp();
    const partyId = app.reviewPartyId;
    const party = useAsync(() => api.party(partyId!), [partyId]);
    const venueId = party.data?.venue?.id ?? null;
    // Only loads once the party told us which venue it was at.
    const reviews = useAsync(() => (venueId ? api.venueReviews(venueId) : Promise.resolve([])), [venueId]);
    const venue = useAsync(() => (venueId ? api.venue(venueId) : Promise.resolve(null)), [venueId]);

    const [stars, setStars] = useState(0);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        if (!partyId || stars === 0) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await api.reviewVenue(partyId, stars, text.trim());
            app.refreshNotifCount();
            app.toast("Review posted — thanks!");
            app.closeVenueReview();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    if (party.loading) {
        return (
            <>
                <AppBar onBack={app.closeVenueReview} />
                <Loading label="Opening the review…" />
            </>
        );
    }

    if (party.error || !party.data) {
        return (
            <>
                <AppBar title="Review the venue" onBack={app.closeVenueReview} />
                <ScrollBody style={{ paddingTop: S.md }}>
                    <ErrorNote message={party.error ?? "Party not found"} />
                </ScrollBody>
            </>
        );
    }

    const data = party.data;
    const others = (reviews.data ?? []).slice(0, CONTEXT_REVIEWS);

    return (
        <>
            <AppBar title="Review the venue" onBack={app.closeVenueReview} />

            <ScrollBody style={{ paddingTop: S2.s12 }}>
                <div style={{ flexShrink: 0 }}>
                    <h1 style={{ ...T.title, color: C.text, margin: 0 }}>{data.venue?.name ?? "This venue"}</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginTop: S2.s6, ...T.caption, color: C.textMuted }}>
                        {venue.data && venue.data.reviewsCount > 0 ? (
                            <>
                                <Rating value={venue.data.rating} />
                                <span style={{ width: 3, height: 3, borderRadius: 2, background: C.textFaint }} />
                                <span>{plural(venue.data.reviewsCount, "review", "reviews")}</span>
                                <span style={{ width: 3, height: 3, borderRadius: 2, background: C.textFaint }} />
                            </>
                        ) : null}
                        <span>after {data.title}</span>
                    </div>
                </div>

                {data.venueReviewed ? (
                    <Chip label="You already reviewed this night" icon="check" tone="green" />
                ) : (
                    <Card style={{ gap: S.md }} highlight={stars > 0}>
                        <div style={{ ...T.bodyStrong, color: C.text }}>How was the place?</div>

                        <div style={{ display: "flex", alignItems: "center", gap: S.sm }}>
                            <StarInput value={stars} onChange={setStars} />
                            {stars > 0 ? <span style={{ ...T.caption, color: C.gold }}>{STAR_WORDS[stars]}</span> : null}
                        </div>

                        {/* Same rule as rating your crew: the words only appear
                            once there are stars to explain. */}
                        {stars > 0 ? (
                            <TextField
                                value={text}
                                onChange={setText}
                                placeholder="Sound, rooms, staff, drinks… (optional)"
                                multiline
                                maxLength={280}
                            />
                        ) : null}
                    </Card>
                )}

                {error ? <ErrorNote message={error} /> : null}

                {others.length > 0 ? (
                    <Section title="What others said">
                        {others.map(review => (
                            <Card key={review.id} style={{ gap: S2.s6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: S2.s10 }}>
                                    <Avatar
                                        name={review.from?.name ?? "Someone"}
                                        photoUrl={review.from?.photoUrl ?? null}
                                        seed={review.from?.id ?? 0}
                                        size={28}
                                    />
                                    <div style={{ flex: 1, minWidth: 0, ...T.captionStrong, color: C.text }}>
                                        {review.from?.name ?? "A singer"}
                                    </div>
                                    <StarRow value={review.stars} />
                                    <span style={{ ...T.footnote, color: C.textFaint }}>{formatAgo(review.createdAt)}</span>
                                </div>
                                {review.text ? (
                                    <div style={{ ...T.caption, color: C.textDim }}>{review.text}</div>
                                ) : null}
                            </Card>
                        ))}
                    </Section>
                ) : null}
            </ScrollBody>

            {data.venueReviewed ? null : (
                <BottomBar>
                    <Button
                        label={busy ? "Posting" : stars > 0 ? "Post review" : "Pick a rating first"}
                        onClick={submit}
                        disabled={stars === 0 || busy}
                        busy={busy}
                    />
                </BottomBar>
            )}
        </>
    );
}
