import { useState } from "react";
import { api } from "../../api";
import type { PartyView } from "../../api";
import { useApp } from "../../AppContext";
import { C, S, S2, T } from "../../design/tokens";
import { Avatar, Button, Card, Chip, EmptyState, ErrorNote, Pressable, ScrollBody, Skeleton, formatWhen, money, plural, useAsync } from "../../ui";

export default function OpenPartiesTab() {
    const app = useApp();
    const parties = useAsync(() => api.openParties(3), []);
    const [joining, setJoining] = useState<string | null>(null);

    async function join(party: PartyView) {
        setJoining(party.id);
        try {
            const result = await api.joinParty(party.id);
            app.startPay({
                kind: "join",
                partyId: result.partyId,
                amount: result.share,
                hostUsername: party.host.username
            });
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setJoining(null);
        }
    }

    return (
        <ScrollBody bottomPad={S.md}>
            <div style={{ paddingTop: S.xs, paddingBottom: S.sm, flexShrink: 0 }}>
                <h1 style={{ ...T.title, color: C.text, margin: 0 }}>Open parties</h1>
                <div style={{ ...T.caption, color: C.textMuted, marginTop: 3 }}>
                    Rooms with free spots — jump in and sing.
                </div>
            </div>

            {parties.loading ? <Skeleton height={150} count={3} /> : null}
            {parties.error ? <ErrorNote message={parties.error} /> : null}

            {!parties.loading && !parties.error && (parties.data ?? []).length === 0 ? (
                <EmptyState
                    icon="mic"
                    title="No open parties nearby"
                    body="Nobody has a free spot right now. You could book a room yourself."
                    action={<Button label="Browse venues" variant="tinted" size="md" onClick={() => app.goTab("venues")} />}
                />
            ) : null}

            {(parties.data ?? []).map(party => (
                <Card key={party.id} style={{ gap: S2.s12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: S2.s10 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ ...T.bodyStrong, fontSize: 16, color: C.text }}>{party.title}</div>
                            <div style={{ ...T.caption, color: C.textMuted, marginTop: 2 }}>
                                {party.venue.name} · {formatWhen(party.start)}
                            </div>
                        </div>
                        <Chip label={plural(party.spotsOpen, "spot", "spots")} tone="cyan" />
                    </div>

                    <Pressable
                        onClick={() => app.openProfile(party.host.username)}
                        scaleTo={1}
                        style={{ display: "flex", alignItems: "center", gap: S.sm, alignSelf: "flex-start" }}
                    >
                        <Avatar name={party.host.name} photoUrl={party.host.photoUrl} seed={party.host.id} size={28} />
                        <div style={{ ...T.caption, color: C.textMuted }}>
                            @{party.host.username} · {plural(party.membersCount, "singer", "singers")}
                        </div>
                    </Pressable>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: S2.s12,
                            paddingTop: S2.s12,
                            borderTop: "1px solid " + C.border
                        }}
                    >
                        <div style={{ ...T.caption, color: C.textMuted }}>
                            Your share <span style={{ ...T.bodyStrong, color: C.text }}>{money(party.share)}</span>
                        </div>
                        <Button
                            label={joining === party.id ? "Joining" : "Join"}
                            variant="tinted"
                            size="md"
                            busy={joining === party.id}
                            onClick={() => join(party)}
                        />
                    </div>
                </Card>
            ))}
        </ScrollBody>
    );
}
