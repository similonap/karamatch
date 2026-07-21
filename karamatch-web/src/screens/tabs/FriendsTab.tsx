import { useState } from "react";
import { api } from "../../api";
import { useApp } from "../../AppContext";
import { C, S, S2, T } from "../../design/tokens";
import { StarIcon } from "../../design/icons";
import {
    Avatar,
    Button,
    EmptyState,
    ErrorNote,
    Group,
    ListRow,
    MatchBadge,
    ScrollBody,
    SearchField,
    Skeleton,
    useAsync,
    useDebounced
} from "../../ui";

export default function FriendsTab() {
    const app = useApp();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query);
    const friends = useAsync(() => api.friends(), []);
    const suggestions = useAsync(
        () => (debouncedQuery.trim() ? api.searchUsers(debouncedQuery.trim()) : Promise.resolve([])),
        [debouncedQuery]
    );

    async function add(username: string) {
        try {
            await api.addFriend(username);
            setQuery("");
            friends.reload();
            suggestions.reload();
            app.toast("@" + username + " added to friends");
        } catch (err) {
            app.toast((err as Error).message);
        }
    }

    const friendList = friends.data ?? [];
    const people = suggestions.data ?? [];

    return (
        <ScrollBody bottomPad={S.md} gap={S.md}>
            <div style={{ paddingTop: S.xs, flexShrink: 0 }}>
                <h1 style={{ ...T.title, color: C.text, margin: "0 0 " + S2.s12 + "px" }}>Friends</h1>
                <SearchField value={query} onChange={setQuery} placeholder="Find singers by name or @username" />
            </div>

            {/* Search results replace the list rather than pushing it down, so
                the screen never has two competing lists on it at once. */}
            {query.trim() ? (
                <Group title={suggestions.loading ? "Searching" : people.length + " found"}>
                    {people.length === 0 && !suggestions.loading ? (
                        <ListRow title="No singers found" subtitle={"Nothing matches “" + query.trim() + "”"} last />
                    ) : null}
                    {people.map((person, index) => (
                        <ListRow
                            key={person.id}
                            last={index === people.length - 1}
                            onClick={() => app.openProfile(person.username)}
                            leading={<Avatar name={person.name} photoUrl={person.photoUrl} seed={person.id} size={40} />}
                            title={person.name}
                            subtitle={"@" + person.username}
                            trailing={
                                <div style={{ display: "flex", alignItems: "center", gap: S.sm, flexShrink: 0 }}>
                                    <MatchBadge pct={person.matchPct} />
                                    <Button
                                        label="Add"
                                        icon="userPlus"
                                        variant="tinted"
                                        size="sm"
                                        stopPropagation
                                        onClick={() => void add(person.username)}
                                    />
                                </div>
                            }
                        />
                    ))}
                </Group>
            ) : (
                <>
                    {friends.loading ? <Skeleton height={62} count={4} radius={16} /> : null}
                    {friends.error ? <ErrorNote message={friends.error} /> : null}

                    {!friends.loading && !friends.error && friendList.length === 0 ? (
                        <EmptyState
                            icon="users"
                            title="No friends yet"
                            body="Search above to find singers you know, and add them to your crew."
                        />
                    ) : null}

                    {friendList.length > 0 ? (
                        <Group title={friendList.length + (friendList.length === 1 ? " friend" : " friends")}>
                            {friendList.map((friend, index) => (
                                <ListRow
                                    key={friend.id}
                                    last={index === friendList.length - 1}
                                    onClick={() => app.openProfile(friend.username)}
                                    leading={<Avatar name={friend.name} photoUrl={friend.photoUrl} seed={friend.id} size={44} />}
                                    title={friend.name}
                                    subtitle={"@" + friend.username + " · " + friend.eventsCount + " nights"}
                                    chevron
                                    trailing={
                                        <div style={{ display: "flex", alignItems: "center", gap: S.sm, flexShrink: 0 }}>
                                            <MatchBadge pct={friend.matchPct} />
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 3,
                                                    color: C.gold,
                                                    ...T.captionStrong
                                                }}
                                                title={friend.singerRating.toFixed(1) + " singer rating"}
                                            >
                                                <StarIcon size={12} />
                                                {friend.singerRating.toFixed(1)}
                                            </div>
                                        </div>
                                    }
                                />
                            ))}
                        </Group>
                    ) : null}
                </>
            )}
        </ScrollBody>
    );
}
