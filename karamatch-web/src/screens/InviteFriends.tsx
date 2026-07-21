import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, R, S, S2, T } from "../design/tokens";
import { StarIcon } from "../design/icons";
import {
    AppBar,
    Avatar,
    BottomBar,
    Button,
    CheckRing,
    EmptyState,
    ErrorNote,
    MatchBadge,
    Pressable,
    ScrollBody,
    Skeleton,
    plural,
    useAsync
} from "../ui";

export default function InviteFriends() {
    const app = useApp();
    const partyId = app.partyId;
    const friends = useAsync(() => api.friends(), []);
    const room = useAsync(() => api.party(partyId!), [partyId]);
    const [selected, setSelected] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const party = room.data;
    // Only people who are not already in the party or pending an invite.
    const invitable = (friends.data ?? []).filter(friend => {
        if (!party) {
            return true;
        }
        return (
            !party.members.some(member => member.id === friend.id) &&
            !party.invitedUsernames.includes(friend.username)
        );
    });

    function toggle(username: string) {
        setSelected(current =>
            current.includes(username) ? current.filter(other => other !== username) : [...current, username]
        );
    }

    async function send() {
        if (selected.length === 0 || !partyId) {
            return;
        }
        setBusy(true);
        try {
            const result = await api.invite(partyId, selected);
            app.toast(plural(result.invited.length, "invite sent", "invites sent"));
            app.go("room");
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <AppBar
                title="Invite friends"
                onBack={() => app.go("room")}
                right={
                    party ? (
                        <span style={{ ...T.caption, color: C.textMuted, paddingRight: S.sm }}>
                            {plural(party.spotsLeft, "spot", "spots")}
                        </span>
                    ) : null
                }
            />

            <ScrollBody gap={S.sm} style={{ paddingTop: S2.s12 }}>
                {friends.loading || room.loading ? <Skeleton height={66} count={4} radius={12} /> : null}
                {friends.error ? <ErrorNote message={friends.error} /> : null}

                {!friends.loading && !friends.error && invitable.length === 0 ? (
                    <EmptyState
                        icon="userPlus"
                        title="Nobody left to invite"
                        body="Everyone you know is already here. Add more friends to widen the crew."
                        action={<Button label="Find friends" variant="tinted" size="md" onClick={() => app.goTab("friends")} />}
                    />
                ) : null}

                {invitable.map(friend => {
                    const on = selected.includes(friend.username);
                    return (
                        <Pressable
                            key={friend.id}
                            onClick={() => toggle(friend.username)}
                            scaleTo={0.99}
                            opacityTo={0.75}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: S2.s12,
                                padding: "10px 12px",
                                borderRadius: R.md,
                                border: "1px solid " + (on ? C.tintBorder : C.border),
                                background: on ? C.tintBg : C.surface1,
                                flexShrink: 0,
                                transition: "background 140ms ease, border-color 140ms ease"
                            }}
                        >
                            <Avatar name={friend.name} photoUrl={friend.photoUrl} seed={friend.id} size={42} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ ...T.body, fontWeight: 600, color: C.text }}>{friend.name}</div>
                                <div style={{ ...T.caption, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                                    @{friend.username}
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: C.gold }}>
                                        <StarIcon size={10} />
                                        {friend.singerRating.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                            <MatchBadge pct={friend.matchPct} />
                            <CheckRing on={on} />
                        </Pressable>
                    );
                })}
            </ScrollBody>

            <BottomBar>
                <Button
                    label={
                        busy
                            ? "Sending"
                            : selected.length > 0
                              ? "Send " + plural(selected.length, "invite", "invites")
                              : "Select friends to invite"
                    }
                    onClick={send}
                    disabled={selected.length === 0 || busy}
                    busy={busy}
                />
            </BottomBar>
        </>
    );
}
