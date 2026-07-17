import crypto from "crypto";
import { Song, Venue, Room } from "./types";

// ---------------------------------------------------------------------------
// Pure random helpers + name/title pools for the sparse world generation
// (API-PROPOSAL.md §2). No database access in this file.
// ---------------------------------------------------------------------------

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(items: T[]): T {
    return items[randomInt(0, items.length - 1)];
}

export function pickMany<T>(items: T[], count: number): T[] {
    const copy = [...items];
    const result: T[] = [];
    while (result.length < count && copy.length > 0) {
        result.push(copy.splice(randomInt(0, copy.length - 1), 1)[0]);
    }
    return result;
}

export function newId(prefix: string) {
    return prefix + "_" + crypto.randomBytes(4).toString("hex");
}

// ---------------------------------------------------------------------------
// Venues — adjective × noun names in the style of the design
// ---------------------------------------------------------------------------

const VENUE_ADJECTIVES = [
    "Neon", "Echo", "Velvet", "Golden", "Midnight", "Electric",
    "Crystal", "Lucky", "Retro", "Cosmic", "Silver", "Sakura"
];

const VENUE_NOUNS = [
    "Note Karaoke", "Chamber", "Mic Box Club", "Verse Lounge", "Voice Studio",
    "Stage Rooms", "Melody Bar", "Sound Box", "Sing Hall", "Tune Rooms"
];

const ROOM_NAMES = [
    "Aurora Room", "Bass Room", "Chorus Room", "Diva Room",
    "Encore Room", "Falsetto Room", "Groove Room", "Harmony Room"
];

export function randomVenue(lat: number, lng: number): Venue {
    const roomCount = randomInt(2, 4);
    const rooms: Room[] = pickMany(ROOM_NAMES, roomCount).map((name) => {
        const seats = randomInt(4, 12);
        return {
            id: newId("r"),
            name: name,
            seats: seats,
            pricePerHour: Math.max(20, seats * 5 + randomInt(-4, 4))
        };
    });
    return {
        id: newId("v"),
        name: pick(VENUE_ADJECTIVES) + " " + pick(VENUE_NOUNS),
        lat: lat,
        lng: lng,
        rating: Math.round((4 + Math.random() * 0.9) * 10) / 10,
        openUntil: pick(["01:00", "02:00", "03:00"]),
        rooms: rooms
    };
}

// ---------------------------------------------------------------------------
// NPC singers — names/usernames in the style of the design (yuki_sings,
// marco.b, tom_falsetto, ...)
// ---------------------------------------------------------------------------

const NPC_FIRST_NAMES = [
    "Yuki", "Marco", "Tom", "Lena", "Sofia", "Jin", "Ava", "Noah",
    "Mila", "Kai", "Nina", "Omar", "Elif", "Hugo", "Sana", "Luca",
    "Emma", "Ravi", "Zoe", "Mateo"
];

const NPC_LAST_NAMES = [
    "Berger", "Tanaka", "Peeters", "Rossi", "Kim", "Janssens", "Novak",
    "Silva", "Dubois", "Martens", "Costa", "Yilmaz", "Nakamura", "Vermeulen"
];

const USERNAME_SUFFIXES = ["sings", "vocals", "falsetto", "onstage", "mic", "karaoke", "encore", "tunes"];

const NPC_BIOS = [
    "Always up for a duet!",
    "Warming up my voice as we speak.",
    "High notes are my cardio.",
    "I only know the choruses, and that's fine.",
    "Bring tissues for the ballads.",
    ""
];

export function randomNpcIdentity() {
    const first = pick(NPC_FIRST_NAMES);
    const last = pick(NPC_LAST_NAMES);
    const style = randomInt(1, 3);
    let username: string;
    if (style === 1) {
        username = first.toLowerCase() + "_" + pick(USERNAME_SUFFIXES);
    } else if (style === 2) {
        username = first.toLowerCase() + "." + last[0].toLowerCase();
    } else {
        username = first.toLowerCase() + last.toLowerCase();
    }
    return { name: first + " " + last, username: username, bio: pick(NPC_BIOS) };
}

// Mostly one genre with a little bleed-over, so the Match tab shows a natural
// spread of percentages against any real user's taste.
export function sampleFavoriteSongIds(songs: Song[], genre: string): string[] {
    const inGenre = songs.filter(song => song.genre === genre);
    const others = songs.filter(song => song.genre !== genre);
    const count = randomInt(4, 7);
    const bleed = randomInt(1, 2);
    const picks = [...pickMany(inGenre, count - bleed), ...pickMany(others, bleed)];
    return picks.map(song => song.id);
}

// ---------------------------------------------------------------------------
// Boxes — genre-flavoured titles
// ---------------------------------------------------------------------------

const BOX_TITLES: { [genre: string]: string[] } = {
    "rock": ["Rock Legends Only", "Arena Rock Night", "Riffs & Anthems"],
    "pop": ["Pop Anthems Night", "Chart Toppers Party", "Pure Pop Energy"],
    "power-ballad": ["Ballads & Feels", "80s Power Hour", "Big Notes Only"],
    "k-pop/j-pop": ["K-pop & J-pop Party", "Idol Night", "Seoul & Tokyo Hits"],
    "soul/rnb": ["Soul Session", "R&B Slow Jams", "Smooth Voices Club"],
    "hip-hop/party": ["Party Starters", "Hip-Hop Night", "Mic Drop Session"],
    "country": ["Country Roads Night", "Boots & Ballads", "Nashville Vibes"],
    "musical/disney": ["Showtunes Spectacular", "Disney Singalong", "Broadway Night"]
};

export const NPC_GENRES = Object.keys(BOX_TITLES);

export function randomBoxTitle(genre: string) {
    const titles = BOX_TITLES[genre];
    return titles ? pick(titles) : "Karaoke Night";
}

// ---------------------------------------------------------------------------
// Chat — canned NPC replies, so the box chat feels alive
// ---------------------------------------------------------------------------

const NPC_CHAT_REPLIES = [
    "Can't wait! 🎤",
    "I've been warming up all day.",
    "Dibs on the first song!",
    "Who's up for a duet with me?",
    "Bringing my A game tonight.",
    "Is it karaoke o'clock yet?",
    "Practicing the high notes as we speak.",
    "See you all there!",
    "Somebody please queue the classics.",
    "My neighbours already hate me from rehearsing."
];

export function randomNpcReply() {
    return pick(NPC_CHAT_REPLIES);
}
