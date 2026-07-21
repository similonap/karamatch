import { Collection, MongoClient } from "mongodb";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { User, Song, Venue, Room, Party, PartyMember, Notification, Cell, Slot, Message, Rating, VenueReview, toPublicUser } from "./types";
import {
    randomInt, pick, pickMany, newId, randomVenue, randomNpcIdentity,
    sampleFavoriteSongIds, randomPartyTitle, randomNpcReply, randomVenueStars,
    randomVenueReviewText, NPC_GENRES, NON_TASTE_GENRES
} from "./generators";
dotenv.config();

export const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
const db = client.db("karamatch");

export const usersCollection: Collection<User> = db.collection<User>("users");
export const songsCollection: Collection<Song> = db.collection<Song>("songs");
export const venuesCollection: Collection<Venue> = db.collection<Venue>("venues");
export const cellsCollection: Collection<Cell> = db.collection<Cell>("cells");
export const slotsCollection: Collection<Slot> = db.collection<Slot>("slots");
export const partiesCollection: Collection<Party> = db.collection<Party>("parties");
export const messagesCollection: Collection<Message> = db.collection<Message>("messages");
export const notificationsCollection: Collection<Notification> = db.collection<Notification>("notifications");
export const ratingsCollection: Collection<Rating> = db.collection<Rating>("ratings");
export const venueReviewsCollection: Collection<VenueReview> = db.collection<VenueReview>("venueReviews");

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

// The curated pool, read once at connect() and kept in memory. It is ~1k songs
// and never changes while the server runs, so every caller below reads it from
// here instead of going back to a collection of 84k. Without this the world
// generator re-reads the whole catalog for every NPC it invents.
let curatedSongs: Song[] = [];
let genreCounts: { genre: string; count: number }[] = [];
let curatedPoolPromise: Promise<void> | null = null;

async function loadCuratedPool() {
    curatedSongs = await songsCollection.find({ curated: true }).toArray();
    const counts = new Map<string, number>();
    for (const song of curatedSongs) {
        for (const genre of song.genre) {
            counts.set(genre, (counts.get(genre) || 0) + 1);
        }
    }
    genreCounts = Array.from(counts.entries()).map(([genre, count]) => ({ genre, count }));
}

// Loaded on first use, then kept for the life of the process. seed() warms it
// so the first request never pays for it, but it cannot rely on that alone:
// the tests import the app without ever calling connect(), and jest's
// globalSetup seeds in a different process than the one the suites run in.
function ensureCuratedPool() {
    if (!curatedPoolPromise) {
        curatedPoolPromise = loadCuratedPool();
    }
    return curatedPoolPromise;
}

// How many results a search returns. The picker shows a scrolling list, not a
// paged one, so this is the whole budget.
const SEARCH_LIMIT = 50;

// Anything a user types goes into a RegExp, so the special characters have to
// be neutered first — otherwise "c++" or an unclosed "(" is a 500, and a
// pathological pattern is a way to hang the server on an 84k scan.
function escapeRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getSongs(query?: string) {
    if (!query) {
        await ensureCuratedPool();
        // Genre-interleaved discovery list: one song per genre, round-robin, so
        // the picker itself nudges users past their bubble (§3). Curated only —
        // this is the pool matchmaking is scored on, and 84k songs is not a
        // list anybody scrolls.
        const byGenre = new Map<string, Song[]>();
        for (const song of curatedSongs) {
            const primaryGenre = song.genre[0];
            if (primaryGenre === undefined) {
                continue;
            }
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
    // Searching does hit the full catalog — the point of importing it is that
    // you can find any song you actually want to sing.
    //
    // Anchored to a word boundary so "eyes" still finds "Can't Take My Eyes Off
    // You". That cannot seek into an index the way a ^-anchored pattern would,
    // so this walks the title/artist index keys — but it walks *keys*, and only
    // fetches the handful of documents that match, which is what keeps it around
    // 100ms over 84k songs instead of a full collection scan. Capped at
    // SEARCH_LIMIT. If it ever needs to be faster, a text index is the move
    // (at the cost of matching whole words only).
    const regex = new RegExp("\\b" + escapeRegex(query), "i");
    return await songsCollection
        .find({ $or: [{ title: regex }, { artist: regex }] })
        .limit(SEARCH_LIMIT)
        .toArray();
}

export async function getSongsByIds(ids: string[]) {
    return await songsCollection.find({ id: { $in: ids } }).toArray();
}

// Counted over the curated pool, not the catalog: these are the genres a user
// can actually build a taste profile out of.
export async function getGenres() {
    await ensureCuratedPool();
    return genreCounts;
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

// The stored venue plus the two fields that are derived from its reviews.
// rating is 0 when nobody has reviewed yet — clients read reviewsCount to tell
// "unrated" apart from "rated zero".
export interface VenueView extends Venue {
    rooms: RoomView[];
    rating: number;
    reviewsCount: number;
}

// Averages the reviews of many venues in one query, so a list of venues costs
// the same as a single one.
async function ratingsByVenue(venueIds: string[]) {
    const reviews = await venueReviewsCollection.find({ venueId: { $in: venueIds } }).toArray();
    const totals = new Map<string, { sum: number; count: number }>();
    for (const review of reviews) {
        const total = totals.get(review.venueId) || { sum: 0, count: 0 };
        total.sum += review.stars;
        total.count++;
        totals.set(review.venueId, total);
    }
    const result = new Map<string, { rating: number; reviewsCount: number }>();
    for (const [venueId, total] of totals) {
        result.set(venueId, {
            rating: Math.round((total.sum / total.count) * 10) / 10,
            reviewsCount: total.count
        });
    }
    return result;
}

function withRating(venue: Venue, ratings: Map<string, { rating: number; reviewsCount: number }>): VenueView {
    const rating = ratings.get(venue.id) || { rating: 0, reviewsCount: 0 };
    return { ...venue, rooms: venue.rooms.map(toRoomView), rating: rating.rating, reviewsCount: rating.reviewsCount };
}

export async function toVenueView(venue: Venue): Promise<VenueView> {
    return withRating(venue, await ratingsByVenue([venue.id]));
}

export async function toVenueViews(venues: Venue[]): Promise<VenueView[]> {
    const ratings = await ratingsByVenue(venues.map(venue => venue.id));
    return venues.map(venue => withRating(venue, ratings));
}

export interface VenueNearby extends VenueView {
    distanceKm: number;
    fromPrice: number;
}

export async function ensureVenuesNear(lat: number, lng: number, distanceKm: number): Promise<VenueNearby[]> {
    const party = boundingBox(lat, lng, distanceKm);

    // Every cell covered by the bounding party that was never generated gets
    // rolled once (0–2 venues), then marked generated — so the world is stable.
    const rows: number[] = [];
    for (let row = Math.floor(party.minLat / CELL_SIZE); row <= Math.floor(party.maxLat / CELL_SIZE); row++) {
        rows.push(row);
    }
    const cols: number[] = [];
    for (let col = Math.floor(party.minLng / CELL_SIZE); col <= Math.floor(party.maxLng / CELL_SIZE); col++) {
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

    // Bounding party query with course-taught operators, then exact haversine filter.
    let venues: Venue[] = await venuesCollection.find({
        lat: { $gte: party.minLat, $lte: party.maxLat },
        lng: { $gte: party.minLng, $lte: party.maxLng }
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

    // A venue with no reviews has no rating to show, so any venue seen here
    // without a history gets one invented. Doing it on sight rather than at
    // creation also fills in venues that predate the review system.
    const reviewed = await ratingsByVenue(venues.map(venue => venue.id));
    for (const venue of venues) {
        if (!reviewed.has(venue.id)) {
            await seedVenueReviews(venue);
        }
    }

    return (await toVenueViews(venues))
        .map(view => ({
            ...view,
            distanceKm: Math.round(haversineKm(lat, lng, view.lat, view.lng) * 10) / 10,
            fromPrice: Math.min(...view.rooms.map(room => room.pricePerHour))
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getVenueById(id: string): Promise<Venue | null> {
    return await venuesCollection.findOne({ id: id });
}

// ---------------------------------------------------------------------------
// Venue reviews — the stars a venue's rating is averaged from
// ---------------------------------------------------------------------------

const SEED_REVIEW_MIN = 3;
const SEED_REVIEW_MAX = 8;
const SEED_REVIEW_MAX_AGE_DAYS = 300;

// Reviewers for a generated venue's back catalogue. Existing NPCs are reused
// before new ones are invented, so the singer table does not grow by a handful
// of names for every venue the map rolls.
async function npcReviewers(venue: Venue, count: number): Promise<User[]> {
    const existing: User[] = await usersCollection.find({ isNpc: true }).limit(50).toArray();
    const reviewers = pickMany(existing, count);
    while (reviewers.length < count) {
        reviewers.push(await createNpcUser(venue.lat, venue.lng, pick(NPC_GENRES)));
    }
    return reviewers;
}

// A venue is generated with a history behind it. Without one, every venue on
// the map would show no rating at all until a real party happened to end there.
async function seedVenueReviews(venue: Venue) {
    const reviewers = await npcReviewers(venue, randomInt(SEED_REVIEW_MIN, SEED_REVIEW_MAX));
    const reviews: VenueReview[] = reviewers.map(reviewer => {
        const stars = randomVenueStars();
        return {
            id: newId("vr"),
            venueId: venue.id,
            partyId: null,
            userId: reviewer.id,
            stars: stars,
            text: randomVenueReviewText(stars),
            createdAt: new Date(
                Date.now() - randomInt(1, SEED_REVIEW_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000
            ).toISOString()
        };
    });
    if (reviews.length > 0) {
        await venueReviewsCollection.insertMany(reviews);
    }
}

// Newest first, each with the singer who wrote it.
export async function getVenueReviews(venueId: string) {
    const reviews: VenueReview[] = await venueReviewsCollection.find({ venueId: venueId }).toArray();
    reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const result = [];
    for (const review of reviews) {
        const author = await getUserById(review.userId);
        result.push({
            id: review.id,
            stars: review.stars,
            text: review.text,
            createdAt: review.createdAt,
            from: author ? toPublicUser(author) : null
        });
    }
    return result;
}

// One review per singer per night — the same rule the crew ratings follow.
export async function hasReviewedVenue(user: User, partyId: string) {
    const reviews = await venueReviewsCollection
        .find({ partyId: partyId, userId: user.id })
        .toArray();
    return reviews.length > 0;
}

export async function createVenueReview(party: Party, user: User, stars: number, text: string) {
    const review: VenueReview = {
        id: newId("vr"),
        venueId: party.venueId,
        partyId: party.id,
        userId: user.id,
        stars: stars,
        text: text,
        createdAt: new Date().toISOString()
    };
    await venueReviewsCollection.insertOne(review);
    // The ask has been answered — the notification should stop nagging.
    await notificationsCollection.updateMany(
        { toUserId: user.id, partyId: party.id, kind: "review", status: "pending" },
        { $set: { status: "accepted" } }
    );
    return review;
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
    await ensureCuratedPool();
    const songs = curatedSongs;
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
// Parties — NPC-hosted open parties near you (§2.3)
// ---------------------------------------------------------------------------

export interface PartyView {
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

async function toPartyView(party: Party, lat: number, lng: number): Promise<PartyView | null> {
    const venue = await getVenueById(party.venueId);
    const slot = await getSlotById(party.slotId);
    const hostMember = party.members.find(member => member.role === "host");
    const host = hostMember ? await getUserById(hostMember.userId) : null;
    if (!venue || !slot || !host) {
        return null;
    }
    const room = venue.rooms.find(room => room.id === party.roomId);
    return {
        id: party.id,
        title: party.title,
        genre: party.genre,
        venue: {
            id: venue.id,
            name: venue.name,
            distanceKm: Math.round(haversineKm(lat, lng, venue.lat, venue.lng) * 10) / 10
        },
        roomName: room ? room.name : "",
        start: slot.start,
        end: slot.end,
        host: toPublicUser(host),
        membersCount: party.members.length,
        capacity: party.capacity,
        spotsOpen: party.capacity - party.members.length,
        share: shareFor(party),
        status: party.status
    };
}

// A party is over once its slot's end time has passed. Nothing schedules that
// transition — it happens lazily, the first time anyone reads the party, so it
// survives restarts and needs no timer. ISO-8601 strings sort chronologically,
// so "end < now" is a plain $lt on the stored string.
//
// A party that was booked but never paid for is a different story: that night
// never happened, so it is cancelled instead of ended and the room goes back
// to the venue.
export async function closeFinishedParties() {
    // Only parties that are still open can need closing, and every sweep shrinks
    // that set — so this never walks the whole history.
    const open = await partiesCollection.find({ status: { $in: ["upcoming", "pending_payment"] } }).toArray();
    if (open.length === 0) {
        return;
    }
    const now = new Date().toISOString();
    const finished = await slotsCollection.find({
        id: { $in: open.map(party => party.slotId) },
        end: { $lt: now }
    }).toArray();
    if (finished.length === 0) {
        return;
    }

    const slotIds = finished.map(slot => slot.id);
    const ended = open.filter(party => party.status === "upcoming" && slotIds.includes(party.slotId));
    await partiesCollection.updateMany(
        { slotId: { $in: slotIds }, status: "upcoming" },
        { $set: { status: "ended" } }
    );
    for (const party of ended) {
        await ensureReviewNotifications(party);
    }

    const abandoned = open.filter(party => party.status === "pending_payment" && slotIds.includes(party.slotId));
    if (abandoned.length > 0) {
        await partiesCollection.updateMany(
            { id: { $in: abandoned.map(party => party.id) } },
            { $set: { status: "cancelled" } }
        );
        await slotsCollection.updateMany(
            { id: { $in: abandoned.map(party => party.slotId) } },
            { $set: { status: "available" } }
        );
    }
}

// Same rule as closeFinishedParties, for a single party: cheaper than sweeping
// everything on reads that only touch one room.
async function closeIfFinished(party: Party): Promise<Party> {
    if (party.status !== "upcoming" && party.status !== "pending_payment") {
        return party;
    }
    const slot = await getSlotById(party.slotId);
    if (!slot || slot.end >= new Date().toISOString()) {
        return party;
    }
    if (party.status === "upcoming") {
        await partiesCollection.updateOne({ id: party.id }, { $set: { status: "ended" } });
        await ensureReviewNotifications(party);
        return { ...party, status: "ended" };
    }
    await partiesCollection.updateOne({ id: party.id }, { $set: { status: "cancelled" } });
    await slotsCollection.updateOne({ id: party.slotId }, { $set: { status: "available" } });
    return { ...party, status: "cancelled" };
}

export async function getPartyById(id: string): Promise<Party | null> {
    const party = await partiesCollection.findOne({ id: id });
    if (!party) {
        return null;
    }
    return await closeIfFinished(party);
}

async function findJoinableParties(user: User, lat: number, lng: number, distanceKm: number, from: Date, to: Date) {
    // Never offer a night that is already over.
    await closeFinishedParties();
    const candidates = await partiesCollection.find({ openToPublic: true, status: "upcoming" }).toArray();
    const joinable: { party: Party; view: PartyView }[] = [];
    for (const party of candidates) {
        if (party.members.some(member => member.userId === user.id)) {
            continue;
        }
        if (party.members.length >= party.capacity) {
            continue;
        }
        const view = await toPartyView(party, lat, lng);
        if (!view || view.venue.distanceKm > distanceKm) {
            continue;
        }
        const start = new Date(view.start);
        if (start < from || start > to) {
            continue;
        }
        joinable.push({ party: party, view: view });
    }
    return joinable;
}

async function generateNpcParty(user: User, venues: VenueNearby[], from: Date, to: Date): Promise<Party | null> {
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
    const members: PartyMember[] = [{ userId: host.id, role: "host", paid: true }];
    const extraMembers = randomInt(1, Math.max(1, chosen.room.seats - 2));
    for (let i = 0; i < extraMembers; i++) {
        const npc = await createNpcUser(venue.lat, venue.lng, genre);
        members.push({ userId: npc.id, role: "member", paid: true });
    }

    const party: Party = {
        id: newId("b"),
        title: randomPartyTitle(genre),
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
    await partiesCollection.insertOne(party);
    await slotsCollection.updateOne({ id: slot.id }, { $set: { status: "booked" } });

    // Now and then the NPC host also invites the real user — feeds notifications.
    if (!user.isNpc && Math.random() < 0.25) {
        await createInvite(party, host, user);
    }
    return party;
}

export async function ensureOpenPartiesNear(user: User, lat: number, lng: number, distanceKm: number, from: Date, to: Date): Promise<PartyView[]> {
    let joinable = await findJoinableParties(user, lat, lng, distanceKm, from, to);
    if (joinable.length < 3) {
        const venues = await ensureVenuesNear(lat, lng, distanceKm);
        const missing = 3 - joinable.length;
        for (let i = 0; i < missing; i++) {
            await generateNpcParty(user, venues, from, to);
        }
        joinable = await findJoinableParties(user, lat, lng, distanceKm, from, to);
    }
    return joinable
        .map(entry => entry.view)
        .sort((a, b) => a.start.localeCompare(b.start));
}

// ---------------------------------------------------------------------------
// Notifications — invites, with a guaranteed first invite (§2.3)
// ---------------------------------------------------------------------------

export async function createInvite(party: Party, fromUser: User, toUser: User) {
    const notification: Notification = {
        id: newId("n"),
        kind: "invite",
        toUserId: toUser.id,
        fromUserId: fromUser.id,
        partyId: party.id,
        status: "pending"
    };
    await notificationsCollection.insertOne(notification);
    // Re-read the party so inviting several users in a row doesn't lose names.
    const current = await getPartyById(party.id);
    if (current && !current.invitedUsernames.includes(toUser.username)) {
        await partiesCollection.updateOne(
            { id: party.id },
            { $set: { invitedUsernames: [...current.invitedUsernames, toUser.username] } }
        );
    }
    return notification;
}

// Once a night is over, everyone who was there is asked how the venue was.
// Called on every transition into "ended", so it has to be idempotent: real
// singers who already reviewed, and NPCs who never will, are skipped.
export async function ensureReviewNotifications(party: Party) {
    const existing = await notificationsCollection.find({ partyId: party.id, kind: "review" }).toArray();
    const asked = existing.map(notification => notification.toUserId);
    const notifications: Notification[] = [];
    for (const member of party.members) {
        if (asked.includes(member.userId)) {
            continue;
        }
        const user = await getUserById(member.userId);
        if (!user || user.isNpc) {
            continue;
        }
        if (await hasReviewedVenue(user, party.id)) {
            continue;
        }
        notifications.push({
            id: newId("n"),
            kind: "review",
            toUserId: member.userId,
            // Nobody sent this one — it is the app asking.
            fromUserId: 0,
            partyId: party.id,
            status: "pending"
        });
    }
    if (notifications.length > 0) {
        await notificationsCollection.insertMany(notifications);
    }
}

export async function ensureNotificationsFor(user: User) {
    // The very first call guarantees at least one pending invite, so the
    // notification flow is always demoable.
    const everReceived = await notificationsCollection.find({ toUserId: user.id }).toArray();
    if (everReceived.length === 0 && user.location) {
        const from = new Date();
        const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const parties = await ensureOpenPartiesNear(user, user.location.lat, user.location.lng, 3, from, to);
        if (parties.length > 0) {
            const party = await getPartyById(pick(parties).id);
            if (party) {
                const hostMember = party.members.find(member => member.role === "host");
                const host = hostMember ? await getUserById(hostMember.userId) : null;
                if (host) {
                    await createInvite(party, host, user);
                }
            }
        }
    }

    const pending = await notificationsCollection.find({ toUserId: user.id, status: "pending" }).toArray();
    const result = [];
    for (const notification of pending) {
        const party = await getPartyById(notification.partyId);
        if (!party) {
            continue;
        }
        const venue = await getVenueById(party.venueId);
        const slot = await getSlotById(party.slotId);

        // A review is only worth asking for while the night is genuinely over
        // and the venue is still on the map.
        if (notification.kind === "review") {
            if (party.status !== "ended" || !venue) {
                continue;
            }
            result.push({
                id: notification.id,
                kind: "review",
                status: notification.status,
                venue: { id: venue.id, name: venue.name, imageUrl: venue.imageUrl },
                party: {
                    id: party.id,
                    title: party.title,
                    genre: party.genre,
                    venueName: venue.name,
                    start: slot ? slot.start : ""
                }
            });
            continue;
        }

        const sender = await getUserById(notification.fromUserId);
        if (!sender) {
            continue;
        }
        // Expired invites: the party already ended or was cancelled, or its slot
        // has started. Accepting these fails anyway, so don't list them.
        if (party.status === "ended" || party.status === "cancelled") {
            continue;
        }
        if (slot && new Date(slot.start) <= new Date()) {
            continue;
        }
        result.push({
            id: notification.id,
            kind: "invite",
            status: notification.status,
            from: toPublicUser(sender),
            party: {
                id: party.id,
                title: party.title,
                genre: party.genre,
                venueName: venue ? venue.name : "",
                start: slot ? slot.start : "",
                share: shareFor(party)
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
    const parties = await ensureOpenPartiesNear(user, lat, lng, distanceKm, from, to);
    const matches = [];
    for (const view of parties) {
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
// the app pays the same per-seat price they would in a wide-open party.
export function shareFor(party: Party) {
    return splitPrice(party.totalPrice, party.seats);
}

// The genre a user sings most, from their favourite songs. Used as the genre
// of parties they host; new users without favourites default to "Pop".
// Arrangement/audience tags (NON_TASTE_GENRES) are skipped so a party is always
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

// Host books a room slot: the party starts pending_payment; the slot is only
// marked booked once the host pays. openSpots is how many seats the host offers
// to other singers — fewer than the room holds leaves seats for people the host
// brings along outside the app. `title` is required and already validated by the
// router — only generated parties fall back to randomPartyTitle.
export async function createParty(host: User, venue: Venue, room: Room, slot: Slot, title: string, openSpots: number): Promise<Party> {
    const genre = await dominantGenreFor(host);
    const party: Party = {
        id: newId("b"),
        title: title,
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
    await partiesCollection.insertOne(party);
    return party;
}

export async function addPartyMember(party: Party, user: User) {
    const members: PartyMember[] = [...party.members, { userId: user.id, role: "member", paid: false }];
    await partiesCollection.updateOne({ id: party.id }, { $set: { members: members } });
    return { ...party, members: members };
}

// Simulated payment. Host paying confirms the booking (party upcoming, slot
// booked); a joiner paying just becomes a paid member.
export async function payForParty(party: Party, user: User): Promise<Party> {
    const member = party.members.find(member => member.userId === user.id);
    const members = party.members.map(m => m.userId === user.id ? { ...m, paid: true } : m);
    if (member && member.role === "host" && party.status === "pending_payment") {
        await partiesCollection.updateOne({ id: party.id }, { $set: { members: members, status: "upcoming" } });
        await slotsCollection.updateOne({ id: party.slotId }, { $set: { status: "booked" } });
        return { ...party, members: members, status: "upcoming" };
    }
    await partiesCollection.updateOne({ id: party.id }, { $set: { members: members } });
    return { ...party, members: members };
}

export async function getNotificationById(id: string): Promise<Notification | null> {
    return await notificationsCollection.findOne({ id: id });
}

export async function setNotificationStatus(id: string, status: "accepted" | "declined") {
    await notificationsCollection.updateOne({ id: id }, { $set: { status: status } });
}

// ---------------------------------------------------------------------------
// Party room, crew & ratings (§6)
// ---------------------------------------------------------------------------

// The full room view for a member: venue/room/start, members with their
// host/paid tags, invited usernames and spots left.
export async function getPartyRoom(party: Party, viewer: User) {
    const venue = await getVenueById(party.venueId);
    const slot = await getSlotById(party.slotId);
    const room = venue ? venue.rooms.find(room => room.id === party.roomId) : undefined;
    const matchPctFor = await matchScorerFor(viewer);
    const members = [];
    for (const member of party.members) {
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
        id: party.id,
        title: party.title,
        genre: party.genre,
        status: party.status,
        openToPublic: party.openToPublic,
        venue: venue ? { id: venue.id, name: venue.name, lat: venue.lat, lng: venue.lng } : null,
        roomName: room ? room.name : "",
        start: slot ? slot.start : "",
        end: slot ? slot.end : "",
        seats: party.seats,
        capacity: party.capacity,
        totalPrice: party.totalPrice,
        share: shareFor(party),
        spotsLeft: party.capacity - party.members.length,
        members: members,
        invitedUsernames: party.invitedUsernames,
        // Lets an ended room show "rate your crew" or "already rated" without
        // a second round trip.
        rated: await hasRatedParty(viewer, party.id),
        venueReviewed: await hasReviewedVenue(viewer, party.id)
    };
}

export async function setPartyOpenToPublic(party: Party, openToPublic: boolean) {
    await partiesCollection.updateOne({ id: party.id }, { $set: { openToPublic: openToPublic } });
}

// Fellow members of an ended party — the people you can rate.
export async function getCrew(party: Party, user: User) {
    const matchPctFor = await matchScorerFor(user);
    const crew = [];
    for (const member of party.members) {
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

export async function hasRatedParty(user: User, partyId: string) {
    const ratings = await ratingsCollection.find({ partyId: partyId, fromUserId: user.id }).toArray();
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

export async function createRatings(party: Party, fromUser: User, entries: { toUserId: number; stars: number; text: string }[]) {
    const ratings: Rating[] = entries.map(entry => ({
        id: newId("rt"),
        partyId: party.id,
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
// Chat — polled messages per party; NPC members reply now and then
// ---------------------------------------------------------------------------

export async function getMessagesForParty(partyId: string) {
    const messages: Message[] = await messagesCollection.find({ partyId: partyId }).toArray();
    messages.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const result = [];
    for (const message of messages) {
        const sender = await getUserById(message.userId);
        result.push({
            id: message.id,
            partyId: message.partyId,
            userId: message.userId,
            from: sender ? toPublicUser(sender) : null,
            text: message.text,
            sentAt: message.sentAt
        });
    }
    return result;
}

export async function createMessage(party: Party, userId: number, text: string): Promise<Message> {
    const message: Message = {
        id: newId("m"),
        partyId: party.id,
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
export async function maybeNpcReply(party: Party, afterUserId: number) {
    if (Math.random() >= 0.6) {
        return null;
    }
    const otherIds = party.members
        .filter(member => member.userId !== afterUserId)
        .map(member => member.userId);
    const others = await usersCollection.find({ id: { $in: otherIds } }).toArray();
    const npcs = others.filter(other => other.isNpc);
    if (npcs.length === 0) {
        return null;
    }
    return await createMessage(party, pick(npcs).id, randomNpcReply());
}

// ---------------------------------------------------------------------------
// Mine — upcoming + past, with a backfilled past party (§2.5)
// ---------------------------------------------------------------------------

// Demo affordance: the first time a user looks at their history and has none,
// one ended, unrated party from last week materializes so the rating flow is
// testable without waiting for a real booking to pass.
async function createPastParty(user: User): Promise<Party | null> {
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
    const members: PartyMember[] = [
        { userId: host.id, role: "host", paid: true },
        { userId: user.id, role: "member", paid: true }
    ];
    const crewSize = randomInt(2, 3);
    for (let i = 0; i < crewSize; i++) {
        const npc = await createNpcUser(venue.lat, venue.lng, genre);
        members.push({ userId: npc.id, role: "member", paid: true });
    }

    const party: Party = {
        id: newId("b"),
        title: randomPartyTitle(genre),
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
    await partiesCollection.insertOne(party);
    // It ended the moment it was invented, so the review ask comes with it.
    await ensureReviewNotifications(party);
    return party;
}

export async function getMyParties(user: User) {
    // Sweep first, so a night that just finished lands under "past" here.
    await closeFinishedParties();
    const all: Party[] = await partiesCollection.find({}).toArray();
    const mine = all.filter(party => party.members.some(member => member.userId === user.id));
    if (!mine.some(party => party.status === "ended")) {
        const past = await createPastParty(user);
        if (past) {
            mine.push(past);
        }
    }

    const lat = user.location ? user.location.lat : 0;
    const lng = user.location ? user.location.lng : 0;
    const upcoming = [];
    const past = [];
    for (const party of mine) {
        // A cancelled party never happened — it belongs in neither list.
        if (party.status === "cancelled") {
            continue;
        }
        const view = await toPartyView(party, lat, lng);
        if (!view) {
            continue;
        }
        if (party.status === "ended") {
            const myRatings = await ratingsCollection.find({ partyId: party.id, fromUserId: user.id }).toArray();
            past.push({
                ...view,
                rated: myRatings.length > 0,
                venueReviewed: await hasReviewedVenue(user, party.id)
            });
        } else {
            upcoming.push(view);
        }
    }
    upcoming.sort((a, b) => a.start.localeCompare(b.start));
    past.sort((a, b) => b.start.localeCompare(a.start));
    return { upcoming: upcoming, past: past };
}

// ---------------------------------------------------------------------------
// Seed — the song catalog. Everything else (venues, slots, NPCs, parties) is
// generated on demand by the sparse-generation layer.
// ---------------------------------------------------------------------------

// The full karafun catalog, pre-parsed by tools/importCatalog.ts. 84k songs is
// far too many to insert in one call, so it goes in batches.
const SONG_INSERT_BATCH = 5000;

async function seedSongs() {
    const raw = fs.readFileSync(path.join(__dirname, "data", "songs.json"), "utf-8");
    const songs: Omit<Song, "_id">[] = JSON.parse(raw);
    for (let index = 0; index < songs.length; index += SONG_INSERT_BATCH) {
        await songsCollection.insertMany(songs.slice(index, index + SONG_INSERT_BATCH));
    }
    console.log("[seed] " + songs.length + " songs");
}

// ---------------------------------------------------------------------------
// Seeded world — the lazy generators (§2.1–2.3) are run once up front around
// the demo location, so a fresh database is never empty on first launch.
// ---------------------------------------------------------------------------

// Antwerp, 51.231° N 4.418° E.
const SEED_LAT = 51.231;
const SEED_LNG = 4.418;
const SEED_RADIUS_KM = 3;
const SEED_DAYS_AHEAD = 7;
const SEED_PARTY_COUNT = 8;

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
    // NPC hosts, members and their open parties (some of which invite the user).
    for (let i = 0; i < SEED_PARTY_COUNT; i++) {
        await generateNpcParty(user, venues, from, to);
    }
    console.log("[seed] " + venues.length + " venues around " + SEED_LAT + ", " + SEED_LNG);
}

// Indexes the catalog needs to stay quick at 84k documents: `curated` for the
// pool read at startup, `id` for favourite lookups, and title/artist for the
// search in getSongs.
async function ensureSongIndexes() {
    await songsCollection.createIndex({ id: 1 });
    await songsCollection.createIndex({ curated: 1 });
    await songsCollection.createIndex({ title: 1 });
    await songsCollection.createIndex({ artist: 1 });
}

async function seed() {
    if (await songsCollection.countDocuments() === 0) {
        await seedSongs();
    }
    await ensureSongIndexes();
    // Not ensureCuratedPool(): resetDatabase() wipes the songs and reseeds, so
    // any pool cached before that point is stale and has to be rebuilt.
    curatedPoolPromise = loadCuratedPool();
    await curatedPoolPromise;
    console.log("[songs] " + curatedSongs.length + " curated of " + await songsCollection.countDocuments());
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
            favoriteSongIds: sampleFavoriteSongIds(curatedSongs, pick(NPC_GENRES)),
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
    await partiesCollection.deleteMany({});
    await messagesCollection.deleteMany({});
    await notificationsCollection.deleteMany({});
    await ratingsCollection.deleteMany({});
    await venueReviewsCollection.deleteMany({});
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
