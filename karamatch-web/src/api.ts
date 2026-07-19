// Typed client for the KaraMatch API. Shapes mirror the DTOs that
// karamatch-api/database.ts actually returns, not just the proposal.

const BASE = "/api";

let token: string | null = localStorage.getItem("km_token");

export function setToken(next: string | null) {
    token = next;
    if (next) {
        localStorage.setItem("km_token", next);
    } else {
        localStorage.removeItem("km_token");
    }
}

export function getToken() {
    return token;
}

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }

    const response = await fetch(BASE + path, { ...options, headers });

    if (response.status === 204) {
        return undefined as T;
    }

    const raw = await response.text();
    let body: unknown = null;
    if (raw) {
        try {
            body = JSON.parse(raw);
        } catch {
            body = raw;
        }
    }

    if (!response.ok) {
        const message =
            body && typeof body === "object" && "error" in body
                ? String((body as { error: unknown }).error)
                : "Request failed (" + response.status + ")";
        throw new ApiError(response.status, message);
    }
    return body as T;
}

function query(params: Record<string, string | number | undefined>) {
    const parts = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
    return parts.length ? "?" + parts.join("&") : "";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    rating: number;
    openUntil: string;
    rooms: Room[];
    imageUrl: string;
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

export interface BoxView {
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

export interface MatchView extends BoxView {
    matchPct: number;
    commonSongs: string[];
}

export interface PastBoxView extends BoxView {
    rated: boolean;
}

export interface BoxRoomMember extends MatchedUser {
    role: "host" | "member";
    paid: boolean;
}

export interface BoxRoom {
    id: string;
    title: string;
    genre: string;
    status: string;
    openToPublic: boolean;
    venue: { id: string; name: string; lat: number; lng: number } | null;
    roomName: string;
    start: string;
    end: string;
    // Seats in the room; capacity is how many of them this box offers.
    seats: number;
    capacity: number;
    totalPrice: number;
    share: number;
    spotsLeft: number;
    members: BoxRoomMember[];
    invitedUsernames: string[];
    // Only meaningful once status is "ended".
    rated: boolean;
}

export interface ChatMessage {
    id: string;
    boxId: string;
    userId: number;
    from: PublicUser | null;
    text: string;
    sentAt: string;
}

export interface NotificationView {
    id: string;
    status: string;
    from: PublicUser;
    box: {
        id: string;
        title: string;
        genre: string;
        venueName: string;
        start: string;
        share: number;
    };
}

export interface CrewMember extends MatchedUser {
    role: "host" | "member";
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const api = {
    // Auth & profile
    register(body: { name: string; username: string; email: string; password: string }) {
        return request<{ user: PublicUser; token: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    login(login: string, password: string) {
        return request<{ user: PublicUser; token: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ login, password })
        });
    },
    forgot(email: string) {
        return request<{ message: string }>("/auth/forgot", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    },
    me() {
        return request<Me>("/me");
    },
    updateMe(body: { name?: string; bio?: string; favoriteSongIds?: string[] }) {
        return request<PublicUser>("/me", { method: "PUT", body: JSON.stringify(body) });
    },
    setLocation(lat: number, lng: number, label: string) {
        return request<PublicUser>("/me/location", {
            method: "PUT",
            body: JSON.stringify({ lat, lng, label })
        });
    },
    uploadPhoto(file: File) {
        const form = new FormData();
        form.append("photo", file);
        return request<{ photoUrl: string }>("/me/photo", { method: "POST", body: form });
    },

    // Songs
    songs(q?: string) {
        return request<Song[]>("/songs" + query({ q }));
    },
    genres() {
        return request<{ genre: string; count: number }[]>("/genres");
    },

    // Venues & slots
    venues(distance = 3) {
        return request<VenueNearby[]>("/venues" + query({ distance }));
    },
    venue(id: string) {
        return request<Venue>("/venues/" + id);
    },
    slots(id: string, from?: string, to?: string) {
        return request<RoomSlots[]>("/venues/" + id + "/slots" + query({ from, to }));
    },

    // Boxes
    bookBox(body: { venueId: string; roomId: string; slotId: string; title?: string; spots?: number }) {
        return request<{ id: string; totalPrice: number; capacity: number; share: number }>("/boxes", {
            method: "POST",
            body: JSON.stringify(body)
        });
    },
    joinBox(id: string) {
        return request<{ boxId: string; share: number }>("/boxes/" + id + "/join", { method: "POST" });
    },
    payBox(id: string) {
        return request<{ boxId: string; status: string; share: number }>("/boxes/" + id + "/pay", {
            method: "POST"
        });
    },
    openBoxes(distance = 3) {
        return request<BoxView[]>("/boxes/open" + query({ distance }));
    },
    matches(distance = 3, minOverlap = 0) {
        return request<MatchView[]>("/boxes/matches" + query({ distance, minOverlap }));
    },
    myBoxes() {
        return request<{ upcoming: BoxView[]; past: PastBoxView[] }>("/boxes/mine");
    },
    box(id: string) {
        return request<BoxRoom>("/boxes/" + id);
    },
    setOpenToPublic(id: string, openToPublic: boolean) {
        return request<{ id: string; openToPublic: boolean }>("/boxes/" + id, {
            method: "PATCH",
            body: JSON.stringify({ openToPublic })
        });
    },
    messages(id: string) {
        return request<ChatMessage[]>("/boxes/" + id + "/messages");
    },
    sendMessage(id: string, text: string) {
        return request<ChatMessage>("/boxes/" + id + "/messages", {
            method: "POST",
            body: JSON.stringify({ text })
        });
    },
    invite(id: string, usernames: string[]) {
        return request<{ invited: string[] }>("/boxes/" + id + "/invites", {
            method: "POST",
            body: JSON.stringify({ usernames })
        });
    },
    crew(id: string) {
        return request<CrewMember[]>("/boxes/" + id + "/crew");
    },
    rate(id: string, ratings: { username: string; stars: number; text: string }[]) {
        return request<{ message: string }>("/boxes/" + id + "/ratings", {
            method: "POST",
            body: JSON.stringify({ ratings })
        });
    },

    // Notifications
    notifications() {
        return request<NotificationView[]>("/notifications");
    },
    acceptInvite(id: string) {
        return request<{ boxId: string; share: number }>("/notifications/" + id + "/accept", {
            method: "POST"
        });
    },
    declineInvite(id: string) {
        return request<void>("/notifications/" + id + "/decline", { method: "POST" });
    },

    // Friends & people
    friends() {
        return request<MatchedUser[]>("/friends");
    },
    searchUsers(q: string) {
        return request<MatchedUser[]>("/users" + query({ q }));
    },
    user(username: string) {
        return request<UserProfile>("/users/" + encodeURIComponent(username));
    },
    addFriend(username: string) {
        return request<{ message: string; username: string }>("/friends", {
            method: "POST",
            body: JSON.stringify({ username })
        });
    },
    removeFriend(username: string) {
        return request<{ message: string; username: string }>("/friends/" + encodeURIComponent(username), {
            method: "DELETE"
        });
    }
};
