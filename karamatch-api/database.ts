import { Collection, MongoClient } from "mongodb";
import crypto from "crypto";
import dotenv from "dotenv";
import { User, Song, Venue, Box, Notification } from "./types";
dotenv.config();

export const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
const db = client.db("karamatch");

export const usersCollection: Collection<User> = db.collection<User>("users");
export const songsCollection: Collection<Song> = db.collection<Song>("songs");
export const venuesCollection: Collection<Venue> = db.collection<Venue>("venues");
export const boxesCollection: Collection<Box> = db.collection<Box>("boxes");
export const notificationsCollection: Collection<Notification> = db.collection<Notification>("notifications");

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
        return await songsCollection.find({}).toArray();
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
// Venues / boxes / notifications — sparse generation not implemented yet.
// These return dummy placeholder data shaped like the real types so routers
// and clients can be built against the final response shape. Replace with
// the "ensure venues/slots/boxes near you" generators described in the
// project proposal.
// ---------------------------------------------------------------------------

export async function getVenuesNear(lat: number, lng: number, distanceKm: number): Promise<Venue[]> {
    // TODO: sparse cell-based generation (see API-PROPOSAL.md §2.1)
    return [];
}

export async function getVenueById(id: string): Promise<Venue | null> {
    // TODO: read from venuesCollection once generation is implemented
    return null;
}

export async function getOpenBoxesNear(lat: number, lng: number, distanceKm: number): Promise<Box[]> {
    // TODO: sparse NPC/box generation (see API-PROPOSAL.md §2.3)
    return [];
}

export async function getNotificationsForUser(userId: number): Promise<Notification[]> {
    // TODO: guarantee >= 1 pending invite on first call (see API-PROPOSAL.md §2.3)
    return await notificationsCollection.find({ toUserId: userId, status: "pending" }).toArray();
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
    await boxesCollection.deleteMany({});
    await notificationsCollection.deleteMany({});
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
