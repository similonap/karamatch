// Small, realistic fixtures for each domain type in src/types.ts, reused by
// every domain/*.stories.tsx so the shelf's showcase doesn't depend on a
// running karamatch-api.
import type {
    ChatMessage,
    InviteNotification,
    MatchedUser,
    MatchView,
    PartyView,
    PastPartyView,
    PublicUser,
    ReviewNotification,
    Song,
    UserProfile,
    VenueNearby,
    VenueReview
} from "../types";

export const MOCK_USER: PublicUser = {
    id: 1,
    name: "Mara Voss",
    username: "maravoss",
    email: "mara@example.com",
    bio: "Alto, loves 2000s pop-punk and karaoke ballads.",
    photoUrl: null,
    location: { lat: 52.37, lng: 4.9, label: "Amsterdam" },
    favoriteSongIds: ["1", "2"],
    singerRating: 4.6,
    eventsCount: 12
};

export const MOCK_HOST: PublicUser = {
    id: 2,
    name: "Theo Lindqvist",
    username: "theolindqvist",
    email: "theo@example.com",
    bio: "Tenor. Will always pick Take On Me.",
    photoUrl: null,
    location: { lat: 52.36, lng: 4.89, label: "Amsterdam" },
    favoriteSongIds: ["3"],
    singerRating: 4.8,
    eventsCount: 27
};

export const MOCK_MATCHED_USER: MatchedUser = { ...MOCK_HOST, matchPct: 78 };

export const MOCK_USER_PROFILE: UserProfile = {
    ...MOCK_MATCHED_USER,
    commonSongs: ["Mr. Brightside", "Since U Been Gone"],
    favoriteSongs: [
        { id: "3", title: "Take On Me", artist: "a-ha", genre: ["pop", "80s"] },
        { id: "4", title: "Mr. Brightside", artist: "The Killers", genre: ["rock", "2000s"] }
    ],
    genreProfile: { pop: 0.4, rock: 0.35, "2000s": 0.25 },
    isFriend: true,
    isSelf: false
};

export const MOCK_SONGS: Song[] = [
    { id: "1", title: "Since U Been Gone", artist: "Kelly Clarkson", genre: ["pop", "2000s"] },
    {
        id: "2",
        title: "Total Eclipse of the Heart",
        artist: "Bonnie Tyler",
        genre: ["rock", "80s"],
        coverArt: "https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd/829521842-250.jpg"
    },
    { id: "3", title: "Take On Me", artist: "a-ha", genre: ["pop", "80s"] }
];

export const MOCK_VENUE: VenueNearby = {
    id: "v1",
    name: "Neon Nights Karaoke",
    lat: 52.37,
    lng: 4.9,
    rating: 4.7,
    reviewsCount: 132,
    openUntil: "02:00",
    distanceKm: 0.8,
    fromPrice: 12,
    imageUrl: "",
    rooms: [
        {
            id: "r1",
            name: "The Neon Room",
            seats: 6,
            pricePerHour: 60,
            pricePerSeat: 12,
            spotOptions: [
                { spots: 1, share: 12, hostPays: 48 },
                { spots: 2, share: 12, hostPays: 36 }
            ]
        }
    ]
};

export const MOCK_OPEN_PARTY: PartyView = {
    id: "p1",
    title: "Friday night session",
    genre: "pop",
    venue: { id: "v1", name: "Neon Nights Karaoke", distanceKm: 0.8 },
    roomName: "The Neon Room",
    start: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    end: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    host: MOCK_HOST,
    membersCount: 3,
    capacity: 6,
    spotsOpen: 3,
    share: 12,
    status: "upcoming"
};

export const MOCK_MATCH_PARTY: MatchView = {
    ...MOCK_OPEN_PARTY,
    id: "p2",
    matchPct: 82,
    commonSongs: ["Mr. Brightside", "Since U Been Gone"]
};

export const MOCK_PAST_PARTY: PastPartyView = {
    ...MOCK_OPEN_PARTY,
    id: "p3",
    status: "ended",
    start: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    end: new Date(Date.now() - 3 * 86400 * 1000 + 7200 * 1000).toISOString(),
    rated: false,
    venueReviewed: true
};

export const MOCK_VENUE_REVIEW: VenueReview = {
    id: "vr1",
    stars: 5,
    text: "Great sound system and the staff brought round after round of drinks without us asking twice.",
    createdAt: new Date(Date.now() - 12 * 86400 * 1000).toISOString(),
    from: MOCK_HOST
};

export const MOCK_CHAT_MESSAGE: ChatMessage = {
    id: "m1",
    partyId: "p1",
    userId: 2,
    from: MOCK_HOST,
    text: "See everyone at 9? I'll grab the room key at the front desk.",
    sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
};

export const MOCK_INVITE_NOTIFICATION: InviteNotification = {
    id: "n1",
    kind: "invite",
    status: "pending",
    from: MOCK_HOST,
    party: {
        id: "p1",
        title: "Friday night session",
        genre: "pop",
        venueName: "Neon Nights Karaoke",
        start: MOCK_OPEN_PARTY.start,
        share: 12
    }
};

export const MOCK_REVIEW_NOTIFICATION: ReviewNotification = {
    id: "n2",
    kind: "review",
    status: "pending",
    venue: { id: "v1", name: "Neon Nights Karaoke", imageUrl: "" },
    party: {
        id: "p3",
        title: "Friday night session",
        genre: "pop",
        venueName: "Neon Nights Karaoke",
        start: MOCK_PAST_PARTY.start
    }
};
