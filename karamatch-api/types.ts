import { ObjectId } from "mongodb";

export interface UserLocation {
    lat: number;
    lng: number;
    label: string;
}

export interface User {
    _id?: ObjectId;
    id: number;
    name: string;
    username: string;
    email: string;
    password: string;
    token: string | null;
    bio: string;
    photoUrl: string | null;
    location: UserLocation | null;
    favoriteSongIds: string[];
    singerRating: number;
    eventsCount: number;
    friendIds: number[];
    isNpc: boolean;
}

export interface Song {
    _id?: ObjectId;
    id: string;
    title: string;
    artist: string;
    genre: string[];
}

export interface Room {
    id: string;
    name: string;
    seats: number;
    pricePerHour: number;
}

// No rating field: a venue's rating is the average of its reviews, computed on
// read (see toVenueView) so posting a review moves it straight away.
export interface Venue {
    _id?: ObjectId;
    id: string;
    name: string;
    lat: number;
    lng: number;
    openUntil: string;
    rooms: Room[];
    imageUrl: string;
}

export interface Cell {
    _id?: ObjectId;
    id: string;
    generatedAt: string;
}

export interface Slot {
    _id?: ObjectId;
    id: string;
    venueId: string;
    roomId: string;
    start: string;
    end: string;
    status: "available" | "booked";
}

export interface PartyMember {
    userId: number;
    role: "host" | "member";
    paid: boolean;
}

export interface Party {
    _id?: ObjectId;
    id: string;
    title: string;
    genre: string;
    venueId: string;
    roomId: string;
    slotId: string;
    // Seats in the room itself. The price is always split over these, so
    // joiners pay the normal per-seat price no matter how many spots the host
    // opened up.
    seats: number;
    // Spots this party offers through the app, host included. Lower than seats
    // when the host keeps room for guests they bring themselves.
    capacity: number;
    totalPrice: number;
    openToPublic: boolean;
    // "cancelled" = the slot passed while the party was still unpaid.
    status: "pending_payment" | "upcoming" | "ended" | "cancelled";
    members: PartyMember[];
    invitedUsernames: string[];
}

export interface Message {
    _id?: ObjectId;
    id: string;
    partyId: string;
    userId: number;
    text: string;
    sentAt: string;
}

// Two kinds share one collection: an "invite" comes from another singer and is
// accepted or declined, a "review" is the app asking how the venue was once the
// night is over. A review notification has no sender, so fromUserId is 0.
export interface Notification {
    _id?: ObjectId;
    id: string;
    kind: "invite" | "review";
    toUserId: number;
    fromUserId: number;
    partyId: string;
    status: "pending" | "accepted" | "declined";
}

export interface Rating {
    _id?: ObjectId;
    id: string;
    partyId: string;
    fromUserId: number;
    toUserId: number;
    stars: number;
    text: string;
}

// A review of a venue, written after a night there. partyId is null for the
// made-up reviews a freshly generated venue is seeded with — those have no
// party behind them.
export interface VenueReview {
    _id?: ObjectId;
    id: string;
    venueId: string;
    partyId: string | null;
    userId: number;
    stars: number;
    text: string;
    createdAt: string;
}

// Shape returned to clients — never leaks password/token.
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

// A singer inside a list, carrying taste compatibility with whoever asked for
// the list. matchPct is null for the viewer themself.
export interface MatchedUser extends PublicUser {
    matchPct: number | null;
}

export function toPublicUser(user: User): PublicUser {
    return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        photoUrl: user.photoUrl,
        location: user.location,
        favoriteSongIds: user.favoriteSongIds,
        singerRating: user.singerRating,
        eventsCount: user.eventsCount
    };
}
