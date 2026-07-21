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

// A venue name is built from four independent slots:
//   [prefix] adjective subject type
// e.g. "Downtown Velvet Encore Lounge", "Neon Note Karaoke".
// 12 x 52 x 44 x 40 = 1.098.240 distinct names (> 2^20).

const VENUE_PREFIXES = [
    "", "The", "Casa", "Le", "Little", "Grand",
    "Royal", "Big", "Super", "Old", "New", "Downtown"
];

const VENUE_ADJECTIVES = [
    "Neon", "Echo", "Velvet", "Golden", "Midnight", "Electric",
    "Crystal", "Lucky", "Retro", "Cosmic", "Silver", "Sakura",
    "Amber", "Ruby", "Jade", "Copper", "Marble", "Glitter",
    "Sunset", "Sunrise", "Moonlit", "Starlit", "Twilight", "Aurora",
    "Thunder", "Wildfire", "Frozen", "Tropic", "Monsoon", "Paper",
    "Ivory", "Obsidian", "Chrome", "Platinum", "Vinyl", "Sapphire",
    "Emerald", "Scarlet", "Indigo", "Crimson", "Lunar", "Solar",
    "Nomad", "Secret", "Hidden", "Wild", "Bright", "Smokey",
    "Dusty", "Rusty", "Bamboo", "Lantern"
];

const VENUE_SUBJECTS = [
    "Note", "Mic", "Verse", "Chorus", "Melody", "Tempo",
    "Rhythm", "Encore", "Anthem", "Ballad", "Harmony", "Falsetto",
    "Vibrato", "Reverb", "Treble", "Bass", "Octave", "Cadence",
    "Refrain", "Serenade", "Duet", "Solo", "Riff", "Groove",
    "Chord", "Tune", "Lyric", "Showtime", "Songbird", "Nightingale",
    "Diva", "Crooner", "Maestro", "Chanson", "Fever", "Applause",
    "Spotlight", "Curtain", "Stage", "Marquee", "Jukebox", "Playlist",
    "Setlist", "Soundwave"
];

const VENUE_TYPES = [
    "Karaoke", "Karaoke Bar", "Karaoke Club", "Lounge", "Club", "Bar",
    "Rooms", "Room Club", "Studio", "Studios", "Box", "Box Club",
    "Hall", "Palace", "Parlour", "Salon", "House", "Cabin",
    "Den", "Loft", "Cellar", "Basement", "Garage", "Arcade",
    "Café", "Bistro", "Tavern", "Pub", "Social Club", "Sing Rooms",
    "Song Rooms", "Voice Studio", "Sound Box", "Sing Hall", "Stage Rooms", "Melody Bar",
    "Booths", "Suites", "Sessions", "Nightclub"
];

// A room name is built the same way, with a suite number as the fourth slot:
//   qualifier noun type number
// e.g. "Velvet Encore Booth 12".
// 50 x 46 x 20 x 30 = 1.380.000 distinct names (> 2^20).

const ROOM_QUALIFIERS = [
    "Aurora", "Amber", "Velvet", "Crimson", "Coral", "Indigo",
    "Ivory", "Jade", "Lilac", "Mint", "Neon", "Onyx",
    "Opal", "Pearl", "Rose", "Ruby", "Saffron", "Sapphire",
    "Scarlet", "Silver", "Teal", "Topaz", "Violet", "Cobalt",
    "Copper", "Golden", "Midnight", "Sunset", "Moonlight", "Starlight",
    "Cloud", "Cherry", "Peach", "Papaya", "Lemon", "Lotus",
    "Bamboo", "Cedar", "Willow", "Maple", "Ember", "Frost",
    "Storm", "Comet", "Nova", "Orbit", "Prism", "Mirage",
    "Lantern", "Marble"
];

const ROOM_NOUNS = [
    "Chorus", "Diva", "Encore", "Falsetto", "Groove", "Harmony",
    "Bass", "Treble", "Tempo", "Rhythm", "Melody", "Cadence",
    "Refrain", "Verse", "Bridge", "Anthem", "Ballad", "Serenade",
    "Duet", "Solo", "Riff", "Chord", "Octave", "Vibrato",
    "Reverb", "Echo", "Crescendo", "Finale", "Overture", "Interlude",
    "Sonnet", "Lyric", "Note", "Tune", "Jam", "Mic",
    "Spotlight", "Curtain", "Applause", "Ovation", "Songbird", "Nightingale",
    "Crooner", "Maestro", "Jukebox", "Playback"
];

const ROOM_TYPES = [
    "Room", "Booth", "Suite", "Studio", "Cabin", "Box",
    "Lounge", "Den", "Nook", "Chamber", "Loft", "Cove",
    "Hall", "Corner", "Pod", "Stage", "Salon", "Parlour",
    "Cabana", "Alcove"
];

const ROOM_NUMBER_MAX = 30;

export function randomVenueName() {
    const prefix = pick(VENUE_PREFIXES);
    const name = pick(VENUE_ADJECTIVES) + " " + pick(VENUE_SUBJECTS) + " " + pick(VENUE_TYPES);
    if (prefix === "") {
        return name;
    } else {
        return prefix + " " + name;
    }
}

export function randomRoomName() {
    return pick(ROOM_QUALIFIERS) + " " + pick(ROOM_NOUNS) + " " + pick(ROOM_TYPES) + " " + randomInt(1, ROOM_NUMBER_MAX);
}

// Matches the images seeded in public/venues (1.png .. 41.png).
const VENUE_IMAGE_COUNT = 41;

function randomVenueImageUrl() {
    return "/venues/" + randomInt(1, VENUE_IMAGE_COUNT) + ".png";
}

// Matches the images seeded in public/avatars (1.png .. 20.png).
const PROFILE_IMAGE_COUNT = 20;

function randomProfileImageUrl() {
    return "/avatars/" + randomInt(1, PROFILE_IMAGE_COUNT) + ".png";
}

export function randomVenue(lat: number, lng: number): Venue {
    const roomCount = randomInt(2, 4);
    const rooms: Room[] = [];
    const usedNames: string[] = [];
    while (rooms.length < roomCount) {
        const name = randomRoomName();
        if (!usedNames.includes(name)) {
            usedNames.push(name);
            const seats = randomInt(4, 12);
            rooms.push({
                id: newId("r"),
                name: name,
                seats: seats,
                pricePerHour: Math.max(20, seats * 5 + randomInt(-4, 4))
            });
        }
    }
    return {
        id: newId("v"),
        name: randomVenueName(),
        lat: lat,
        lng: lng,
        openUntil: pick(["01:00", "02:00", "03:00"]),
        rooms: rooms,
        imageUrl: randomVenueImageUrl()
    };
}

// ---------------------------------------------------------------------------
// Venue reviews — the made-up history a new venue arrives with
// ---------------------------------------------------------------------------

// Skewed high: a karaoke bar that stays open has mostly happy nights, and this
// keeps generated venues in the same 3.5–5 band the app was designed around.
const SEED_STAR_WEIGHTS = [2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5];

export function randomVenueStars() {
    return pick(SEED_STAR_WEIGHTS);
}

// One pool per star tier, so the words and the stars never contradict.
const REVIEW_LINES: { [stars: number]: string[] } = {
    1: [
        "Two mics, one of them dead. Never again.",
        "Booked a room, got a broom closet with a screen.",
        "The song list stopped somewhere around 2004."
    ],
    2: [
        "Sound was muddy and the tablet kept freezing.",
        "Fine if you only came for the drinks, not the singing.",
        "Cramped room, and they rushed us out on the hour."
    ],
    3: [
        "Does the job. Nothing here you would write home about.",
        "Decent catalogue, tired speakers.",
        "Good night out, but the room could use a clean."
    ],
    4: [
        "Great sound and the staff actually cared. Bit pricey.",
        "Solid rooms, huge song list, we stayed way too long.",
        "Really good — only knocking one off for the queue at the bar.",
        "Comfy booth, sharp screens, no complaints worth listing."
    ],
    5: [
        "Best room in town. The reverb makes everyone sound good.",
        "Immaculate sound, endless catalogue, we closed the place.",
        "Staff swapped our mic within a minute. Proper service.",
        "We booked again before we even left. That good."
    ]
};

export function randomVenueReviewText(stars: number) {
    return pick(REVIEW_LINES[stars]);
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
    return { name: first + " " + last, username: username, bio: pick(NPC_BIOS), photoUrl: randomProfileImageUrl() };
}

// Mostly one genre with a little bleed-over, so the Match tab shows a natural
// spread of percentages against any real user's taste.
// Matched on the song's *primary* tag, not any tag it carries. A tag like "Pop"
// is on a third of the catalog, so matching on `includes` would spread a
// singer's picks over hundreds of candidates and two Pop fans would almost
// never land on the same song — which is the whole signal the Match tab runs
// on. The primary tag keeps the pool at CURATED_PER_GENRE (see
// tools/importCatalog.ts), where sharing a favourite stays likely. The `bleed`
// below is what keeps taste from being perfectly on-genre.
export function sampleFavoriteSongIds(songs: Song[], genre: string): string[] {
    const inGenre = songs.filter(song => song.genre[0] === genre);
    const others = songs.filter(song => song.genre[0] !== genre);
    const count = randomInt(4, 7);
    const bleed = randomInt(1, 2);
    const picks = [...pickMany(inGenre, count - bleed), ...pickMany(others, bleed)];
    return picks.map(song => song.id);
}

// ---------------------------------------------------------------------------
// Parties — genre-flavoured titles
// ---------------------------------------------------------------------------

// Karafun style tags that describe an arrangement, an audience or a context
// rather than a musical taste. They stay in Song.genre (and so still count
// towards matchmaking), but a party is never themed on one: "Duet Night" reads
// as nonsense next to "Metal Mayhem". See dominantGenreFor in database.ts.
export const NON_TASTE_GENRES = ["Duet", "Kids", "Traditional", "Spiritual Music"];

// Keys are real karafun catalog style tags (see Song.genre). Every tag a party
// can actually be themed on — i.e. every tag except NON_TASTE_GENRES — has an
// entry here, so randomPartyTitle only falls back to the generic title if the
// catalog ever grows a new tag.
const PARTY_TITLES: { [genre: string]: string[] } = {
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
// PARTY_TITLES: broad, well-populated tags, so a generated crowd clusters into
// meaningful taste groups instead of scattering across tags the catalog only
// has a handful of songs for.
export const NPC_GENRES = [
    "Rock", "Pop", "Country", "Hip-Hop", "R&B", "Soul", "Metal", "Jazz",
    "Latin Music", "Disco", "Funk", "Alternative", "Musical", "Reggae",
    "Dance", "Schlager"
];

export function randomPartyTitle(genre: string) {
    const titles = PARTY_TITLES[genre];
    return titles ? pick(titles) : "Karaoke Night";
}

// ---------------------------------------------------------------------------
// Chat — canned NPC replies, so the party chat feels alive
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
