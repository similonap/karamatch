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
    EmptyState,
    ErrorNote,
    MatchBadge,
    ScrollBody,
    Skeleton,
    StarInput,
    TextField,
    plural,
    useAsync
} from "../ui";

interface Draft {
    stars: number;
    text: string;
}

const STAR_WORDS = ["", "Rough night", "Off-key", "Solid", "Great voice", "Absolute star"];

export default function Rate() {
    const app = useApp();
    const partyId = app.ratePartyId;
    const crew = useAsync(() => api.crew(partyId!), [partyId]);
    const party = useAsync(() => api.party(partyId!), [partyId]);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function draftFor(username: string) {
        return drafts[username] ?? { stars: 0, text: "" };
    }

    function update(username: string, changes: Partial<Draft>) {
        setDrafts(current => ({ ...current, [username]: { ...draftFor(username), ...changes } }));
    }

    const rated = Object.values(drafts).filter(draft => draft.stars > 0).length;

    async function submit() {
        if (!partyId) {
            return;
        }
        // Only people you actually gave stars to get submitted.
        const ratings = Object.entries(drafts)
            .filter(([, draft]) => draft.stars > 0)
            .map(([username, draft]) => ({ username, stars: draft.stars, text: draft.text }));

        if (ratings.length === 0) {
            app.toast("Give at least one singer a star rating");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await api.rate(partyId, ratings);
            app.toast("Reviews posted — thanks!");
            app.goTab("mine");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    const crewList = crew.data ?? [];

    return (
        <>
            <AppBar
                title="Rate your crew"
                onBack={() => app.goTab("mine")}
                right={
                    crewList.length > 0 ? (
                        <span style={{ ...T.caption, color: C.textMuted, paddingRight: S.sm }}>
                            {rated}/{crewList.length}
                        </span>
                    ) : null
                }
            />

            <ScrollBody style={{ paddingTop: S2.s12 }}>
                {party.data ? (
                    <div style={{ ...T.caption, color: C.textMuted, flexShrink: 0 }}>
                        {party.data.title}
                        {party.data.venue?.name ? " · " + party.data.venue.name : ""}
                    </div>
                ) : null}

                {crew.loading ? <Skeleton height={190} count={2} /> : null}
                {crew.error ? <ErrorNote message={crew.error} /> : null}
                {error ? <ErrorNote message={error} /> : null}

                {!crew.loading && !crew.error && crewList.length === 0 ? (
                    <EmptyState icon="users" title="You sang this one solo" body="Nobody else to rate for this night." />
                ) : null}

                {crewList.map(member => {
                    const draft = draftFor(member.username);
                    return (
                        <Card key={member.id} style={{ gap: S2.s12 }} highlight={draft.stars > 0}>
                            <div style={{ display: "flex", alignItems: "center", gap: S2.s12 }}>
                                <Avatar name={member.name} photoUrl={member.photoUrl} seed={member.id} size={42} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ ...T.body, fontWeight: 700, color: C.text }}>{member.name}</div>
                                    <div style={{ ...T.caption, color: C.textMuted }}>@{member.username}</div>
                                </div>
                                <MatchBadge pct={member.matchPct} />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: S.sm }}>
                                <StarInput value={draft.stars} onChange={stars => update(member.username, { stars })} />
                                {draft.stars > 0 ? (
                                    <span style={{ ...T.caption, color: C.gold }}>{STAR_WORDS[draft.stars]}</span>
                                ) : null}
                            </div>

                            {/* The review box only appears once they have stars —
                                an empty textarea per person made this screen a wall. */}
                            {draft.stars > 0 ? (
                                <TextField
                                    value={draft.text}
                                    onChange={text => update(member.username, { text })}
                                    placeholder="Add a few words (optional)"
                                    multiline
                                    maxLength={280}
                                />
                            ) : null}
                        </Card>
                    );
                })}
            </ScrollBody>

            {crewList.length > 0 ? (
                <BottomBar>
                    <Button
                        label={busy ? "Posting" : rated > 0 ? "Post " + plural(rated, "review", "reviews") : "Rate someone first"}
                        onClick={submit}
                        disabled={rated === 0 || busy}
                        busy={busy}
                    />
                </BottomBar>
            ) : null}
        </>
    );
}
