import { useMemo, useState } from "react";
import { api } from "../api";
import type { RoomSlots } from "../api";
import { useApp } from "../AppContext";
import { C, LAYOUT, R, S, S2, T } from "../design/tokens";
import { Icon } from "../design/icons";
import {
    AppBar,
    BottomBar,
    Button,
    Card,
    ErrorNote,
    Loading,
    OptionPill,
    Pressable,
    Rating,
    ScrollBody,
    Section,
    Stepper,
    TextField,
    formatDayLabel,
    formatTime,
    money,
    useAsync
} from "../ui";

// Kept in step with TITLE_MAX_LENGTH in routers/parties.ts.
const TITLE_MAX_LENGTH = 60;

function dayKey(iso: string) {
    const date = new Date(iso);
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

export default function VenueDetail() {
    const app = useApp();
    const venueId = app.venueId;

    const venue = useAsync(() => api.venue(venueId!), [venueId]);
    const slots = useAsync(() => api.slots(venueId!), [venueId]);

    const [roomId, setRoomId] = useState<string | null>(null);
    const [day, setDay] = useState<string | null>(null);
    const [time, setTime] = useState<string | null>(null);
    // null = follow the room's own size (every seat but the host's is offered).
    const [spots, setSpots] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [busy, setBusy] = useState(false);
    // Drives the collapsing header: 0 while the hero is fully visible, 1 once it
    // has scrolled away and the solid nav bar has taken over.
    const [scrollY, setScrollY] = useState(0);

    const roomSlots: RoomSlots[] = useMemo(() => slots.data ?? [], [slots.data]);

    // The first three days that have any free slot at this venue.
    const days = useMemo(() => {
        const seen = new Map<string, string>();
        for (const entry of roomSlots) {
            for (const slot of entry.slots) {
                const key = dayKey(slot.start);
                if (!seen.has(key)) {
                    seen.set(key, slot.start);
                }
            }
        }
        return Array.from(seen.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .slice(0, 3);
    }, [roomSlots]);

    const activeDay = day ?? days[0]?.[0] ?? null;

    // Times shown are the ones actually bookable: for the chosen room if one is
    // selected, otherwise the union across rooms.
    const times = useMemo(() => {
        const pool = roomId ? roomSlots.filter(entry => entry.room.id === roomId) : roomSlots;
        const seen = new Set<string>();
        for (const entry of pool) {
            for (const slot of entry.slots) {
                if (activeDay && dayKey(slot.start) === activeDay) {
                    seen.add(formatTime(slot.start));
                }
            }
        }
        return Array.from(seen).sort().slice(0, 4);
    }, [roomSlots, roomId, activeDay]);

    const activeTime = time && times.includes(time) ? time : (times[0] ?? null);

    const selectedRoom = venue.data?.rooms.find(room => room.id === roomId) ?? null;

    // The concrete slot the booking will use — null until room+day+time line up.
    const selectedSlot = useMemo(() => {
        if (!roomId || !activeDay || !activeTime) {
            return null;
        }
        const entry = roomSlots.find(candidate => candidate.room.id === roomId);
        if (!entry) {
            return null;
        }
        return (
            entry.slots.find(slot => dayKey(slot.start) === activeDay && formatTime(slot.start) === activeTime) ?? null
        );
    }, [roomSlots, roomId, activeDay, activeTime]);

    const total = selectedRoom ? selectedRoom.pricePerHour : 0;
    // Spots offered to other singers, and what that choice costs — both come
    // from the server's priced table, so nothing here is calculated.
    const spotOptions = selectedRoom ? selectedRoom.spotOptions : [];
    const minSpots = spotOptions.length > 0 ? spotOptions[0].spots : 0;
    const maxSpots = spotOptions.length > 0 ? spotOptions[spotOptions.length - 1].spots : 0;
    const openSpots = Math.min(Math.max(spots ?? maxSpots, minSpots), maxSpots);
    const quote = spotOptions.find(option => option.spots === openSpots) ?? null;
    const share = quote ? quote.share : 0;
    const hostCost = quote ? quote.hostPays : 0;
    const trimmedTitle = title.trim();
    const roomPicked = Boolean(selectedRoom && selectedSlot && quote);
    const canBook = roomPicked && trimmedTitle !== "" && !busy;

    async function book() {
        if (!selectedRoom || !selectedSlot || !venue.data || trimmedTitle === "") {
            return;
        }
        setBusy(true);
        try {
            const created = await api.bookParty({
                venueId: venue.data.id,
                roomId: selectedRoom.id,
                slotId: selectedSlot.id,
                title: trimmedTitle,
                spots: openSpots
            });
            app.startPay({ kind: "host", partyId: created.id, amount: created.totalPrice });
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    if (venue.loading || slots.loading) {
        return (
            <>
                <AppBar onBack={() => app.go("app")} />
                <Loading label="Loading venue…" />
            </>
        );
    }

    if (venue.error || !venue.data) {
        return (
            <>
                <AppBar title="Venue" onBack={() => app.go("app")} />
                <ScrollBody style={{ paddingTop: S.md }}>
                    <ErrorNote message={venue.error ?? "Venue not found"} />
                </ScrollBody>
            </>
        );
    }

    const data = venue.data;
    // The hero is 180 tall and the bar is 56, so it is fully handed over by the
    // time the photo's bottom edge reaches the bar.
    const collapse = Math.min(1, Math.max(0, (scrollY - 60) / (180 - LAYOUT.appBar - 60)));

    return (
        <>
            {/* The hero scrolls away with the content; only the back control is
                pinned, floating over whatever has scrolled under it. */}
            <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <ScrollBody pad={false} gap={0} onScroll={setScrollY}>
                    <div style={{ height: 180, flexShrink: 0, background: C.surface3, overflow: "hidden", position: "relative" }}>
                        {data.imageUrl ? (
                            <img
                                src={data.imageUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={event => {
                                    (event.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                            />
                        ) : (
                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.textFaint }}>
                                <Icon name="mic" size={36} />
                            </div>
                        )}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: "linear-gradient(180deg, rgba(0,0,0,.5) 0%, transparent 45%)",
                                pointerEvents: "none"
                            }}
                        />
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: S.lg,
                            padding: S.md + "px " + 20 + "px 0"
                        }}
                    >
                <div style={{ flexShrink: 0 }}>
                    <h1 style={{ ...T.title, color: C.text, margin: 0 }}>{data.name}</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginTop: S2.s6, ...T.caption, color: C.textMuted }}>
                        <Rating value={data.rating} />
                        <span style={{ width: 3, height: 3, borderRadius: 2, background: C.textFaint }} />
                        <span>{data.rooms.length} rooms</span>
                        <span style={{ width: 3, height: 3, borderRadius: 2, background: C.textFaint }} />
                        <span>open till {data.openUntil}</span>
                    </div>
                </div>

                <Section title="When" hint="Sessions run one hour.">
                    <div style={{ display: "flex", gap: S.sm }}>
                        {days.map(([key, sample]) => (
                            <OptionPill
                                key={key}
                                label={formatDayLabel(sample)}
                                selected={activeDay === key}
                                onClick={() => {
                                    setDay(key);
                                    setTime(null);
                                }}
                            />
                        ))}
                        {days.length === 0 ? (
                            <div style={{ ...T.caption, color: C.textMuted }}>No free slots in the next week.</div>
                        ) : null}
                    </div>
                    {times.length > 0 ? (
                        <div style={{ display: "flex", gap: S.sm, flexWrap: "wrap" }}>
                            {times.map(value => (
                                <OptionPill key={value} label={value} selected={activeTime === value} onClick={() => setTime(value)} />
                            ))}
                        </div>
                    ) : null}
                </Section>

                <Section title="Room">
                    {data.rooms.map(room => {
                        const selected = roomId === room.id;
                        return (
                            <Pressable
                                key={room.id}
                                onClick={() => {
                                    setRoomId(room.id);
                                    setTime(null);
                                    setSpots(null);
                                }}
                                scaleTo={0.99}
                                opacityTo={0.8}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: S.sm,
                                    minHeight: 58,
                                    padding: "0 " + S.md + "px",
                                    borderRadius: R.md,
                                    border: "1px solid " + (selected ? C.tintBorder : C.border),
                                    background: selected ? C.tintBg : C.surface1,
                                    transition: "background 140ms ease, border-color 140ms ease"
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ ...T.body, fontWeight: 700, color: C.text }}>{room.name}</div>
                                    <div style={{ ...T.footnote, color: C.textMuted }}>{room.seats} seats</div>
                                </div>
                                <div style={{ ...T.captionStrong, color: C.cyan, flexShrink: 0 }}>
                                    {money(room.pricePerHour)}/hr
                                </div>
                            </Pressable>
                        );
                    })}
                </Section>

                {selectedRoom ? (
                    <Section
                        title="Spots for other singers"
                        hint={
                            selectedRoom.seats +
                            " seats in this room: you plus " +
                            openSpots +
                            " open" +
                            (openSpots < maxSpots
                                ? " · " + (maxSpots - openSpots) + " kept free for people you bring yourself"
                                : "")
                        }
                    >
                        <Stepper
                            value={openSpots}
                            min={minSpots}
                            max={maxSpots}
                            onChange={setSpots}
                            suffix={openSpots === 1 ? "spot" : "spots"}
                        />
                    </Section>
                ) : null}

                <Section title="Name your party" hint="This is what singers see in the open list.">
                    <TextField
                        value={title}
                        onChange={setTitle}
                        maxLength={TITLE_MAX_LENGTH}
                        placeholder="Rock Legends Only"
                    />
                </Section>

                {/* The price breakdown, laid out like a receipt so the host can
                    see exactly what they front and what comes back. */}
                <Card style={{ gap: S.sm }}>
                    <Line
                        label={selectedRoom ? "1h · " + selectedRoom.name : "1h · no room selected"}
                        value={money(total)}
                        strong
                    />
                    <Line label="Per seat" value={selectedRoom ? money(share) + " / person" : "—"} accent />
                    {selectedRoom && openSpots < maxSpots ? (
                        <Line label={"Your part if all " + openSpots + " fill"} value={money(hostCost)} accent />
                    ) : null}
                    <div style={{ ...T.footnote, color: C.textFaint, marginTop: S.xs, lineHeight: 1.5 }}>
                        As host you pay the full amount now. Everyone who joins pays{" "}
                        {selectedRoom ? money(share) : "their share"} back to you — seats you keep free are yours to settle
                        with the guests you bring.
                    </div>
                </Card>
                    </div>
                </ScrollBody>

                {/* Collapsing header: a scrim-backed chevron over the photo that
                    hands over to a solid, titled nav bar once the hero is gone. */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: LAYOUT.appBar,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: S.xs,
                        pointerEvents: "none"
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: C.surface,
                            borderBottom: "1px solid " + C.border,
                            opacity: collapse,
                            transition: "opacity 120ms linear"
                        }}
                    />
                    <Pressable
                        onClick={() => app.go("app")}
                        ariaLabel="Go back"
                        style={{
                            position: "relative",
                            width: LAYOUT.touch,
                            height: LAYOUT.touch,
                            borderRadius: "50%",
                            background: "rgba(7,4,13," + 0.55 * (1 - collapse) + ")",
                            color: collapse > 0.5 ? C.text : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "auto"
                        }}
                    >
                        <Icon name="chevronLeft" size={22} strokeWidth={2.2} />
                    </Pressable>
                    <div
                        style={{
                            ...T.navTitle,
                            position: "relative",
                            color: C.text,
                            opacity: collapse,
                            minWidth: 0,
                            paddingRight: S.md,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            transition: "opacity 120ms linear"
                        }}
                    >
                        {data.name}
                    </div>
                </div>
            </div>

            <BottomBar>
                <Button
                    label={
                        busy
                            ? "Booking"
                            : canBook
                              ? "Book & pay " + money(total)
                              : roomPicked
                                ? "Name your party"
                                : "Select a room"
                    }
                    onClick={book}
                    disabled={!canBook}
                    busy={busy}
                />
            </BottomBar>
        </>
    );
}

function Line({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: S.sm }}>
            <span style={{ ...T.caption, color: C.textMuted, minWidth: 0 }}>{label}</span>
            <span
                style={{
                    ...(strong ? T.bodyStrong : T.captionStrong),
                    color: accent ? C.cyan : C.text,
                    flexShrink: 0
                }}
            >
                {value}
            </span>
        </div>
    );
}
