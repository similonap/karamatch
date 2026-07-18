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
    const inGenre = songs.filter(song => song.genre.includes(genre));
    const others = songs.filter(song => !song.genre.includes(genre));
    const count = randomInt(4, 7);
    const bleed = randomInt(1, 2);
    const picks = [...pickMany(inGenre, count - bleed), ...pickMany(others, bleed)];
    return picks.map(song => song.id);
}

// ---------------------------------------------------------------------------
// Boxes — genre-flavoured titles
// ---------------------------------------------------------------------------

// Karafun style tags that describe an arrangement, an audience or a context
// rather than a musical taste. They stay in Song.genre (and so still count
// towards matchmaking), but a box is never themed on one: "Duet Night" reads
// as nonsense next to "Metal Mayhem". See dominantGenreFor in database.ts.
export const NON_TASTE_GENRES = ["Duet", "Kids", "Traditional", "Spiritual Music"];

// Keys are real karafun catalog style tags (see Song.genre). Every tag a box
// can actually be themed on — i.e. every tag except NON_TASTE_GENRES — has an
// entry here, so randomBoxTitle only falls back to the generic title if the
// catalog ever grows a new tag.
const BOX_TITLES: { [genre: string]: string[] } = {
    "Rock": ["Rock Legends Only", "Arena Rock Night", "Riffs & Anthems"],
    "Pop": ["Pop Anthems Night", "Chart Toppers Party", "Pure Pop Energy"],
    "Country": ["Country Roads Night", "Boots & Ballads", "Nashville Vibes"],
    "Hip-Hop": ["Party Starters", "Hip-Hop Night", "Mic Drop Session"],
    "R&B": ["R&B Slow Jams", "Smooth Voices Club", "Late Night R&B"],
    "Soul": ["Soul Session", "Motown Night", "Soulful Sundays"],
    "Metal": ["Headbangers Night", "Metal Mayhem", "Riffs of Fury"],
    "Jazz": ["Smooth Jazz Lounge", "Jazz Standards Night", "Late Night Jazz Club"],
    "Latin Music": ["Latin Fiesta Night", "Salsa & Sing", "Ritmo Latino Party"],
    "Disco": ["Disco Fever Night", "Studio Karaoke", "Boogie Nights"],
    "Funk": ["Funk & Groove Night", "Get Down Session", "Funky Town Karaoke"],
    "Alternative": ["Alt Rock Night", "Indie Anthems", "Underground Sing-Along"],
    "Musical": ["Showtunes Spectacular", "Broadway Night", "Musical Theatre Mashup"],
    "Reggae": ["Island Vibes Night", "Reggae Rhythms", "One Love Session"],
    "Dance": ["Dance Floor Anthems", "EDM Karaoke Night", "Move & Sing Party"],
    "Schlager": ["Schlager Party Night", "Euro Hits Session", "Party Anthems"],
    "Love": ["Ballads & Feels", "Big Notes Only", "Love Songs Night"],
    "Soundtrack": ["Movie Night Karaoke", "Silver Screen Singalong", "Cinema Anthems"],
    "French pop": ["Chanson Night", "Fête à la Française", "French Hits Session"],
    "Teen pop": ["Throwback Teen Hits", "Boyband & Girlband Night", "Bubblegum Pop Party"],
    "Soft rock": ["Yacht Rock Night", "Easy Listening Session", "Smooth Classics"],
    "Hard Rock": ["Hard Rock Night", "Stadium Screamers", "Guitar Heroes"],
    "Punk/Grunge": ["Punk Night", "Grunge Revival", "Three Chords & the Truth"],
    "Rock 'n Roll": ["Rock 'n Roll Revival", "Jukebox Classics", "Fifties Diner Night"],
    "Blues": ["Blues Bar Night", "Twelve Bar Session", "Midnight Blues"],
    "Synthpop": ["Synthpop Night", "Neon 80s Party", "Retro Wave Session"],
    "Electro": ["Electro Night", "Club Bangers Session", "Bass & Vocals"],
    "Rap": ["Rap Cypher Night", "Bars & Beats", "Freestyle Session"],
    "Folk": ["Folk & Acoustic Night", "Campfire Session", "Storytellers Circle"],
    "World/Folk": ["World Music Night", "Global Voices Session", "Around the World"],
    "Christmas": ["Christmas Karaoke Night", "Festive Singalong", "Holiday Hits Party"],
    "Humor": ["Novelty Night", "Guilty Pleasures", "Cheesy Classics"],
    "Gospel": ["Gospel Night", "Choir Session", "Raise Your Voice"],
    "Classical": ["Classical Crossover Night", "Operatic Voices", "Grand Standards"],
    "Ska": ["Ska Night", "Two Tone Session", "Offbeat Party"],
    "Zouk/Creole/Soca/Calypso": ["Caribbean Carnival Night", "Soca & Calypso Party", "Tropical Vibes"],
    "Moyen Orient": ["Middle Eastern Night", "Oriental Voices", "Levant Session"]
};

// Genres NPC hosts are generated for. Deliberately a hand-picked subset of
// BOX_TITLES: broad, well-populated tags, so a generated crowd clusters into
// meaningful taste groups instead of scattering across tags the catalog only
// has a handful of songs for.
export const NPC_GENRES = [
    "Rock", "Pop", "Country", "Hip-Hop", "R&B", "Soul", "Metal", "Jazz",
    "Latin Music", "Disco", "Funk", "Alternative", "Musical", "Reggae",
    "Dance", "Schlager"
];

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
