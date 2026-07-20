import { Collection, MongoClient } from "mongodb";
import crypto from "crypto";
import dotenv from "dotenv";
import { User, Song, Venue, Room, Box, BoxMember, Notification, Cell, Slot, Message, Rating, toPublicUser } from "./types";
import {
    randomInt, pick, newId, randomVenue, randomNpcIdentity,
    sampleFavoriteSongIds, randomBoxTitle, randomNpcReply, NPC_GENRES, NON_TASTE_GENRES
} from "./generators";
dotenv.config();

export const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
const db = client.db("karamatch");

export const usersCollection: Collection<User> = db.collection<User>("users");
export const songsCollection: Collection<Song> = db.collection<Song>("songs");
export const venuesCollection: Collection<Venue> = db.collection<Venue>("venues");
export const cellsCollection: Collection<Cell> = db.collection<Cell>("cells");
export const slotsCollection: Collection<Slot> = db.collection<Slot>("slots");
export const boxesCollection: Collection<Box> = db.collection<Box>("boxes");
export const messagesCollection: Collection<Message> = db.collection<Message>("messages");
export const notificationsCollection: Collection<Notification> = db.collection<Notification>("notifications");
export const ratingsCollection: Collection<Rating> = db.collection<Rating>("ratings");

// ---------------------------------------------------------------------------
// Users / auth
// ---------------------------------------------------------------------------

export async function getNextUserId() {
    const users: User[] = await usersCollection.find({}).sort({ id: -1 }).limit(1).toArray();
    return users.length === 0 ? 1 : users[0].id + 1;
}

export async function getUserByLogin(login: string) {
    return await usersCollection.findOne({ $or: [{ email: login }, { username: login }] });
}

export async function getUserByUsername(username: string) {
    return await usersCollection.findOne({ username: username });
}

export async function getUserByEmail(email: string) {
    return await usersCollection.findOne({ email: email });
}

export async function getUserById(id: number) {
    return await usersCollection.findOne({ id: id });
}

export async function getUserByToken(token: string) {
    return await usersCollection.findOne({ token: token });
}

export async function createUser(user: Omit<User, "id" | "_id">) {
    const id = await getNextUserId();
    const doc: User = { ...user, id };
    await usersCollection.insertOne(doc);
    return doc;
}

export async function setUserToken(id: number, token: string | null) {
    await usersCollection.updateOne({ id: id }, { $set: { token: token } });
}

export function generateToken() {
    return crypto.randomBytes(24).toString("hex");
}

export async function updateUser(id: number, changes: Partial<User>) {
    await usersCollection.updateOne({ id: id }, { $set: changes });
    return await getUserById(id);
}

// ---------------------------------------------------------------------------
// Songs — curated catalog, seeded once
// ---------------------------------------------------------------------------

export async function getSongs(query?: string) {
    if (!query) {
        // Genre-interleaved discovery list: one song per genre, round-robin,
        // so the picker itself nudges users past their bubble (§3).
        const songs = await songsCollection.find({}).toArray();
        const byGenre = new Map<string, Song[]>();
        for (const song of songs) {
            const primaryGenre = song.genre[0];
            const group = byGenre.get(primaryGenre) || [];
            group.push(song);
            byGenre.set(primaryGenre, group);
        }
        const groups = [...byGenre.values()];
        const interleaved: Song[] = [];
        let index = 0;
        let added = true;
        while (added) {
            added = false;
            for (const group of groups) {
                if (index < group.length) {
                    interleaved.push(group[index]);
                    added = true;
                }
            }
            index++;
        }
        return interleaved;
    }
    const regex = new RegExp(query, "i");
    return await songsCollection.find({ $or: [{ title: regex }, { artist: regex }] }).toArray();
}

export async function getSongsByIds(ids: string[]) {
    return await songsCollection.find({ id: { $in: ids } }).toArray();
}

export async function getGenres() {
    const songs = await songsCollection.find({}).toArray();
    const counts = new Map<string, number>();
    for (const song of songs) {
        for (const genre of song.genre) {
            counts.set(genre, (counts.get(genre) || 0) + 1);
        }
    }
    return Array.from(counts.entries()).map(([genre, count]) => ({ genre, count }));
}

// ---------------------------------------------------------------------------
// Geometry — grid cells + haversine (API-PROPOSAL.md §2.1)
// ---------------------------------------------------------------------------

// ~0.01° per cell ≈ 1.1 km. Cell id = floor(lat/0.01) + ":" + floor(lng/0.01).
const CELL_SIZE = 0.01;
const KM_PER_DEGREE = 111.32;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function boundingBox(lat: number, lng: number, distanceKm: number) {
    const latDelta = distanceKm / KM_PER_DEGREE;
    const lngDelta = distanceKm / (KM_PER_DEGREE * Math.max(Math.cos(lat * Math.PI / 180), 0.01));
    return {
        minLat: lat - latDelta, maxLat: lat + latDelta,
        minLng: lng - lngDelta, maxLng: lng + lngDelta
    };
}

// ---------------------------------------------------------------------------
// Space — venues around you, generated on first look (§2.1)
// ---------------------------------------------------------------------------

// One priced choice a host can make on a room: open `spots` to other singers,
// they each pay `share`, and `hostPays` is what the host is left carrying once
// those spots are full (the seats they kept back are theirs to settle).
export interface SpotOption {
    spots: number;
    share: number;
    hostPays: number;
}

// A room as clients see it: the stored room, the per-seat price, and every
// spots choice already priced out. Rooms hold at most a dozen seats, so the
// whole table ships with the room and the booking screen does no arithmetic.
export interface RoomView extends Room {
    pricePerSeat: number;
    spotOptions: SpotOption[];
}

export function toRoomView(room: Room): RoomView {
    const pricePerSeat = splitPrice(room.pricePerHour, room.seats);
    const spotOptions: SpotOption[] = [];
    // The host always takes a seat, so at most seats - 1 go to other singers.
    for (let spots = 1; spots <= room.seats - 1; spots++) {
        spotOptions.push({
            spots: spots,
            // Same for every choice — a joiner's price never depends on how
            // many spots the host opened. Repeated per option so the client
            // reads one object instead of combining fields.
            share: pricePerSeat,
            hostPays: room.pricePerHour - pricePerSeat * spots
        });
    }
    return { ...room, pricePerSeat: pricePerSeat, spotOptions: spotOptions };
}

export interface VenueView extends Venue {
    rooms: RoomView[];
}

export function toVenueView(venue: Venue): VenueView {
    return { ...venue, rooms: venue.rooms.map(toRoomView) };
}

export interface VenueNearby extends VenueView {
    distanceKm: number;
    fromPrice: number;
}

export async function ensureVenuesNear(lat: number, lng: number, distanceKm: number): Promise<VenueNearby[]> {
    const box = boundingBox(lat, lng, distanceKm);

    // Every cell covered by the bounding box that was never generated gets
    // rolled once (0–2 venues), then marked generated — so the world is stable.
    const rows: number[] = [];
    for (let row = Math.floor(box.minLat / CELL_SIZE); row <= Math.floor(box.maxLat / CELL_SIZE); row++) {
        rows.push(row);
    }
    const cols: number[] = [];
    for (let col = Math.floor(box.minLng / CELL_SIZE); col <= Math.floor(box.maxLng / CELL_SIZE); col++) {
        cols.push(col);
    }
    const cellIds: string[] = [];
    for (const row of rows) {
        for (const col of cols) {
            cellIds.push(row + ":" + col);
        }
    }
    const generatedCells = await cellsCollection.find({ id: { $in: cellIds } }).toArray();
    const generatedIds = new Set(generatedCells.map(cell => cell.id));

    const newVenues: Venue[] = [];
    const newCells: Cell[] = [];
    for (const row of rows) {
        for (const col of cols) {
            const cellId = row + ":" + col;
            if (generatedIds.has(cellId)) {
                continue;
            }
            const venueCount = randomInt(0, 2);
            for (let i = 0; i < venueCount; i++) {
                const venueLat = (row + Math.random()) * CELL_SIZE;
                const venueLng = (col + Math.random()) * CELL_SIZE;
                newVenues.push(randomVenue(venueLat, venueLng));
            }
            newCells.push({ id: cellId, generatedAt: new Date().toISOString() });
        }
    }
    if (newVenues.length > 0) {
        await venuesCollection.insertMany(newVenues);
    }
    if (newCells.length > 0) {
        await cellsCollection.insertMany(newCells);
    }

    // Bounding box query with course-taught operators, then exact haversine filter.
    let venues: Venue[] = await venuesCollection.find({
        lat: { $gte: box.minLat, $lte: box.maxLat },
        lng: { $gte: box.minLng, $lte: box.maxLng }
    }).toArray();
    venues = venues.filter(venue => haversineKm(lat, lng, venue.lat, venue.lng) <= distanceKm);

    // The Venues tab is never empty — force-place venues inside the radius.
    while (venues.length < 4) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = (0.2 + 0.75 * Math.random()) * distanceKm;
        const venueLat = lat + (radius / KM_PER_DEGREE) * Math.sin(angle);
        const venueLng = lng + (radius / (KM_PER_DEGREE * Math.max(Math.cos(lat * Math.PI / 180), 0.01))) * Math.cos(angle);
        const venue = randomVenue(venueLat, venueLng);
        await venuesCollection.insertOne(venue);
        venues.push(venue);
    }

    return venues
        .map(venue => ({
            ...toVenueView(venue),
            distanceKm: Math.round(haversineKm(lat, lng, venue.lat, venue.lng) * 10) / 10,
            fromPrice: Math.min(...venue.rooms.map(room => room.pricePerHour))
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getVenueById(id: string): Promise<Venue | null> {
    return await venuesCollection.findOne({ id: id });
}

// ---------------------------------------------------------------------------
// Time — slots that grow on demand (§2.2)
// ---------------------------------------------------------------------------

export interface RoomSlots {
    room: RoomView;
    slots: { id: string; start: string; end: string }[];
}

// Evening sessions of 1 hour, first start 18:00, last start 01:00 (ends 02:00).
export async function ensureSlots(venue: Venue, from: Date, to: Date): Promise<RoomSlots[]> {
    const result: RoomSlots[] = [];
    for (const room of venue.rooms) {
        const existing: Slot[] = await slotsCollection.find({
            venueId: venue.id,
            roomId: room.id,
            start: { $gte: from.toISOString(), $lte: to.toISOString() }
        }).toArray();

        // Fewer than 4 free slots in range → materialize the missing hours.
        const freeCount = existing.filter(slot => slot.status === "available").length;
        if (freeCount < 4) {
            const knownStarts = new Set(existing.map(slot => slot.start));
            const newSlots: Slot[] = [];
            const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
            while (day <= to) {
                for (let hour = 18; hour <= 25; hour++) {   // 24 = 00:00, 25 = 01:00 next day
                    const start = new Date(day);
                    start.setHours(hour, 0, 0, 0);
                    const end = new Date(start);
                    end.setHours(end.getHours() + 1);
                    if (start >= from && start <= to && !knownStarts.has(start.toISOString())) {
                        newSlots.push({
                            id: newId("sl"),
                            venueId: venue.id,
                            roomId: room.id,
                            start: start.toISOString(),
                            end: end.toISOString(),
                            // some slots are pre-booked so availability looks organic
                            status: Math.random() < 0.3 ? "booked" : "available"
                        });
                    }
                }
                day.setDate(day.getDate() + 1);
            }
            if (newSlots.length > 0) {
                await slotsCollection.insertMany(newSlots);
                existing.push(...newSlots);
            }
        }

        const free = existing
            .filter(slot => slot.status === "available")
            .sort((a, b) => a.start.localeCompare(b.start));
        result.push({
            room: toRoomView(room),
            slots: free.map(slot => ({ id: slot.id, start: slot.start, end: slot.end }))
        });
    }
    return result;
}

export async function getSlotById(id: string): Promise<Slot | null> {
    return await slotsCollection.findOne({ id: id });
}

// ---------------------------------------------------------------------------
// People — NPC singers near a point (§2.3)
// ---------------------------------------------------------------------------

export async function createNpcUser(nearLat: number, nearLng: number, genre: string): Promise<User> {
    const songs = await songsCollection.find({}).toArray();
    const identity = randomNpcIdentity();
    let username = identity.username;
    while (await getUserByUsername(username)) {
        username = identity.username + randomInt(2, 99);
    }
    return await createUser({
        name: identity.name,
        username: username,
        email: username + "@karamatch.npc",
        password: newId("pw"),
        token: null,
        bio: identity.bio,
        photoUrl: identity.photoUrl,
        location: {
            lat: nearLat + (Math.random() - 0.5) * CELL_SIZE,
            lng: nearLng + (Math.random() - 0.5) * CELL_SIZE,
            label: ""
        },
        favoriteSongIds: sampleFavoriteSongIds(songs, genre),
        singerRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        eventsCount: randomInt(3, 40),
        friendIds: [],
        isNpc: true
    });
}

export async function getFriends(user: User) {
    const users = await usersCollection.find({ id: { $in: user.friendIds } }).toArray();
    const matchPctFor = await matchScorerFor(user);
    const friends = [];
    for (const friend of users) {
        friends.push({ ...toPublicUser(friend), matchPct: await matchPctFor(friend) });
    }
    return friends;
}

export async function searchUsers(query: string, user: User) {
    const regex = new RegExp(query, "i");
    const matches = await usersCollection.find({
        $or: [{ name: regex }, { username: regex }, { email: regex }]
    }).toArray();
    const found = matches
        .filter(match => match.id !== user.id && !user.friendIds.includes(match.id))
        .slice(0, 4);
    const matchPctFor = await matchScorerFor(user);
    const scored = [];
    for (const match of found) {
        scored.push({ ...toPublicUser(match), matchPct: await matchPctFor(match) });
    }
    return scored;
}

// One singer's public profile as another singer sees it: taste compatibility,
// the songs they love and whether you already sing together. Viewing yourself
// gives matchPct null, the same rule the list endpoints follow.
export async function getUserProfile(other: User, viewer: User) {
    const favoriteSongs = await getSongsByIds(other.favoriteSongIds);
    const genreProfile = await getGenreProfile(other);
    if (other.id === viewer.id) {
        return {
            ...toPublicUser(other),
            matchPct: null,
            commonSongs: [],
            favoriteSongs: favoriteSongs,
            genreProfile: genreProfile,
            isFriend: false,
            isSelf: true
        };
    }
    const score = await scoreMatch(viewer, other);
    return {
        ...toPublicUser(other),
        matchPct: score.matchPct,
        commonSongs: score.commonSongs,
        favoriteSongs: favoriteSongs,
        genreProfile: genreProfile,
        isFriend: viewer.friendIds.includes(other.id),
        isSelf: false
    };
}

export async function addFriend(user: User, other: User) {
    await usersCollection.updateOne({ id: user.id }, { $set: { friendIds: [...user.friendIds, other.id] } });
    await usersCollection.updateOne({ id: other.id }, { $set: { friendIds: [...other.friendIds, user.id] } });
}

// Friendship is mutual, so unfriending drops both sides again.
export async function removeFriend(user: User, other: User) {
    await usersCollection.updateOne(
        { id: user.id },
        { $set: { friendIds: user.friendIds.filter(id => id !== other.id) } }
    );
    await usersCollection.updateOne(
        { id: other.id },
        { $set: { friendIds: other.friendIds.filter(id => id !== user.id) } }
    );
}

// ---------------------------------------------------------------------------
// Boxes — NPC-hosted open boxes near you (§2.3)
// ---------------------------------------------------------------------------

export interface BoxView {
    id: string;
    title: string;
    genre: string;
    venue: { id: string; name: string; distanceKm: number };
    roomName: string;
    start: string;
    end: string;
    host: ReturnType<typeof toPublicUser>;
    membersCount: number;
    capacity: number;
    spotsOpen: number;
    share: number;
    status: string;
}

async function toBoxView(box: Box, lat: number, lng: number): Promise<BoxView | null> {
    const venue = await getVenueById(box.venueId);
    const slot = await getSlotById(box.slotId);
    const hostMember = box.members.find(member => member.role === "host");
    const host = hostMember ? await getUserById(hostMember.userId) : null;
    if (!venue || !slot || !host) {
        return null;
    }
    const room = venue.rooms.find(room => room.id === box.roomId);
    return {
        id: box.id,
        title: box.title,
        genre: box.genre,
        venue: {
            id: venue.id,
            name: venue.name,
            distanceKm: Math.round(haversineKm(lat, lng, venue.lat, venue.lng) * 10) / 10
        },
        roomName: room ? room.name : "",
        start: slot.start,
        end: slot.end,
        host: toPublicUser(host),
        membersCount: box.members.length,
        capacity: box.capacity,
        spotsOpen: box.capacity - box.members.length,
        share: shareFor(box),
        status: box.status
    };
}

// A box is over once its slot's end time has passed. Nothing schedules that
// transition — it happens lazily, the first time anyone reads the box, so it
// survives restarts and needs no timer. ISO-8601 strings sort chronologically,
// so "end < now" is a plain $lt on the stored string.
//
// A box that was booked but never paid for is a different story: that night
// never happened, so it is cancelled instead of ended and the room goes back
// to the venue.
export async function closeFinishedBoxes() {
    // Only boxes that are still open can need closing, and every sweep shrinks
    // that set — so this never walks the whole history.
    const open = await boxesCollection.find({ status: { $in: ["upcoming", "pending_payment"] } }).toArray();
    if (open.length === 0) {
        return;
    }
    const now = new Date().toISOString();
    const finished = await slotsCollection.find({
        id: { $in: open.map(box => box.slotId) },
        end: { $lt: now }
    }).toArray();
    if (finished.length === 0) {
        return;
    }

    const slotIds = finished.map(slot => slot.id);
    await boxesCollection.updateMany(
        { slotId: { $in: slotIds }, status: "upcoming" },
        { $set: { status: "ended" } }
    );

    const abandoned = open.filter(box => box.status === "pending_payment" && slotIds.includes(box.slotId));
    if (abandoned.length > 0) {
        await boxesCollection.updateMany(
            { id: { $in: abandoned.map(box => box.id) } },
            { $set: { status: "cancelled" } }
        );
        await slotsCollection.updateMany(
            { id: { $in: abandoned.map(box => box.slotId) } },
            { $set: { status: "available" } }
        );
    }
}

// Same rule as closeFinishedBoxes, for a single box: cheaper than sweeping
// everything on reads that only touch one room.
async function closeIfFinished(box: Box): Promise<Box> {
    if (box.status !== "upcoming" && box.status !== "pending_payment") {
        return box;
    }
    const slot = await getSlotById(box.slotId);
    if (!slot || slot.end >= new Date().toISOString()) {
        return box;
    }
    if (box.status === "upcoming") {
        await boxesCollection.updateOne({ id: box.id }, { $set: { status: "ended" } });
        return { ...box, status: "ended" };
    }
    await boxesCollection.updateOne({ id: box.id }, { $set: { status: "cancelled" } });
    await slotsCollection.updateOne({ id: box.slotId }, { $set: { status: "available" } });
    return { ...box, status: "cancelled" };
}

export async function getBoxById(id: string): Promise<Box | null> {
    const box = await boxesCollection.findOne({ id: id });
    if (!box) {
        return null;
    }
    return await closeIfFinished(box);
}

async function findJoinableBoxes(user: User, lat: number, lng: number, distanceKm: number, from: Date, to: Date) {
    // Never offer a night that is already over.
    await closeFinishedBoxes();
    const candidates = await boxesCollection.find({ openToPublic: true, status: "upcoming" }).toArray();
    const joinable: { box: Box; view: BoxView }[] = [];
    for (const box of candidates) {
        if (box.members.some(member => member.userId === user.id)) {
            continue;
        }
        if (box.members.length >= box.capacity) {
            continue;
        }
        const view = await toBoxView(box, lat, lng);
        if (!view || view.venue.distanceKm > distanceKm) {
            continue;
        }
        const start = new Date(view.start);
        if (start < from || start > to) {
            continue;
        }
        joinable.push({ box: box, view: view });
    }
    return joinable;
}

async function generateNpcBox(user: User, venues: VenueNearby[], from: Date, to: Date): Promise<Box | null> {
    const venue = pick(venues);
    const roomSlots = (await ensureSlots(venue, from, to)).filter(entry => entry.slots.length > 0);
    if (roomSlots.length === 0) {
        return null;
    }
    const chosen = pick(roomSlots);
    const slot = pick(chosen.slots);
    const genre = pick(NPC_GENRES);
    const host = await createNpcUser(venue.lat, venue.lng, genre);

    // Host + 1..capacity-2 NPC members, so there are always spots open.
    const members: BoxMember[] = [{ userId: host.id, role: "host", paid: true }];
    const extraMembers = randomInt(1, Math.max(1, chosen.room.seats - 2));
    for (let i = 0; i < extraMembers; i++) {
        const npc = await createNpcUser(venue.lat, venue.lng, genre);
        members.push({ userId: npc.id, role: "member", paid: true });
    }

    const box: Box = {
        id: newId("b"),
        title: randomBoxTitle(genre),
        genre: genre,
        venueId: venue.id,
        roomId: chosen.room.id,
        slotId: slot.id,
        seats: chosen.room.seats,
        capacity: chosen.room.seats,
        totalPrice: chosen.room.pricePerHour,
        openToPublic: true,
        status: "upcoming",
        members: members,
        invitedUsernames: []
    };
    await boxesCollection.insertOne(box);
    await slotsCollection.updateOne({ id: slot.id }, { $set: { status: "booked" } });

    // Now and then the NPC host also invites the real user — feeds notifications.
    if (!user.isNpc && Math.random() < 0.25) {
        await createInvite(box, host, user);
    }
    return box;
}

export async function ensureOpenBoxesNear(user: User, lat: number, lng: number, distanceKm: number, from: Date, to: Date): Promise<BoxView[]> {
    let joinable = await findJoinableBoxes(user, lat, lng, distanceKm, from, to);
    if (joinable.length < 3) {
        const venues = await ensureVenuesNear(lat, lng, distanceKm);
        const missing = 3 - joinable.length;
        for (let i = 0; i < missing; i++) {
            await generateNpcBox(user, venues, from, to);
        }
        joinable = await findJoinableBoxes(user, lat, lng, distanceKm, from, to);
    }
    return joinable
        .map(entry => entry.view)
        .sort((a, b) => a.start.localeCompare(b.start));
}

// ---------------------------------------------------------------------------
// Notifications — invites, with a guaranteed first invite (§2.3)
// ---------------------------------------------------------------------------

export async function createInvite(box: Box, fromUser: User, toUser: User) {
    const notification: Notification = {
        id: newId("n"),
        toUserId: toUser.id,
        fromUserId: fromUser.id,
        boxId: box.id,
        status: "pending"
    };
    await notificationsCollection.insertOne(notification);
    // Re-read the box so inviting several users in a row doesn't lose names.
    const current = await getBoxById(box.id);
    if (current && !current.invitedUsernames.includes(toUser.username)) {
        await boxesCollection.updateOne(
            { id: box.id },
            { $set: { invitedUsernames: [...current.invitedUsernames, toUser.username] } }
        );
    }
    return notification;
}

export async function ensureNotificationsFor(user: User) {
    // The very first call guarantees at least one pending invite, so the
    // notification flow is always demoable.
    const everReceived = await notificationsCollection.find({ toUserId: user.id }).toArray();
    if (everReceived.length === 0 && user.location) {
        const from = new Date();
        const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const boxes = await ensureOpenBoxesNear(user, user.location.lat, user.location.lng, 3, from, to);
        if (boxes.length > 0) {
            const box = await getBoxById(pick(boxes).id);
            if (box) {
                const hostMember = box.members.find(member => member.role === "host");
                const host = hostMember ? await getUserById(hostMember.userId) : null;
                if (host) {
                    await createInvite(box, host, user);
                }
            }
        }
    }

    const pending = await notificationsCollection.find({ toUserId: user.id, status: "pending" }).toArray();
    const result = [];
    for (const notification of pending) {
        const sender = await getUserById(notification.fromUserId);
        const box = await getBoxById(notification.boxId);
        if (!sender || !box) {
            continue;
        }
        const venue = await getVenueById(box.venueId);
        const slot = await getSlotById(box.slotId);
        // Expired invites: the box already ended or was cancelled, or its slot
        // has started. Accepting these fails anyway, so don't list them.
        if (box.status === "ended" || box.status === "cancelled") {
            continue;
        }
        if (slot && new Date(slot.start) <= new Date()) {
            continue;
        }
        result.push({
            id: notification.id,
            status: notification.status,
            from: toPublicUser(sender),
            box: {
                id: box.id,
                title: box.title,
                genre: box.genre,
                venueName: venue ? venue.name : "",
                start: slot ? slot.start : "",
                share: shareFor(box)
            }
        });
    }
    return result;
}

// ---------------------------------------------------------------------------
// Matchmaking (§5) — song overlap + genre affinity
// ---------------------------------------------------------------------------

// A user's genre profile: how often each genre occurs in their favourites.
async function genreProfileFor(user: User) {
    const songs = await getSongsByIds(user.favoriteSongIds);
    const profile = new Map<string, number>();
    for (const song of songs) {
        for (const genre of song.genre) {
            profile.set(genre, (profile.get(genre) || 0) + 1);
        }
    }
    return profile;
}

// Same profile as a plain { genre: count } object, for JSON responses (GET /me).
export async function getGenreProfile(user: User) {
    const profile: { [genre: string]: number } = {};
    for (const [genre, count] of await genreProfileFor(user)) {
        profile[genre] = count;
    }
    return profile;
}

// Cosine similarity between two genre profiles: 1 = same taste in genres,
// 0 = nothing in common (or an empty profile).
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>) {
    let dot = 0;
    for (const [genre, count] of a) {
        dot += count * (b.get(genre) || 0);
    }
    const normA = Math.sqrt([...a.values()].reduce((sum, count) => sum + count * count, 0));
    const normB = Math.sqrt([...b.values()].reduce((sum, count) => sum + count * count, 0));
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dot / (normA * normB);
}

// matchPct = round(100 * (0.6 * songOverlap + 0.4 * genreAffinity)).
// Because the catalog is genre-discriminative, genreAffinity is meaningful
// even when two singers share zero exact songs.
// Split out of scoreMatch so a list endpoint can score many singers against
// one viewer without rebuilding the viewer's genre profile for each candidate.
function matchPctBetween(me: User, other: User, myProfile: Map<string, number>, otherProfile: Map<string, number>) {
    const common = me.favoriteSongIds.filter(id => other.favoriteSongIds.includes(id));
    const smallest = Math.min(me.favoriteSongIds.length, other.favoriteSongIds.length);
    const songOverlap = smallest === 0 ? 0 : common.length / smallest;
    const genreAffinity = cosineSimilarity(myProfile, otherProfile);
    return { matchPct: Math.round(100 * (0.6 * songOverlap + 0.4 * genreAffinity)), common: common };
}

export async function scoreMatch(me: User, host: User) {
    const score = matchPctBetween(me, host, await genreProfileFor(me), await genreProfileFor(host));
    const commonSongs = (await getSongsByIds(score.common.slice(0, 3))).map(song => song.title);
    return { matchPct: score.matchPct, commonSongs: commonSongs };
}

// Returns a scorer bound to one viewer, for lists of singers. The viewer
// scores null against themself — "100% match" next to your own name reads as
// a bug, so the app hides the badge instead.
export async function matchScorerFor(viewer: User) {
    const myProfile = await genreProfileFor(viewer);
    return async function matchPctFor(other: User) {
        if (other.id === viewer.id) {
            return null;
        }
        return matchPctBetween(viewer, other, myProfile, await genreProfileFor(other)).matchPct;
    };
}

export async function ensureMatchesNear(user: User, lat: number, lng: number, distanceKm: number, from: Date, to: Date, minOverlap: number) {
    const boxes = await ensureOpenBoxesNear(user, lat, lng, distanceKm, from, to);
    const matches = [];
    for (const view of boxes) {
        const host = await getUserById(view.host.id);
        if (!host) {
            continue;
        }
        const score = await scoreMatch(user, host);
        if (score.matchPct >= minOverlap) {
            matches.push({ ...view, matchPct: score.matchPct, commonSongs: score.commonSongs });
        }
    }
    return matches.sort((a, b) => b.matchPct - a.matchPct);
}

// ---------------------------------------------------------------------------
// Booking & payment (§6) — payment is simulated and always succeeds
// ---------------------------------------------------------------------------

// The one rule for splitting a booking: the price of the hour over the seats in
// the room. It lives here so no client ever re-derives it — the rooms handed out
// by the venue endpoints already carry the answer as pricePerSeat.
export function splitPrice(total: number, seats: number) {
    return Math.round(total / seats);
}

// Split over the room's seats, never over the (possibly smaller) capacity: a
// host who keeps seats free for their own guests carries that cost themselves
// and settles up with those guests outside the app. Everyone joining through
// the app pays the same per-seat price they would in a wide-open box.
export function shareFor(box: Box) {
    return splitPrice(box.totalPrice, box.seats);
}

// The genre a user sings most, from their favourite songs. Used as the genre
// of boxes they host; new users without favourites default to "Pop".
// Arrangement/audience tags (NON_TASTE_GENRES) are skipped so a box is always
// themed on an actual musical style — "Duet" is a common tag but a meaningless
// party theme.
export async function dominantGenreFor(user: User) {
    const songs = await getSongsByIds(user.favoriteSongIds);
    const counts = new Map<string, number>();
    for (const song of songs) {
        for (const genre of song.genre) {
            if (NON_TASTE_GENRES.includes(genre)) {
                continue;
            }
            counts.set(genre, (counts.get(genre) || 0) + 1);
        }
    }
    let best = "Pop";
    let bestCount = 0;
    for (const [genre, count] of counts) {
        if (count > bestCount) {
            best = genre;
            bestCount = count;
        }
    }
    return best;
}

// Host books a room slot: the box starts pending_payment; the slot is only
// marked booked once the host pays. openSpots is how many seats the host offers
// to other singers — fewer than the room holds leaves seats for people the host
// brings along outside the app.
export async function createBox(host: User, venue: Venue, room: Room, slot: Slot, title: string, openSpots: number): Promise<Box> {
    const genre = await dominantGenreFor(host);
    const box: Box = {
        id: newId("b"),
        title: title !== "" ? title : randomBoxTitle(genre),
        genre: genre,
        venueId: venue.id,
        roomId: room.id,
        slotId: slot.id,
        seats: room.seats,
        // The host takes one of the seats themself.
        capacity: openSpots + 1,
        totalPrice: room.pricePerHour,
        openToPublic: true,
        status: "pending_payment",
        members: [{ userId: host.id, role: "host", paid: false }],
        invitedUsernames: []
    };
    await boxesCollection.insertOne(box);
    return box;
}

export async function addBoxMember(box: Box, user: User) {
    const members: BoxMember[] = [...box.members, { userId: user.id, role: "member", paid: false }];
    await boxesCollection.updateOne({ id: box.id }, { $set: { members: members } });
    return { ...box, members: members };
}

// Simulated payment. Host paying confirms the booking (box upcoming, slot
// booked); a joiner paying just becomes a paid member.
export async function payForBox(box: Box, user: User): Promise<Box> {
    const member = box.members.find(member => member.userId === user.id);
    const members = box.members.map(m => m.userId === user.id ? { ...m, paid: true } : m);
    if (member && member.role === "host" && box.status === "pending_payment") {
        await boxesCollection.updateOne({ id: box.id }, { $set: { members: members, status: "upcoming" } });
        await slotsCollection.updateOne({ id: box.slotId }, { $set: { status: "booked" } });
        return { ...box, members: members, status: "upcoming" };
    }
    await boxesCollection.updateOne({ id: box.id }, { $set: { members: members } });
    return { ...box, members: members };
}

export async function getNotificationById(id: string): Promise<Notification | null> {
    return await notificationsCollection.findOne({ id: id });
}

export async function setNotificationStatus(id: string, status: "accepted" | "declined") {
    await notificationsCollection.updateOne({ id: id }, { $set: { status: status } });
}

// ---------------------------------------------------------------------------
// Box room, crew & ratings (§6)
// ---------------------------------------------------------------------------

// The full room view for a member: venue/room/start, members with their
// host/paid tags, invited usernames and spots left.
export async function getBoxRoom(box: Box, viewer: User) {
    const venue = await getVenueById(box.venueId);
    const slot = await getSlotById(box.slotId);
    const room = venue ? venue.rooms.find(room => room.id === box.roomId) : undefined;
    const matchPctFor = await matchScorerFor(viewer);
    const members = [];
    for (const member of box.members) {
        const user = await getUserById(member.userId);
        if (user) {
            members.push({
                ...toPublicUser(user),
                role: member.role,
                paid: member.paid,
                matchPct: await matchPctFor(user)
            });
        }
    }
    return {
        id: box.id,
        title: box.title,
        genre: box.genre,
        status: box.status,
        openToPublic: box.openToPublic,
        venue: venue ? { id: venue.id, name: venue.name, lat: venue.lat, lng: venue.lng } : null,
        roomName: room ? room.name : "",
        start: slot ? slot.start : "",
        end: slot ? slot.end : "",
        seats: box.seats,
        capacity: box.capacity,
        totalPrice: box.totalPrice,
        share: shareFor(box),
        spotsLeft: box.capacity - box.members.length,
        members: members,
        invitedUsernames: box.invitedUsernames,
        // Lets an ended room show "rate your crew" or "already rated" without
        // a second round trip.
        rated: await hasRatedBox(viewer, box.id)
    };
}

export async function setBoxOpenToPublic(box: Box, openToPublic: boolean) {
    await boxesCollection.updateOne({ id: box.id }, { $set: { openToPublic: openToPublic } });
}

// Fellow members of an ended box — the people you can rate.
export async function getCrew(box: Box, user: User) {
    const matchPctFor = await matchScorerFor(user);
    const crew = [];
    for (const member of box.members) {
        if (member.userId === user.id) {
            continue;
        }
        const fellow = await getUserById(member.userId);
        if (fellow) {
            crew.push({ ...toPublicUser(fellow), role: member.role, matchPct: await matchPctFor(fellow) });
        }
    }
    return crew;
}

export async function hasRatedBox(user: User, boxId: string) {
    const ratings = await ratingsCollection.find({ boxId: boxId, fromUserId: user.id }).toArray();
    return ratings.length > 0;
}

// A user's singer rating is the average of all stars they ever received,
// recomputed on each new rating.
async function recomputeSingerRating(userId: number) {
    const received = await ratingsCollection.find({ toUserId: userId }).toArray();
    if (received.length === 0) {
        return;
    }
    const total = received.reduce((sum, rating) => sum + rating.stars, 0);
    const average = Math.round((total / received.length) * 10) / 10;
    await usersCollection.updateOne({ id: userId }, { $set: { singerRating: average } });
}

export async function createRatings(box: Box, fromUser: User, entries: { toUserId: number; stars: number; text: string }[]) {
    const ratings: Rating[] = entries.map(entry => ({
        id: newId("rt"),
        boxId: box.id,
        fromUserId: fromUser.id,
        toUserId: entry.toUserId,
        stars: entry.stars,
        text: entry.text
    }));
    await ratingsCollection.insertMany(ratings);
    for (const entry of entries) {
        await recomputeSingerRating(entry.toUserId);
    }
}

// ---------------------------------------------------------------------------
// Chat — polled messages per box; NPC members reply now and then
// ---------------------------------------------------------------------------

export async function getMessagesForBox(boxId: string) {
    const messages: Message[] = await messagesCollection.find({ boxId: boxId }).toArray();
    messages.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const result = [];
    for (const message of messages) {
        const sender = await getUserById(message.userId);
        result.push({
            id: message.id,
            boxId: message.boxId,
            userId: message.userId,
            from: sender ? toPublicUser(sender) : null,
            text: message.text,
            sentAt: message.sentAt
        });
    }
    return result;
}

export async function createMessage(box: Box, userId: number, text: string): Promise<Message> {
    const message: Message = {
        id: newId("m"),
        boxId: box.id,
        userId: userId,
        text: text,
        sentAt: new Date().toISOString()
    };
    await messagesCollection.insertOne(message);
    return message;
}

// Now and then an NPC member answers a real user's message with a canned
// reply, so the chat feels alive. Clients poll, so the reply simply shows up
// on the next GET.
export async function maybeNpcReply(box: Box, afterUserId: number) {
    if (Math.random() >= 0.6) {
        return null;
    }
    const otherIds = box.members
        .filter(member => member.userId !== afterUserId)
        .map(member => member.userId);
    const others = await usersCollection.find({ id: { $in: otherIds } }).toArray();
    const npcs = others.filter(other => other.isNpc);
    if (npcs.length === 0) {
        return null;
    }
    return await createMessage(box, pick(npcs).id, randomNpcReply());
}

// ---------------------------------------------------------------------------
// Mine — upcoming + past, with a backfilled past box (§2.5)
// ---------------------------------------------------------------------------

// Demo affordance: the first time a user looks at their history and has none,
// one ended, unrated box from last week materializes so the rating flow is
// testable without waiting for a real booking to pass.
async function createPastBox(user: User): Promise<Box | null> {
    if (!user.location) {
        return null;
    }
    const venues = await ensureVenuesNear(user.location.lat, user.location.lng, 3);
    const venue = pick(venues);
    const room = pick(venue.rooms);

    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(21, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    const slot: Slot = {
        id: newId("sl"),
        venueId: venue.id,
        roomId: room.id,
        start: start.toISOString(),
        end: end.toISOString(),
        status: "booked"
    };
    await slotsCollection.insertOne(slot);

    const genre = pick(NPC_GENRES);
    const host = await createNpcUser(venue.lat, venue.lng, genre);
    const members: BoxMember[] = [
        { userId: host.id, role: "host", paid: true },
        { userId: user.id, role: "member", paid: true }
    ];
    const crewSize = randomInt(2, 3);
    for (let i = 0; i < crewSize; i++) {
        const npc = await createNpcUser(venue.lat, venue.lng, genre);
        members.push({ userId: npc.id, role: "member", paid: true });
    }

    const box: Box = {
        id: newId("b"),
        title: randomBoxTitle(genre),
        genre: genre,
        venueId: venue.id,
        roomId: room.id,
        slotId: slot.id,
        seats: room.seats,
        capacity: room.seats,
        totalPrice: room.pricePerHour,
        openToPublic: false,
        status: "ended",
        members: members,
        invitedUsernames: []
    };
    await boxesCollection.insertOne(box);
    return box;
}

export async function getMyBoxes(user: User) {
    // Sweep first, so a night that just finished lands under "past" here.
    await closeFinishedBoxes();
    const all: Box[] = await boxesCollection.find({}).toArray();
    const mine = all.filter(box => box.members.some(member => member.userId === user.id));
    if (!mine.some(box => box.status === "ended")) {
        const past = await createPastBox(user);
        if (past) {
            mine.push(past);
        }
    }

    const lat = user.location ? user.location.lat : 0;
    const lng = user.location ? user.location.lng : 0;
    const upcoming = [];
    const past = [];
    for (const box of mine) {
        // A cancelled box never happened — it belongs in neither list.
        if (box.status === "cancelled") {
            continue;
        }
        const view = await toBoxView(box, lat, lng);
        if (!view) {
            continue;
        }
        if (box.status === "ended") {
            const myRatings = await ratingsCollection.find({ boxId: box.id, fromUserId: user.id }).toArray();
            past.push({ ...view, rated: myRatings.length > 0 });
        } else {
            upcoming.push(view);
        }
    }
    upcoming.sort((a, b) => a.start.localeCompare(b.start));
    past.sort((a, b) => b.start.localeCompare(a.start));
    return { upcoming: upcoming, past: past };
}

// ---------------------------------------------------------------------------
// Seed — deliberately tiny. Everything else (venues, slots, NPCs, boxes)
// is generated on demand once the sparse-generation layer is implemented.
// ---------------------------------------------------------------------------

// 100 songs picked from the karafun catalog (karafuncatalog.csv) via a
// greedy set-cover: guarantees every one of its ~41 style tags appears at
// least once, then fills the rest proportional to each style's catalog
// frequency (capped per artist) for a realistic, broad genre spread.
// Ids match the karafun catalog's own numeric ids.
const SEED_SONGS: Omit<Song, "_id">[] = [
    { id: "52172", title: "Little Drummer Boy", artist: "Whitney Houston", genre: ["Christmas", "Soul", "Pop", "R&B", "Love", "Spiritual Music", "Duet"] },
    { id: "54812", title: "Points of Authority / 99 Problems / One Step Closer", artist: "Linkin Park", genre: ["Metal", "Hip-Hop", "Hard Rock", "Rap", "Alternative", "Duet"] },
    { id: "71487", title: "I Got a Feeling in My Body (Stuart Price)", artist: "Elvis (film)", genre: ["Soundtrack", "Electro", "Rock 'n Roll", "Dance", "Rock", "Pop"] },
    { id: "12727", title: "Il vit en toi", artist: "The Lion King (musical)", genre: ["Musical", "French pop", "Kids", "Gospel", "Zouk/Creole/Soca/Calypso", "Duet"] },
    { id: "33678", title: "Dance Away", artist: "Roxy Music", genre: ["Soft rock", "Synthpop", "Disco", "Latin Music"] },
    { id: "28218", title: "All Together Now", artist: "The Beatles", genre: ["Folk", "Blues", "Country"] },
    { id: "50969", title: "40oz. to Freedom", artist: "Sublime", genre: ["Reggae", "Punk/Grunge", "Ska", "Rock", "Alternative"] },
    { id: "16873", title: "Viva Colonia", artist: "Höhner", genre: ["Schlager", "Pop", "Humor", "Rock", "Traditional"] },
    { id: "17883", title: "Here's That Rainy Day", artist: "Frank Sinatra", genre: ["Classical", "Jazz"] },
    { id: "8508", title: "Desert Rose", artist: "Sting", genre: ["Pop", "Rock", "Moyen Orient", "World/Folk"] },
    { id: "51608", title: "Girls Talk Boys", artist: "5 Seconds of Summer", genre: ["Rock", "Funk", "Teen pop", "Soundtrack"] },
    { id: "56578", title: "Diggin' My Grave", artist: "A Star is Born (2018 film)", genre: ["Soundtrack", "Rock", "Blues", "Country", "Pop", "Duet"] },
    { id: "56894", title: "Dirty Dancing Medley", artist: "Dirty Dancing", genre: ["Soundtrack", "Pop", "Rock", "Love", "Latin Music"] },
    { id: "69197", title: "Dang!", artist: "Mac Miller", genre: ["Pop", "Hip-Hop", "Rap", "R&B", "Jazz", "Funk", "Duet"] },
    { id: "71971", title: "Sweet Symphony", artist: "Joy Oladokun", genre: ["Love", "Country", "Rock", "Pop", "Duet"] },
    { id: "46350", title: "Zero", artist: "Yeah Yeah Yeahs", genre: ["Alternative", "Rock", "Synthpop", "Pop", "Dance", "Punk/Grunge"] },
    { id: "27871", title: "Le mambo du décalco", artist: "Richard Gotainer", genre: ["Pop", "Synthpop", "French pop", "Humor", "Latin Music"] },
    { id: "22488", title: "Don't Trust Me", artist: "3OH!3", genre: ["Alternative", "Rock", "Electro", "Pop", "Dance"] },
    { id: "82452", title: "Come un tuono", artist: "Rose Villain", genre: ["R&B", "Hip-Hop", "Latin Music", "Pop", "Duet"] },
    { id: "50717", title: "Ik hou van u", artist: "Noordkaap", genre: ["Schlager", "Pop", "Rock", "Folk", "Soundtrack"] },
    { id: "36984", title: "La chanson d'Orphée", artist: "Gloria Lasso", genre: ["French pop", "Love", "Latin Music", "Soundtrack", "Musical"] },
    { id: "47693", title: "The CCR Mix", artist: "Creedence Clearwater Revival", genre: ["Rock", "Folk", "Country", "Soul", "Blues"] },
    { id: "64258", title: "Pretty Savage", artist: "BLACKPINK", genre: ["Hip-Hop", "Teen pop", "Pop", "Electro", "Rap", "Dance"] },
    { id: "53027", title: "Sixty Years Ago", artist: "Derek Ryan", genre: ["Country", "Love", "Pop", "Folk", "Traditional"] },
    { id: "70392", title: "Tommy the Cat", artist: "Primus", genre: ["Metal", "Alternative", "Hard Rock", "Funk", "Rock", "Duet"] },
    { id: "37734", title: "Bella Luna", artist: "Jason Mraz", genre: ["Pop", "Soul", "Soft rock", "Latin Music"] },
    { id: "12359", title: "Angela", artist: "Saian Supa Crew", genre: ["Hip-Hop", "Zouk/Creole/Soca/Calypso", "French pop", "Rap", "Soul", "Reggae"] },
    { id: "30642", title: "Johnny", artist: "Vaya Con Dios", genre: ["French pop", "Folk", "Jazz", "Latin Music"] },
    { id: "9827", title: "Money, Money", artist: "Cabaret", genre: ["Musical", "Soundtrack", "Jazz", "Humor", "Pop", "Duet"] },
    { id: "51945", title: "Sainte Nuit", artist: "Roch Voisine", genre: ["Christmas", "Love", "French pop", "Kids", "Spiritual Music"] },
    { id: "56747", title: "Bosom of Abraham (Where No One Stands Alone)", artist: "Elvis Presley", genre: ["Country", "Rock", "Gospel", "Folk", "Spiritual Music"] },
    { id: "43491", title: "Come Along", artist: "Titiyo", genre: ["Soul", "Pop", "Electro", "Soft rock", "Synthpop"] },
    { id: "86338", title: "This Is How I Disappear", artist: "My Chemical Romance", genre: ["Metal", "Alternative", "Punk/Grunge", "Hard Rock", "Rock"] },
    { id: "30599", title: "Soñar", artist: "Allan Théo", genre: ["French pop", "Latin Music", "Teen pop", "Dance"] },
    { id: "38942", title: "I'm Gonna Sit Right Down and Write Myself a Letter", artist: "Barry Manilow", genre: ["Blues", "Rock 'n Roll", "Country", "Pop"] },
    { id: "34391", title: "Silent Night", artist: "Children's Chorus", genre: ["Christmas", "Spiritual Music", "Traditional", "Kids", "Jazz"] },
    { id: "52623", title: "Roses", artist: "OutKast", genre: ["R&B", "Hip-Hop", "Soul", "Rap", "Alternative", "Duet"] },
    { id: "46484", title: "Kalimba de luna", artist: "Dalida", genre: ["Disco", "French pop", "Latin Music", "Synthpop"] },
    { id: "16922", title: "Could I Have This Dance", artist: "Anne Murray", genre: ["Country", "Soundtrack", "Soft rock", "Love"] },
    { id: "56213", title: "Ich will immer wieder... dieses Fieber spür'n (Live)", artist: "Helene Fischer", genre: ["Schlager", "Dance", "Electro", "Jazz"] },
    { id: "71293", title: "Everything's Ruined", artist: "Faith No More", genre: ["Metal", "Hard Rock", "Funk", "Rock", "Alternative"] },
    { id: "51602", title: "Calypso Queen", artist: "Calypso Rose", genre: ["Latin Music", "World/Folk", "Reggae", "Zouk/Creole/Soca/Calypso"] },
    { id: "54474", title: "Jingle Bell Rock", artist: "Glee", genre: ["Christmas", "Rock 'n Roll", "Soundtrack", "Musical"] },
    { id: "84155", title: "Battle Hymn of the Republic (live)", artist: "Johnny Cash", genre: ["Country", "Gospel", "Spiritual Music", "Traditional"] },
    { id: "48936", title: "Augenbling", artist: "Seeed", genre: ["Rap", "Hip-Hop", "R&B", "Schlager"] },
    { id: "16215", title: "Como la vida", artist: "Hanna", genre: ["Pop", "Soft rock", "Teen pop", "Latin Music"] },
    { id: "45607", title: "Sandy", artist: "Sylvie Vartan", genre: ["Rock 'n Roll", "French pop", "Country"] },
    { id: "19264", title: "Dschinghis Khan", artist: "Dschinghis Khan", genre: ["Disco", "Schlager", "Humor"] },
    { id: "19162", title: "Hey Baby", artist: "No Doubt", genre: ["Reggae", "Ska", "Pop", "Rock", "Duet", "R&B"] },
    { id: "53335", title: "Is You Is or Is You Ain't Ma' Baby", artist: "Five Guys Named Moe", genre: ["Musical", "Blues", "Jazz", "Soul"] },
    { id: "78218", title: "Monster", artist: "STARSET", genre: ["Metal", "Hard Rock", "Electro"] },
    { id: "61579", title: "La femme de mon ami", artist: "Enrico Macias", genre: ["French pop", "Moyen Orient", "World/Folk"] },
    { id: "62402", title: "Auf der Suche nach Weihnachten", artist: "Rolf Zuckowski", genre: ["Christmas", "Schlager", "Folk", "Kids"] },
    { id: "67821", title: "'O sole mio", artist: "Il Volo", genre: ["Love", "Classical", "Latin Music", "Traditional"] },
    { id: "5488", title: "Making Your Mind Up", artist: "Bucks Fizz", genre: ["Rock 'n Roll", "Synthpop", "Disco"] },
    { id: "24468", title: "Turn Right", artist: "Jonas Brothers", genre: ["Teen pop", "Soft rock", "Country"] },
    { id: "22442", title: "Jai Ho! (You Are My Destiny)", artist: "The Pussycat Dolls", genre: ["R&B", "World/Folk", "Dance", "Soundtrack"] },
    { id: "71079", title: "Lord of the Thighs", artist: "Aerosmith", genre: ["Hard Rock", "Punk/Grunge"] },
    { id: "13572", title: "Requiem Aeternam", artist: "Le Roi Soleil", genre: ["Musical", "Gospel", "Classical"] },
    { id: "53589", title: "Feels", artist: "Calvin Harris", genre: ["Electro", "Pop", "Funk", "Ska"] },
    { id: "13284", title: "La danse de Zorba", artist: "Dalida", genre: ["French pop", "Moyen Orient"] },
    { id: "49375", title: "Tennessee Whiskey", artist: "Chris Stapleton", genre: ["Blues", "Country", "Soul", "Rock"] },
    { id: "6534", title: "Sweet Caroline", artist: "Neil Diamond", genre: ["Pop"] },
    { id: "12543", title: "Creep", artist: "Radiohead", genre: ["Rock", "Alternative"] },
    { id: "90690", title: "Choosin' Texas", artist: "Ella Langley", genre: ["Country"] },
    { id: "56442", title: "Shallow", artist: "A Star is Born (2018 film)", genre: ["Soundtrack", "Pop", "Duet"] },
    { id: "14121", title: "Take Me Home, Country Roads", artist: "John Denver", genre: ["Country", "Folk"] },
    { id: "5632", title: "Mr. Brightside", artist: "The Killers", genre: ["Alternative", "Pop", "Rock"] },
    { id: "12617", title: "Bohemian Rhapsody", artist: "Queen", genre: ["Rock"] },
    { id: "14609", title: "Don't Stop Believin'", artist: "Journey", genre: ["Rock", "Pop"] },
    { id: "53998", title: "Valerie", artist: "Amy Winehouse", genre: ["Pop", "Soul"] },
    { id: "13469", title: "Before He Cheats", artist: "Carrie Underwood", genre: ["Country"] },
    { id: "7300", title: "Dancing Queen", artist: "ABBA", genre: ["Disco", "Pop"] },
    { id: "5103", title: "My Way", artist: "Frank Sinatra", genre: ["Jazz", "Pop"] },
    { id: "14236", title: "Zombie", artist: "The Cranberries", genre: ["Rock", "Alternative"] },
    { id: "6475", title: "What's Up?", artist: "4 Non Blondes", genre: ["Rock", "Pop"] },
    { id: "8530", title: "I Want It That Way", artist: "Backstreet Boys", genre: ["Teen pop"] },
    { id: "11646", title: "J'irai où tu iras", artist: "Céline Dion", genre: ["French pop", "Duet"] },
    { id: "11335", title: "Wonderwall", artist: "Oasis", genre: ["Rock", "Alternative"] },
    { id: "79097", title: "Pink Pony Club", artist: "Chappell Roan", genre: ["Pop"] },
    { id: "36600", title: "Can't Help Falling in Love", artist: "Elvis Presley", genre: ["Love", "Soundtrack"] },
    { id: "6117", title: "Total Eclipse of the Heart", artist: "Bonnie Tyler", genre: ["Pop", "Rock"] },
    { id: "7064", title: "Picture", artist: "Kid Rock", genre: ["Country", "Duet"] },
    { id: "6229", title: "Neon Moon", artist: "Brooks & Dunn", genre: ["Country"] },
    { id: "10973", title: "Dreams", artist: "Fleetwood Mac", genre: ["Soft rock"] },
    { id: "5318", title: "Unwritten", artist: "Natasha Bedingfield", genre: ["Pop", "Soft rock", "Teen pop"] },
    { id: "13272", title: "Teenage Dirtbag", artist: "Wheatus", genre: ["Alternative", "Rock", "Soundtrack"] },
    { id: "19332", title: "Piano Man", artist: "Billy Joel", genre: ["Soft rock"] },
    { id: "5468", title: "I Wanna Dance with Somebody", artist: "Whitney Houston", genre: ["Synthpop", "Pop"] },
    { id: "7125", title: "Friends in Low Places", artist: "Garth Brooks", genre: ["Country"] },
    { id: "41659", title: "Beauty and a Beat", artist: "Justin Bieber", genre: ["Dance", "Pop", "R&B", "Teen pop"] },
    { id: "12258", title: "Billie Jean", artist: "Michael Jackson", genre: ["Disco", "Pop", "Funk"] },
    { id: "88727", title: "Golden", artist: "KPop Demon Hunters", genre: ["Soundtrack", "Duet"] },
    { id: "36011", title: "Someone Like You", artist: "Adele", genre: ["Pop", "Soul", "Love"] },
    { id: "11902", title: "Confessions nocturnes", artist: "Diam's", genre: ["Rap", "Hip-Hop", "R&B", "Duet"] },
    { id: "9673", title: "Man! I Feel Like a Woman!", artist: "Shania Twain", genre: ["Country", "Pop"] },
    { id: "16401", title: "Your Man", artist: "Josh Turner", genre: ["Country"] },
    { id: "27935", title: "Baby", artist: "Justin Bieber", genre: ["Teen pop", "Duet"] },
    { id: "24207", title: "Party in the U.S.A.", artist: "Miley Cyrus", genre: ["Teen pop"] },
    { id: "5921", title: "I Will Survive", artist: "Gloria Gaynor", genre: ["Disco"] }
];

// ---------------------------------------------------------------------------
// Seeded world — the lazy generators (§2.1–2.3) are run once up front around
// the demo location, so a fresh database is never empty on first launch.
// ---------------------------------------------------------------------------

// Antwerp, 51.231° N 4.418° E.
const SEED_LAT = 51.231;
const SEED_LNG = 4.418;
const SEED_RADIUS_KM = 3;
const SEED_DAYS_AHEAD = 7;
const SEED_BOX_COUNT = 8;

// Slots only ever exist in the future: ensureSlots skips any hour before `from`,
// and `to` caps the calendar at a week out.
export function seedWindow() {
    const from = new Date();
    const to = new Date(from.getTime() + SEED_DAYS_AHEAD * 24 * 60 * 60 * 1000);
    return { from: from, to: to };
}

async function seedHomeArea(user: User) {
    const { from, to } = seedWindow();
    const venues = await ensureVenuesNear(SEED_LAT, SEED_LNG, SEED_RADIUS_KM);
    for (const venue of venues) {
        await ensureSlots(venue, from, to);
    }
    // NPC hosts, members and their open boxes (some of which invite the user).
    for (let i = 0; i < SEED_BOX_COUNT; i++) {
        await generateNpcBox(user, venues, from, to);
    }
    console.log("[seed] " + venues.length + " venues around " + SEED_LAT + ", " + SEED_LNG);
}

async function seed() {
    if (await songsCollection.countDocuments() === 0) {
        await songsCollection.insertMany(SEED_SONGS);
    }
    if (await usersCollection.countDocuments() === 0) {
        await createUser({
            name: "Alex Kim",
            username: "alexsings",
            email: "alex@karamatch.test",
            password: "karamatch",
            token: null,
            bio: "",
            photoUrl: null,
            location: null,
            favoriteSongIds: sampleFavoriteSongIds(SEED_SONGS as Song[], pick(NPC_GENRES)),
            singerRating: 5,
            eventsCount: 0,
            friendIds: [],
            isNpc: false
        });
    }
    if (await venuesCollection.countDocuments() === 0) {
        const demoUser = await getUserByUsername("alexsings");
        if (demoUser) {
            await seedHomeArea(demoUser);
        }
    }
}

export async function resetDatabase() {
    await usersCollection.deleteMany({});
    await songsCollection.deleteMany({});
    await venuesCollection.deleteMany({});
    await cellsCollection.deleteMany({});
    await slotsCollection.deleteMany({});
    await boxesCollection.deleteMany({});
    await messagesCollection.deleteMany({});
    await notificationsCollection.deleteMany({});
    await ratingsCollection.deleteMany({});
    await seed();
}

async function exit() {
    try {
        await client.close();
        console.log("Disconnected from database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

export async function connect() {
    try {
        await client.connect();
        await seed();
        console.log("Connected to database");
        process.on("SIGINT", exit);
        process.on("SIGUSR2", exit);
    } catch (error) {
        console.error(error);
    }
}
