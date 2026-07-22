// Local, self-contained copies of the client-facing response shapes from
// karamatch-web/src/api.ts — the DTOs each screen actually renders, not the
// raw DB models in karamatch-api/types.ts (a venue's `rating`, a party's
// `matchPct`, a notification's embedded `venue`/`party` summary are all
// server-derived and only exist on these shapes). Copied rather than
// imported so this folder has no cross-package project reference and stays
// portable into a student's own app.

export interface UserLocation {
    lat: number;
    lng: number;
    label: string;
}

export interface PublicUser {
    id: number;
    name: string;
    username: string;
    email: string;
    bio: string;
    photoUrl: string | null;
    location: UserLocation | null;
    favoriteSongIds: string[];
    singerRating: number;
    eventsCount: number;
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    genre: string[];
    // Cover Art Archive thumbnail. Absent for the ~17% of the catalog that
    // could not be resolved, so every render needs a fallback.
    coverArt?: string;
}

// A singer inside a list, carrying taste compatibility with the signed-in
// user. matchPct is null for yourself.
export interface MatchedUser extends PublicUser {
    matchPct: number | null;
}

export interface Me extends PublicUser {
    favoriteSongs: Song[];
    genreProfile: Record<string, number>;
}

// Another singer's profile page: their favourites plus how they line up with
// you. matchPct is null when the profile is your own.
export interface UserProfile extends MatchedUser {
    commonSongs: string[];
    favoriteSongs: Song[];
    genreProfile: Record<string, number>;
    isFriend: boolean;
    isSelf: boolean;
}

// One priced choice on a room: open `spots` to other singers, they each pay
// `share`, and the host is left carrying `hostPays` once those spots fill.
export interface SpotOption {
    spots: number;
    share: number;
    hostPays: number;
}

export interface Room {
    id: string;
    name: string;
    seats: number;
    pricePerHour: number;
    // What one seat costs — the server owns the split, clients only display it.
    pricePerSeat: number;
    // Every spots choice, priced by the server. Indexed by `spots`, ascending.
    spotOptions: SpotOption[];
}

export interface Venue {
    id: string;
    name: string;
    lat: number;
    lng: number;
    // Averaged from the venue's reviews on every read; 0 until it has any,
    // which reviewsCount is what tells you apart.
    rating: number;
    reviewsCount: number;
    openUntil: string;
    rooms: Room[];
    imageUrl: string;
}

export interface VenueReview {
    id: string;
    stars: number;
    text: string;
    createdAt: string;
    from: PublicUser | null;
}

// GET /venues adds the two derived fields; GET /venues/:id does not.
export interface VenueNearby extends Venue {
    distanceKm: number;
    fromPrice: number;
}

export interface RoomSlots {
    room: Room;
    slots: { id: string; start: string; end: string }[];
}

export interface PartyView {
    id: string;
    title: string;
    genre: string;
    venue: { id: string; name: string; distanceKm: number };
    roomName: string;
    start: string;
    end: string;
    host: PublicUser;
    membersCount: number;
    capacity: number;
    spotsOpen: number;
    share: number;
    status: string;
}

export interface MatchView extends PartyView {
    matchPct: number;
    commonSongs: string[];
}

export interface PastPartyView extends PartyView {
    rated: boolean;
    venueReviewed: boolean;
}

export interface PartyRoomMember extends MatchedUser {
    role: "host" | "member";
    paid: boolean;
}

export interface PartyRoom {
    id: string;
    title: string;
    genre: string;
    status: string;
    openToPublic: boolean;
    venue: { id: string; name: string; lat: number; lng: number } | null;
    roomName: string;
    start: string;
    end: string;
    // Seats in the room; capacity is how many of them this party offers.
    seats: number;
    capacity: number;
    totalPrice: number;
    share: number;
    spotsLeft: number;
    members: PartyRoomMember[];
    invitedUsernames: string[];
    // Only meaningful once status is "ended".
    rated: boolean;
    venueReviewed: boolean;
}

export interface ChatMessage {
    id: string;
    partyId: string;
    userId: number;
    from: PublicUser | null;
    text: string;
    sentAt: string;
}

// An invite from another singer: accept it and you pay your share.
export interface InviteNotification {
    id: string;
    kind: "invite";
    status: string;
    from: PublicUser;
    party: {
        id: string;
        title: string;
        genre: string;
        venueName: string;
        start: string;
        share: number;
    };
}

// The app asking how the venue was, once a night you were part of is over.
export interface ReviewNotification {
    id: string;
    kind: "review";
    status: string;
    venue: { id: string; name: string; imageUrl: string };
    party: {
        id: string;
        title: string;
        genre: string;
        venueName: string;
        start: string;
    };
}

export type NotificationView = InviteNotification | ReviewNotification;

export interface CrewMember extends MatchedUser {
    role: "host" | "member";
}
