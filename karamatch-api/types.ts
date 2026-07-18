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

export interface Venue {
    _id?: ObjectId;
    id: string;
    name: string;
    lat: number;
    lng: number;
    rating: number;
    openUntil: string;
    rooms: Room[];
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

export interface BoxMember {
    userId: number;
    role: "host" | "member";
    paid: boolean;
}

export interface Box {
    _id?: ObjectId;
    id: string;
    title: string;
    genre: string;
    venueId: string;
    roomId: string;
    slotId: string;
    capacity: number;
    totalPrice: number;
    openToPublic: boolean;
    status: "pending_payment" | "upcoming" | "ended";
    members: BoxMember[];
    invitedUsernames: string[];
}

export interface Message {
    _id?: ObjectId;
    id: string;
    boxId: string;
    userId: number;
    text: string;
    sentAt: string;
}

export interface Notification {
    _id?: ObjectId;
    id: string;
    toUserId: number;
    fromUserId: number;
    boxId: string;
    status: "pending" | "accepted" | "declined";
}

export interface Rating {
    _id?: ObjectId;
    id: string;
    boxId: string;
    fromUserId: number;
    toUserId: number;
    stars: number;
    text: string;
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
