import { useState } from "react";
import { api } from "../../api";
import { useApp } from "../../AppContext";
import { C, S, S2, T } from "../../design/tokens";
import { Icon } from "../../design/icons";
import {
    Avatar,
    Button,
    Card,
    Chip,
    EmptyState,
    ErrorNote,
    Pressable,
    ScrollBody,
    Segmented,
    Skeleton,
    formatWhen,
    plural,
    useAsync
} from "../../ui";

type Pane = "upcoming" | "past";

export default function MineTab() {
    const app = useApp();
    const mine = useAsync(() => api.myParties(), []);
    // Upcoming and past were two stacked lists you had to scroll past each
    // other. They are alternatives, not a sequence — so they get a segment.
    const [pane, setPane] = useState<Pane>("upcoming");

    const upcoming = mine.data?.upcoming ?? [];
    const past = mine.data?.past ?? [];
    const list = pane === "upcoming" ? upcoming : past;

    return (
        <ScrollBody bottomPad={S.md}>
            <div style={{ paddingTop: S.xs, paddingBottom: S2.s12, flexShrink: 0, display: "flex", flexDirection: "column", gap: S2.s12 }}>
                <h1 style={{ ...T.title, color: C.text, margin: 0 }}>My parties</h1>
                <Segmented<Pane>
                    value={pane}
                    onChange={setPane}
                    items={[
                        { key: "upcoming", label: "Upcoming" + (upcoming.length ? " · " + upcoming.length : "") },
                        { key: "past", label: "Past" + (past.length ? " · " + past.length : "") }
                    ]}
                />
            </div>

            {mine.loading ? <Skeleton height={128} count={2} /> : null}
            {mine.error ? <ErrorNote message={mine.error} /> : null}

            {!mine.loading && !mine.error && list.length === 0 ? (
                pane === "upcoming" ? (
                    <EmptyState
                        icon="calendar"
                        title="Nothing booked"
                        body="Book a room or join a match, and it will show up here."
                        action={<Button label="Find a venue" variant="tinted" size="md" onClick={() => app.goTab("venues")} />}
                    />
                ) : (
                    <EmptyState icon="clock" title="No past nights yet" body="Everything you have sung will be listed here." />
                )
            ) : null}

            {pane === "upcoming"
                ? upcoming.map(party => {
                      const isHost = party.host.id === app.me?.id;
                      return (
                          <Card key={party.id} onClick={() => app.openRoom(party.id)} highlight style={{ gap: S.sm }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: S.sm }}>
                                  <div style={{ minWidth: 0 }}>
                                      <div style={{ ...T.bodyStrong, fontSize: 16, color: C.text }}>{party.title}</div>
                                      <div style={{ ...T.caption, color: C.textMuted, marginTop: 2 }}>
                                          {party.venue.name} · {formatWhen(party.start)}
                                      </div>
                                  </div>
                                  <Chip label={isHost ? "Host" : "Joined"} icon={isHost ? "crown" : "check"} tone="tint" />
                              </div>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: S.sm }}>
                                  {isHost ? (
                                      <div style={{ ...T.caption, color: C.textMuted }}>
                                          {party.membersCount}/{party.capacity} singers
                                      </div>
                                  ) : (
                                      <Pressable
                                          onClick={() => app.openProfile(party.host.username)}
                                          stopPropagation
                                          scaleTo={1}
                                          style={{ display: "flex", alignItems: "center", gap: S2.s6 }}
                                      >
                                          <Avatar name={party.host.name} photoUrl={party.host.photoUrl} seed={party.host.id} size={22} />
                                          <span style={{ ...T.caption, color: C.textMuted }}>@{party.host.username}</span>
                                      </Pressable>
                                  )}
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, ...T.captionStrong, color: C.tintSoft }}>
                                      Open room
                                      <Icon name="chevronRight" size={14} strokeWidth={2.2} />
                                  </div>
                              </div>
                          </Card>
                      );
                  })
                : past.map(party => (
                      <Card key={party.id} onClick={() => app.openRoom(party.id)} style={{ gap: S2.s10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: S.sm }}>
                              <div style={{ minWidth: 0 }}>
                                  <div style={{ ...T.bodyStrong, fontSize: 16, color: C.text }}>{party.title}</div>
                                  <div style={{ ...T.caption, color: C.textMuted, marginTop: 2 }}>
                                      {party.venue.name} · {plural(party.membersCount, "singer", "singers")}
                                  </div>
                              </div>
                              <div style={{ ...T.footnote, color: C.textFaint, flexShrink: 0 }}>{formatWhen(party.start)}</div>
                          </div>

                          {/* Stacked, not side by side: at half a card's width
                              both labels wrapped onto two lines. */}
                          <div style={{ display: "flex", flexDirection: "column", gap: S2.s6 }}>
                              {party.rated ? (
                                  <Chip label="Crew rated" icon="check" tone="green" />
                              ) : (
                                  <Button
                                      label="Rate your crew"
                                      icon="star"
                                      variant="secondary"
                                      size="md"
                                      stopPropagation
                                      onClick={() => app.openRate(party.id)}
                                  />
                              )}
                              {party.venueReviewed ? (
                                  <Chip label="Venue reviewed" icon="check" tone="green" />
                              ) : (
                                  <Button
                                      label="Review venue"
                                      icon="star"
                                      variant="secondary"
                                      size="md"
                                      stopPropagation
                                      onClick={() => app.openVenueReview(party.id)}
                                  />
                              )}
                          </div>
                      </Card>
                  ))}
        </ScrollBody>
    );
}
