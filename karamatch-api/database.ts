import { Collection, MongoClient } from "mongodb";
import crypto from "crypto";
import dotenv from "dotenv";
import { User, Song, Venue, Room, Box, BoxMember, Notification, Cell, Slot, Message, Rating, toPublicUser } from "./types";
import {
    randomInt, pick, newId, randomVenue, randomNpcIdentity,
    sampleFavoriteSongIds, randomBoxTitle, randomNpcReply, NPC_GENRES
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
            const group = byGenre.get(song.genre) || [];
            group.push(song);
            byGenre.set(song.genre, group);
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
        counts.set(song.genre, (counts.get(song.genre) || 0) + 1);
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

export interface VenueNearby extends Venue {
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
            ...venue,
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
    room: { id: string; name: string; seats: number; pricePerHour: number };
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
            room: { id: room.id, name: room.name, seats: room.seats, pricePerHour: room.pricePerHour },
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
        photoUrl: null,
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
    return users.map(toPublicUser);
}

export async function searchUsers(query: string, user: User) {
    const regex = new RegExp(query, "i");
    const matches = await usersCollection.find({
        $or: [{ name: regex }, { username: regex }, { email: regex }]
    }).toArray();
    return matches
        .filter(match => match.id !== user.id && !user.friendIds.includes(match.id))
        .slice(0, 4)
        .map(toPublicUser);
}

export async function addFriend(user: User, other: User) {
    await usersCollection.updateOne({ id: user.id }, { $set: { friendIds: [...user.friendIds, other.id] } });
    await usersCollection.updateOne({ id: other.id }, { $set: { friendIds: [...other.friendIds, user.id] } });
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
        share: Math.round(box.totalPrice / box.capacity),
        status: box.status
    };
}

export async function getBoxById(id: string): Promise<Box | null> {
    return await boxesCollection.findOne({ id: id });
}

async function findJoinableBoxes(user: User, lat: number, lng: number, distanceKm: number, from: Date, to: Date) {
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
                share: Math.round(box.totalPrice / box.capacity)
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
        profile.set(song.genre, (profile.get(song.genre) || 0) + 1);
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
export async function scoreMatch(me: User, host: User) {
    const common = me.favoriteSongIds.filter(id => host.favoriteSongIds.includes(id));
    const smallest = Math.min(me.favoriteSongIds.length, host.favoriteSongIds.length);
    const songOverlap = smallest === 0 ? 0 : common.length / smallest;
    const genreAffinity = cosineSimilarity(await genreProfileFor(me), await genreProfileFor(host));
    const matchPct = Math.round(100 * (0.6 * songOverlap + 0.4 * genreAffinity));
    const commonSongs = (await getSongsByIds(common.slice(0, 3))).map(song => song.title);
    return { matchPct: matchPct, commonSongs: commonSongs };
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

export function shareFor(box: Box) {
    return Math.round(box.totalPrice / box.capacity);
}

// The genre a user sings most, from their favourite songs. Used as the genre
// of boxes they host; new users without favourites default to "pop".
export async function dominantGenreFor(user: User) {
    const songs = await getSongsByIds(user.favoriteSongIds);
    const counts = new Map<string, number>();
    for (const song of songs) {
        counts.set(song.genre, (counts.get(song.genre) || 0) + 1);
    }
    let best = "pop";
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
// marked booked once the host pays.
export async function createBox(host: User, venue: Venue, room: Room, slot: Slot, title: string): Promise<Box> {
    const genre = await dominantGenreFor(host);
    const box: Box = {
        id: newId("b"),
        title: title !== "" ? title : randomBoxTitle(genre),
        genre: genre,
        venueId: venue.id,
        roomId: room.id,
        slotId: slot.id,
        capacity: room.seats,
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
export async function getBoxRoom(box: Box) {
    const venue = await getVenueById(box.venueId);
    const slot = await getSlotById(box.slotId);
    const room = venue ? venue.rooms.find(room => room.id === box.roomId) : undefined;
    const members = [];
    for (const member of box.members) {
        const user = await getUserById(member.userId);
        if (user) {
            members.push({ ...toPublicUser(user), role: member.role, paid: member.paid });
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
        capacity: box.capacity,
        totalPrice: box.totalPrice,
        share: shareFor(box),
        spotsLeft: box.capacity - box.members.length,
        members: members,
        invitedUsernames: box.invitedUsernames
    };
}

export async function setBoxOpenToPublic(box: Box, openToPublic: boolean) {
    await boxesCollection.updateOne({ id: box.id }, { $set: { openToPublic: openToPublic } });
}

// Fellow members of an ended box — the people you can rate.
export async function getCrew(box: Box, user: User) {
    const crew = [];
    for (const member of box.members) {
        if (member.userId === user.id) {
            continue;
        }
        const fellow = await getUserById(member.userId);
        if (fellow) {
            crew.push({ ...toPublicUser(fellow), role: member.role });
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

const SEED_SONGS: Omit<Song, "_id">[] = [
    { id: "s1", title: "Bohemian Rhapsody", artist: "Queen", genre: "rock" },
    { id: "s2", title: "Livin' on a Prayer", artist: "Bon Jovi", genre: "rock" },
    { id: "s3", title: "Mr. Brightside", artist: "The Killers", genre: "rock" },
    { id: "s4", title: "Dancing Queen", artist: "ABBA", genre: "pop" },
    { id: "s5", title: "Firework", artist: "Katy Perry", genre: "pop" },
    { id: "s6", title: "Wannabe", artist: "Spice Girls", genre: "pop" },
    { id: "s7", title: "Total Eclipse of the Heart", artist: "Bonnie Tyler", genre: "power-ballad" },
    { id: "s8", title: "I Want It That Way", artist: "Backstreet Boys", genre: "power-ballad" },
    { id: "s9", title: "Idol", artist: "YOASOBI", genre: "k-pop/j-pop" },
    { id: "s10", title: "Gee", artist: "Girls' Generation", genre: "k-pop/j-pop" },
    { id: "s11", title: "Valerie", artist: "Amy Winehouse", genre: "soul/rnb" },
    { id: "s12", title: "Rolling in the Deep", artist: "Adele", genre: "soul/rnb" },
    { id: "s13", title: "Wannabe a Baller", artist: "Lil Troy", genre: "hip-hop/party" },
    { id: "s14", title: "Sweet Caroline", artist: "Neil Diamond", genre: "country" },
    { id: "s15", title: "Jolene", artist: "Dolly Parton", genre: "country" },
    { id: "s16", title: "Let It Go", artist: "Idina Menzel", genre: "musical/disney" },
    { id: "s17", title: "A Whole New World", artist: "Peabo Bryson & Regina Belle", genre: "musical/disney" }
];

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
            favoriteSongIds: [],
            singerRating: 5,
            eventsCount: 0,
            friendIds: [],
            isNpc: false
        });
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
