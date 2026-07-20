import { useMemo, useState } from "react";
import { api } from "../api";
import type { RoomSlots } from "../api";
import { useApp } from "../AppContext";
import { C, primaryButton } from "../theme";
import { ErrorNote, Loading, formatDayLabel, formatTime, money, optionStyle, useAsync } from "../ui";

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
    const [busy, setBusy] = useState(false);

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
    const canBook = Boolean(selectedRoom && selectedSlot && quote) && !busy;

    async function book() {
        if (!selectedRoom || !selectedSlot || !venue.data) {
            return;
        }
        setBusy(true);
        try {
            const created = await api.bookParty({
                venueId: venue.data.id,
                roomId: selectedRoom.id,
                slotId: selectedSlot.id,
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
        return <Loading label="Loading venue…" />;
    }
    if (venue.error || !venue.data) {
        return (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <button onClick={() => app.go("app")} style={{ ...primaryButton(true), height: 44 }}>
                    ‹ Back
                </button>
                <ErrorNote message={venue.error ?? "Venue not found"} />
            </div>
        );
    }

    const data = venue.data;

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", paddingBottom: 120 }}>
            <div
                style={{
                    height: 170,
                    position: "relative",
                    background: "repeating-linear-gradient(45deg,#2A1548,#2A1548 10px,#1C0E33 10px,#1C0E33 20px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                }}
            >
                {data.imageUrl ? (
                    <img
                        src={data.imageUrl}
                        alt={data.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={event => {
                            (event.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : null}
                <button
                    onClick={() => app.go("app")}
                    style={{
                        position: "absolute",
                        top: 14,
                        left: 16,
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,.5)",
                        color: "#fff",
                        fontSize: 17,
                        cursor: "pointer"
                    }}
                >
                    ‹
                </button>
            </div>

            <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                    <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 22, fontWeight: 700 }}>{data.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>
                        ★ {data.rating.toFixed(1)} · {data.rooms.length} rooms · open till {data.openUntil}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>When</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {days.map(([key, sample]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setDay(key);
                                    setTime(null);
                                }}
                                style={{
                                    flex: 1,
                                    height: 44,
                                    borderRadius: 12,
                                    border: "1px solid",
                                    fontFamily: "Outfit, sans-serif",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    ...optionStyle(activeDay === key)
                                }}
                            >
                                {formatDayLabel(sample)}
                            </button>
                        ))}
                        {days.length === 0 ? (
                            <div style={{ color: C.textMuted, fontSize: 13 }}>No free slots in the next week.</div>
                        ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {times.map(value => (
                            <button
                                key={value}
                                onClick={() => setTime(value)}
                                style={{
                                    flex: 1,
                                    height: 40,
                                    borderRadius: 12,
                                    border: "1px solid",
                                    fontFamily: "Outfit, sans-serif",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    ...optionStyle(activeTime === value)
                                }}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>1-hour session</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Choose a room</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {data.rooms.map(room => {
                            const selected = roomId === room.id;
                            const option = optionStyle(selected);
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => {
                                        setRoomId(room.id);
                                        setTime(null);
                                        setSpots(null);
                                    }}
                                    style={{
                                        height: 60,
                                        borderRadius: 16,
                                        border: "1px solid " + option.borderColor,
                                        background: option.background,
                                        color: C.text,
                                        fontFamily: "Outfit, sans-serif",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "0 16px"
                                    }}
                                >
                                    <span style={{ textAlign: "left" }}>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{room.name}</div>
                                        <div style={{ fontSize: 12, color: C.textMuted }}>{room.seats} seats</div>
                                    </span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: C.cyan }}>
                                        {money(room.pricePerHour)}/hr
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedRoom ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Spots for other singers</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <button
                                onClick={() => setSpots(Math.max(minSpots, openSpots - 1))}
                                disabled={openSpots <= minSpots}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    border: "1px solid",
                                    fontSize: 20,
                                    fontWeight: 700,
                                    cursor: openSpots <= minSpots ? "default" : "pointer",
                                    opacity: openSpots <= minSpots ? 0.4 : 1,
                                    ...optionStyle(false)
                                }}
                            >
                                −
                            </button>
                            <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700, minWidth: 28, textAlign: "center" }}>
                                {openSpots}
                            </div>
                            <button
                                onClick={() => setSpots(Math.min(maxSpots, openSpots + 1))}
                                disabled={openSpots >= maxSpots}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    border: "1px solid",
                                    fontSize: 20,
                                    fontWeight: 700,
                                    cursor: openSpots >= maxSpots ? "default" : "pointer",
                                    opacity: openSpots >= maxSpots ? 0.4 : 1,
                                    ...optionStyle(false)
                                }}
                            >
                                +
                            </button>
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
                            {selectedRoom.seats} seats in this room: you plus {openSpots} open
                            {openSpots < maxSpots ? " · " + (maxSpots - openSpots) + " kept free for people you bring yourself" : ""}
                        </div>
                    </div>
                ) : null}

                <div
                    style={{
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,.12)",
                        background: "rgba(255,255,255,.05)",
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.textDim }}>
                        <span>
                            1h ·{" "}
                            {selectedRoom ? selectedRoom.name + " · " + selectedRoom.seats + " seats" : "no room selected"}
                        </span>
                        <span style={{ color: C.text, fontWeight: 700 }}>{money(total)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textMuted }}>
                        <span>per seat</span>
                        <span style={{ color: C.cyan, fontWeight: 600 }}>
                            {selectedRoom ? money(share) + " / person" : "—"}
                        </span>
                    </div>
                    {selectedRoom && openSpots < maxSpots ? (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textMuted }}>
                            <span>your part if all {openSpots} spots fill</span>
                            <span style={{ color: C.cyan, fontWeight: 600 }}>{money(hostCost)}</span>
                        </div>
                    ) : null}
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 4 }}>
                        As host you pay the full amount now. Everyone who joins pays {selectedRoom ? money(share) : "their share"}{" "}
                        back to you — the seats you keep free are yours to settle with the guests you bring.
                    </div>
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "16px 24px 36px",
                    background: "linear-gradient(180deg,transparent,#08040F 40%)"
                }}
            >
                <button
                    onClick={book}
                    style={{
                        ...primaryButton(canBook),
                        boxShadow: canBook ? "0 8px 32px rgba(255,61,143,.35)" : "none"
                    }}
                >
                    {busy ? "Booking…" : canBook ? "Book & pay " + money(total) : "Select a room"}
                </button>
            </div>
        </div>
    );
}
