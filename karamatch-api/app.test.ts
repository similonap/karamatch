import request from "supertest";
import app from "./app";
import { partiesCollection, client, slotsCollection } from "./database";

afterAll(async () => {
    await client.close();
});

// Registers a fresh user with a pin in Hasselt, so the world generates there.
async function registerWithLocation(prefix: string) {
    const response = await request(app).post("/api/auth/register").send({
        name: "Test Singer",
        username: prefix + Date.now(),
        email: prefix + Date.now() + "@karamatch.test",
        password: "secret123"
    });
    await request(app)
        .put("/api/me/location")
        .set("Authorization", "Bearer " + response.body.token)
        .send({ lat: 50.9307, lng: 5.3378, label: "Hasselt" });
    return response.body.token;
}

// Registers a fresh user with a fixed set of favourites and returns their
// username, so taste-based scoring is predictable.
async function registerWithFavourites(prefix: string, favoriteSongIds: string[]) {
    const response = await request(app).post("/api/auth/register").send({
        name: "Test Singer",
        username: prefix + Date.now(),
        email: prefix + Date.now() + "@karamatch.test",
        password: "secret123"
    });
    await request(app)
        .put("/api/me")
        .set("Authorization", "Bearer " + response.body.token)
        .send({ favoriteSongIds: favoriteSongIds });
    return response.body.user.username;
}

// A fresh singer plus the ended party the API backfills for them, and the venue
// that night was at. A singer may review a night only once, so every test that
// posts a review starts from its own singer.
async function singerWithEndedParty(prefix: string) {
    const token = await registerWithLocation(prefix);
    const mine = await request(app).get("/api/parties/mine").set("Authorization", "Bearer " + token);
    return { token: token, partyId: mine.body.past[0].id, venueId: mine.body.past[0].venue.id };
}

describe("GET /", () => {
    it("returns API info", async () => {
        const response = await request(app).get("/");
        expect(response.status).toBe(200);
        expect(response.body.name).toBe("KaraMatch API");
    });
});

describe("auth", () => {
    const credentials = {
        name: "Test User",
        username: "testuser_" + Date.now(),
        email: "test" + Date.now() + "@karamatch.test",
        password: "secret123"
    };

    it("registers a new user", async () => {
        const response = await request(app).post("/api/auth/register").send(credentials);
        expect(response.status).toBe(201);
        expect(response.body.user.username).toBe(credentials.username);
        expect(response.body.token).toBeTruthy();
    });

    it("rejects registering the same username twice", async () => {
        const response = await request(app).post("/api/auth/register").send(credentials);
        expect(response.status).toBe(400);
    });

    it("logs in with correct credentials", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ login: credentials.username, password: credentials.password });
        expect(response.status).toBe(200);
        expect(response.body.token).toBeTruthy();
    });

    it("rejects login with wrong password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ login: credentials.username, password: "wrong" });
        expect(response.status).toBe(401);
    });

    it("rejects protected routes without a token", async () => {
        const response = await request(app).get("/api/me");
        expect(response.status).toBe(401);
    });

    it("returns the current user with a valid token", async () => {
        const login = await request(app)
            .post("/api/auth/login")
            .send({ login: credentials.username, password: credentials.password });
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", "Bearer " + login.body.token);
        expect(response.status).toBe(200);
        expect(response.body.username).toBe(credentials.username);
    });
});

describe("party chat", () => {
    let token: string;
    let outsiderToken: string;
    let partyId: string;

    beforeAll(async () => {
        token = await registerWithLocation("chata");
        outsiderToken = await registerWithLocation("chatb");
        // /parties/mine backfills one past party the user is a member of — use it as the chat room
        const mine = await request(app)
            .get("/api/parties/mine")
            .set("Authorization", "Bearer " + token);
        partyId = mine.body.past[0].id;
    });

    it("starts with an empty message list for members", async () => {
        const response = await request(app)
            .get("/api/parties/" + partyId + "/messages")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it("posts a message and reads it back", async () => {
        const post = await request(app)
            .post("/api/parties/" + partyId + "/messages")
            .set("Authorization", "Bearer " + token)
            .send({ text: "That last chorus was legendary" });
        expect(post.status).toBe(201);
        expect(post.body.text).toBe("That last chorus was legendary");
        expect(post.body.from.username).toContain("chata");

        const list = await request(app)
            .get("/api/parties/" + partyId + "/messages")
            .set("Authorization", "Bearer " + token);
        expect(list.status).toBe(200);
        const mine = list.body.filter((message: any) => message.id === post.body.id);
        expect(mine.length).toBe(1);
    });

    it("rejects empty messages", async () => {
        const response = await request(app)
            .post("/api/parties/" + partyId + "/messages")
            .set("Authorization", "Bearer " + token)
            .send({ text: "   " });
        expect(response.status).toBe(400);
    });

    it("rejects non-members", async () => {
        const response = await request(app)
            .get("/api/parties/" + partyId + "/messages")
            .set("Authorization", "Bearer " + outsiderToken);
        expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown party", async () => {
        const response = await request(app)
            .get("/api/parties/b_nope/messages")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(404);
    });
});

describe("booking & payment", () => {
    let hostToken: string;
    let joinerToken: string;
    let venueId: string;
    let roomId: string;
    let slotId: string;
    let otherSlotId: string;
    let roomSeats: number;
    let partyId: string;

    beforeAll(async () => {
        hostToken = await registerWithLocation("bookh");
        joinerToken = await registerWithLocation("bookj");
        const venues = await request(app)
            .get("/api/venues?distance=2")
            .set("Authorization", "Bearer " + hostToken);
        venueId = venues.body[0].id;
        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + hostToken);
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 1);
        roomId = roomWithSlots.room.id;
        roomSeats = roomWithSlots.room.seats;
        slotId = roomWithSlots.slots[0].id;
        otherSlotId = roomWithSlots.slots[1].id;
    }, 20000);

    it("books a free slot as pending_payment, filling the room by default", async () => {
        const response = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId, title: "Test Night" });
        expect(response.status).toBe(201);
        expect(response.body.status).toBe("pending_payment");
        expect(response.body.title).toBe("Test Night");
        expect(response.body.share).toBeGreaterThan(0);
        expect(response.body.capacity).toBe(roomSeats);
        partyId = response.body.id;
    });

    it("lets the host open fewer spots than the room holds", async () => {
        const full = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, title: "Held Back Night", spots: 2 });
        expect(full.status).toBe(201);
        expect(full.body.capacity).toBe(3);
        expect(full.body.seats).toBe(roomSeats);
        // Holding seats back must not make the spot pricier for joiners: the
        // share stays the room's per-seat price, and the host carries the rest.
        expect(full.body.share).toBe(Math.round(full.body.totalPrice / roomSeats));
    });

    it("quotes the same per-seat price on the room as the party charges", async () => {
        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + hostToken);
        const room = slots.body.find((entry: any) => entry.room.id === roomId).room;
        expect(room.pricePerSeat).toBe(Math.round(room.pricePerHour / room.seats));

        const detail = await request(app)
            .get("/api/venues/" + venueId)
            .set("Authorization", "Bearer " + hostToken);
        const sameRoom = detail.body.rooms.find((entry: any) => entry.id === roomId);
        expect(sameRoom.pricePerSeat).toBe(room.pricePerSeat);

        // The booking screen shows room.pricePerSeat before the party exists; it
        // has to match the share the party hands out afterwards.
        const party = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + hostToken);
        expect(party.body.share).toBe(room.pricePerSeat);
    });

    it("prices every spots choice on the room up front", async () => {
        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + hostToken);
        const room = slots.body.find((entry: any) => entry.room.id === roomId).room;

        // One option per spot count the host may pick: 1 … seats - 1.
        expect(room.spotOptions.map((option: any) => option.spots))
            .toEqual(Array.from({ length: room.seats - 1 }, (_, index) => index + 1));
        for (const option of room.spotOptions) {
            // A joiner pays the same whatever the host opened; the host carries
            // whatever the opened spots do not cover.
            expect(option.share).toBe(room.pricePerSeat);
            expect(option.hostPays).toBe(room.pricePerHour - room.pricePerSeat * option.spots);
        }
    });

    it("rejects more spots than the room has seats for", async () => {
        const response = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, title: "Too Many Spots", spots: roomSeats });
        expect(response.status).toBe(400);
    });

    it("requires the host to name the party", async () => {
        const missing = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId });
        expect(missing.status).toBe(400);
        expect(missing.body.error).toBe("title is required");

        // Whitespace is not a name.
        const blank = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, title: "   " });
        expect(blank.status).toBe(400);
        expect(blank.body.error).toBe("title is required");
    });

    it("rejects a title longer than 60 characters", async () => {
        const response = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, title: "a".repeat(61) });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("title must be 60 characters or fewer");
    });

    it("trims the stored title", async () => {
        const response = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, title: "  Padded Night  " });
        expect(response.status).toBe(201);
        expect(response.body.title).toBe("Padded Night");
    });

    it("host payment confirms the party and books the slot", async () => {
        const response = await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + hostToken);
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("upcoming");

        const again = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + joinerToken)
            .send({ venueId, roomId, slotId, title: "Second Booking" });
        expect(again.status).toBe(400);
        expect(again.body.error).toBe("Slot already taken");
    });

    it("rejects joining your own party", async () => {
        const response = await request(app)
            .post("/api/parties/" + partyId + "/join")
            .set("Authorization", "Bearer " + hostToken);
        expect(response.status).toBe(400);
    });

    it("lets another user join and pay their share", async () => {
        const join = await request(app)
            .post("/api/parties/" + partyId + "/join")
            .set("Authorization", "Bearer " + joinerToken);
        expect(join.status).toBe(200);
        expect(join.body.partyId).toBe(partyId);
        expect(join.body.share).toBeGreaterThan(0);

        const doubleJoin = await request(app)
            .post("/api/parties/" + partyId + "/join")
            .set("Authorization", "Bearer " + joinerToken);
        expect(doubleJoin.status).toBe(400);

        const pay = await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + joinerToken);
        expect(pay.status).toBe(200);
        expect(pay.body.status).toBe("upcoming");
    });

    it("rejects paying for a party you are not in", async () => {
        const outsiderToken = await registerWithLocation("o");
        const response = await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + outsiderToken);
        expect(response.status).toBe(403);
    }, 20000);

    it("accepting an invite reserves a spot to pay for", async () => {
        // every fresh user is guaranteed at least one pending invite
        const notifications = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer " + joinerToken);
        expect(notifications.body.length).toBeGreaterThan(0);
        const invite = notifications.body[0];

        const accept = await request(app)
            .post("/api/notifications/" + invite.id + "/accept")
            .set("Authorization", "Bearer " + joinerToken);
        expect(accept.status).toBe(200);
        expect(accept.body.partyId).toBe(invite.party.id);

        const pay = await request(app)
            .post("/api/parties/" + accept.body.partyId + "/pay")
            .set("Authorization", "Bearer " + joinerToken);
        expect(pay.status).toBe(200);

        const acceptAgain = await request(app)
            .post("/api/notifications/" + invite.id + "/accept")
            .set("Authorization", "Bearer " + joinerToken);
        expect(acceptAgain.status).toBe(400);
    }, 20000);

    it("scores nearby parties by taste and sorts by matchPct", async () => {
        // Rock favourites from the seeded catalog → a real genre profile
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + joinerToken)
            .send({ favoriteSongIds: ["12617", "12543", "11335"] });

        const response = await request(app)
            .get("/api/parties/matches")
            .set("Authorization", "Bearer " + joinerToken);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        for (let i = 0; i < response.body.length; i++) {
            const match = response.body[i];
            expect(match.matchPct).toBeGreaterThanOrEqual(0);
            expect(match.matchPct).toBeLessThanOrEqual(100);
            expect(Array.isArray(match.commonSongs)).toBe(true);
            if (i > 0) {
                expect(response.body[i - 1].matchPct).toBeGreaterThanOrEqual(match.matchPct);
            }
        }
    }, 20000);

    it("filters matches below minOverlap", async () => {
        const response = await request(app)
            .get("/api/parties/matches?minOverlap=101")
            .set("Authorization", "Bearer " + joinerToken);
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
    }, 20000);

    it("declines an invite", async () => {
        const declinerToken = await registerWithLocation("d");
        const notifications = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer " + declinerToken);
        expect(notifications.body.length).toBeGreaterThan(0);
        const invite = notifications.body[0];

        const decline = await request(app)
            .post("/api/notifications/" + invite.id + "/decline")
            .set("Authorization", "Bearer " + declinerToken);
        expect(decline.status).toBe(204);

        const after = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer " + declinerToken);
        const stillThere = after.body.some((n: any) => n.id === invite.id);
        expect(stillThere).toBe(false);
    }, 20000);
});

describe("party room, host controls & invites", () => {
    let hostToken: string;
    let memberToken: string;
    let memberUsername: string;
    let partyId: string;

    beforeAll(async () => {
        hostToken = await registerWithLocation("roomh");
        memberToken = await registerWithLocation("roomm");
        const me = await request(app).get("/api/me").set("Authorization", "Bearer " + memberToken);
        memberUsername = me.body.username;

        const venues = await request(app)
            .get("/api/venues?distance=2")
            .set("Authorization", "Bearer " + hostToken);
        const venueId = venues.body[0].id;
        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + hostToken);
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);
        const booking = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId: roomWithSlots.room.id, slotId: roomWithSlots.slots[0].id, title: "Chat Night" });
        partyId = booking.body.id;
        await request(app).post("/api/parties/" + partyId + "/pay").set("Authorization", "Bearer " + hostToken);
    }, 20000);

    it("shows the room view to members only", async () => {
        const response = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + hostToken);
        expect(response.status).toBe(200);
        expect(response.body.venue.name).toBeTruthy();
        expect(response.body.roomName).toBeTruthy();
        expect(response.body.members[0].role).toBe("host");
        expect(response.body.members[0].paid).toBe(true);
        expect(response.body.spotsLeft).toBe(response.body.capacity - 1);

        const outsider = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + memberToken);
        expect(outsider.status).toBe(403);
    });

    it("lets only the host toggle openToPublic", async () => {
        const forbidden = await request(app)
            .patch("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + memberToken)
            .send({ openToPublic: false });
        expect(forbidden.status).toBe(403);

        const bad = await request(app)
            .patch("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + hostToken)
            .send({ openToPublic: "yes" });
        expect(bad.status).toBe(400);

        const ok = await request(app)
            .patch("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + hostToken)
            .send({ openToPublic: false });
        expect(ok.status).toBe(200);
        expect(ok.body.openToPublic).toBe(false);
    });

    it("host invites by @username and the invitee gets a notification", async () => {
        const invite = await request(app)
            .post("/api/parties/" + partyId + "/invites")
            .set("Authorization", "Bearer " + hostToken)
            .send({ target: "@" + memberUsername });
        expect(invite.status).toBe(201);
        expect(invite.body.invited).toContain(memberUsername);

        const notifications = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer " + memberToken);
        const fromParty = notifications.body.find((n: any) => n.party.id === partyId);
        expect(fromParty).toBeTruthy();

        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + hostToken);
        expect(room.body.invitedUsernames).toContain(memberUsername);
    }, 20000);

    it("rejects duplicate or unknown invites", async () => {
        const duplicate = await request(app)
            .post("/api/parties/" + partyId + "/invites")
            .set("Authorization", "Bearer " + hostToken)
            .send({ usernames: [memberUsername] });
        expect(duplicate.status).toBe(400);

        const unknown = await request(app)
            .post("/api/parties/" + partyId + "/invites")
            .set("Authorization", "Bearer " + hostToken)
            .send({ target: "@nobody_here_" + Date.now() });
        expect(unknown.status).toBe(400);
    });
});

describe("crew & ratings", () => {
    let token: string;
    let partyId: string;
    let crew: any[];

    beforeAll(async () => {
        token = await registerWithLocation("rate");
        const mine = await request(app).get("/api/parties/mine").set("Authorization", "Bearer " + token);
        partyId = mine.body.past[0].id;
    }, 20000);

    it("lists the crew of an ended party", async () => {
        const response = await request(app)
            .get("/api/parties/" + partyId + "/crew")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].username).toBeTruthy();
        expect(response.body.some((member: any) => member.role === "host")).toBe(true);
        crew = response.body;
    });

    it("rejects invalid stars", async () => {
        const response = await request(app)
            .post("/api/parties/" + partyId + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings: [{ username: crew[0].username, stars: 7, text: "" }] });
        expect(response.status).toBe(400);
    });

    it("stores ratings, recomputes singer ratings and flags the party rated", async () => {
        const ratings = crew.map((member: any) => ({
            username: member.username,
            stars: 5,
            text: "Great night!"
        }));
        const response = await request(app)
            .post("/api/parties/" + partyId + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings });
        expect(response.status).toBe(201);

        const search = await request(app)
            .get("/api/users?q=" + crew[0].username)
            .set("Authorization", "Bearer " + token);
        // Search matches on a substring, and NPC usernames repeat with a random
        // numeric suffix ("eva3" also matches "eva31"), so pick the singer we
        // actually rated instead of trusting the first hit.
        const rated = search.body.find((user: any) => user.username === crew[0].username);
        expect(rated.singerRating).toBe(5);

        const mine = await request(app).get("/api/parties/mine").set("Authorization", "Bearer " + token);
        const past = mine.body.past.find((party: any) => party.id === partyId);
        expect(past.rated).toBe(true);

        const again = await request(app)
            .post("/api/parties/" + partyId + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings });
        expect(again.status).toBe(400);
    }, 20000);

    it("refuses rating a party that has not ended", async () => {
        const open = await request(app)
            .get("/api/parties/open")
            .set("Authorization", "Bearer " + token);
        const join = await request(app)
            .post("/api/parties/" + open.body[0].id + "/join")
            .set("Authorization", "Bearer " + token);
        expect(join.status).toBe(200);
        const response = await request(app)
            .post("/api/parties/" + open.body[0].id + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings: [{ username: "whoever", stars: 5, text: "" }] });
        expect(response.status).toBe(400);
    }, 20000);
});

describe("venue reviews", () => {
    let token: string;
    let partyId: string;
    let venueId: string;

    beforeAll(async () => {
        const singer = await singerWithEndedParty("venuereview");
        token = singer.token;
        partyId = singer.partyId;
        venueId = singer.venueId;
    }, 20000);

    describe("a venue's rating and its reviews", () => {
        it("gives every generated venue a rating averaged from seeded reviews", async () => {
            const venue = await request(app).get("/api/venues/" + venueId).set("Authorization", "Bearer " + token);
            expect(venue.status).toBe(200);
            expect(venue.body.reviewsCount).toBeGreaterThan(0);
            expect(venue.body.rating).toBeGreaterThan(0);

            const reviews = await request(app)
                .get("/api/venues/" + venueId + "/reviews")
                .set("Authorization", "Bearer " + token);
            expect(reviews.status).toBe(200);
            expect(reviews.body.length).toBe(venue.body.reviewsCount);
            expect(reviews.body[0].from.username).toBeTruthy();

            const total = reviews.body.reduce((sum: number, review: any) => sum + review.stars, 0);
            expect(venue.body.rating).toBe(Math.round((total / reviews.body.length) * 10) / 10);
        }, 20000);

        it("lists reviews newest first, each with its author", async () => {
            const reviews = await request(app)
                .get("/api/venues/" + venueId + "/reviews")
                .set("Authorization", "Bearer " + token);
            expect(reviews.status).toBe(200);

            const dates = reviews.body.map((review: any) => review.createdAt);
            const newestFirst = [...dates].sort().reverse();
            expect(dates).toEqual(newestFirst);

            for (const review of reviews.body) {
                expect(typeof review.id).toBe("string");
                expect(Number.isInteger(review.stars)).toBe(true);
                expect(review.stars).toBeGreaterThanOrEqual(1);
                expect(review.stars).toBeLessThanOrEqual(5);
                expect(typeof review.text).toBe("string");
                expect(isNaN(new Date(review.createdAt).getTime())).toBe(false);
                expect(review.from.username).toBeTruthy();
                // The author is a PublicUser — credentials never travel with it.
                expect(review.from.password).toBeUndefined();
                expect(review.from.token).toBeUndefined();
            }
        }, 20000);

        it("shows the same rating in the venue list as on the venue itself", async () => {
            // The list averages every venue's reviews in one query, the detail
            // page averages one — they must not drift apart.
            const list = await request(app)
                .get("/api/venues?distance=3")
                .set("Authorization", "Bearer " + token);
            const listed = list.body.find((venue: any) => venue.id === venueId);
            expect(listed).toBeTruthy();

            const detail = await request(app).get("/api/venues/" + venueId).set("Authorization", "Bearer " + token);
            expect(listed.rating).toBe(detail.body.rating);
            expect(listed.reviewsCount).toBe(detail.body.reviewsCount);
        }, 20000);

        it("404s on the reviews of a venue that does not exist", async () => {
            const response = await request(app)
                .get("/api/venues/v-nope/reviews")
                .set("Authorization", "Bearer " + token);
            expect(response.status).toBe(404);
        });

        it("needs a token to read reviews", async () => {
            const response = await request(app).get("/api/venues/" + venueId + "/reviews");
            expect(response.status).toBe(401);
        });
    });

    describe("being asked for a review", () => {
        it("asks everyone who was there to review, once the party has ended", async () => {
            const notifications = await request(app).get("/api/notifications").set("Authorization", "Bearer " + token);
            const ask = notifications.body.find((entry: any) => entry.kind === "review" && entry.party.id === partyId);
            expect(ask).toBeTruthy();
            expect(ask.status).toBe("pending");
            expect(ask.venue.id).toBe(venueId);
            expect(ask.venue.name).toBeTruthy();
            expect(ask.party.venueName).toBe(ask.venue.name);
            // Nobody sent this one — it is the app asking, so there is no sender.
            expect(ask.from).toBeUndefined();
        }, 20000);

        it("lets a review notification be dismissed instead", async () => {
            const other = await singerWithEndedParty("venuedismiss");

            const notifications = await request(app)
                .get("/api/notifications")
                .set("Authorization", "Bearer " + other.token);
            const ask = notifications.body.find(
                (entry: any) => entry.kind === "review" && entry.party.id === other.partyId
            );
            expect(ask).toBeTruthy();

            // Accepting is for invites — a review is posted through the party.
            const accept = await request(app)
                .post("/api/notifications/" + ask.id + "/accept")
                .set("Authorization", "Bearer " + other.token);
            expect(accept.status).toBe(400);

            const dismiss = await request(app)
                .post("/api/notifications/" + ask.id + "/decline")
                .set("Authorization", "Bearer " + other.token);
            expect(dismiss.status).toBe(204);

            const after = await request(app)
                .get("/api/notifications")
                .set("Authorization", "Bearer " + other.token);
            expect(after.body.some((entry: any) => entry.id === ask.id)).toBe(false);
        }, 20000);

        it("keeps another singer's review ask out of your list", async () => {
            const other = await singerWithEndedParty("venuenosy");
            const notifications = await request(app).get("/api/notifications").set("Authorization", "Bearer " + token);
            expect(notifications.body.some((entry: any) => entry.party.id === other.partyId)).toBe(false);
        }, 20000);
    });

    describe("posting a review", () => {
        // Its own night, so the rejections below can never be the "you already
        // reviewed this night" 400 in disguise.
        let rejectToken: string;
        let rejectPartyId: string;

        beforeAll(async () => {
            const singer = await singerWithEndedParty("venuereject");
            rejectToken = singer.token;
            rejectPartyId = singer.partyId;
        }, 20000);

        it("rejects stars that are not a whole number between 1 and 5", async () => {
            const badStars = [0, 6, 9, -1, 4.5, "5", null, undefined];
            for (const stars of badStars) {
                const response = await request(app)
                    .post("/api/parties/" + rejectPartyId + "/venue-review")
                    .set("Authorization", "Bearer " + rejectToken)
                    .send({ stars: stars, text: "" });
                expect(response.status).toBe(400);
                expect(response.body.error).toContain("stars");
            }
        }, 20000);

        it("rejects a text longer than 280 characters", async () => {
            const response = await request(app)
                .post("/api/parties/" + rejectPartyId + "/venue-review")
                .set("Authorization", "Bearer " + rejectToken)
                .send({ stars: 4, text: "a".repeat(281) });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain("280");
        });

        it("refuses reviewing a venue for a party that has not ended", async () => {
            const open = await request(app)
                .get("/api/parties/open")
                .set("Authorization", "Bearer " + rejectToken);
            const join = await request(app)
                .post("/api/parties/" + open.body[0].id + "/join")
                .set("Authorization", "Bearer " + rejectToken);
            expect(join.status).toBe(200);

            const response = await request(app)
                .post("/api/parties/" + open.body[0].id + "/venue-review")
                .set("Authorization", "Bearer " + rejectToken)
                .send({ stars: 5, text: "" });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain("ended");
        }, 20000);

        it("refuses reviewing a night the singer was not part of", async () => {
            const response = await request(app)
                .post("/api/parties/" + partyId + "/venue-review")
                .set("Authorization", "Bearer " + rejectToken)
                .send({ stars: 5, text: "Was not even there." });
            expect(response.status).toBe(403);
        });

        it("404s for a party that does not exist", async () => {
            const response = await request(app)
                .post("/api/parties/b-nope/venue-review")
                .set("Authorization", "Bearer " + rejectToken)
                .send({ stars: 5, text: "" });
            expect(response.status).toBe(404);
        });

        it("needs a token", async () => {
            const response = await request(app)
                .post("/api/parties/" + rejectPartyId + "/venue-review")
                .send({ stars: 5, text: "" });
            expect(response.status).toBe(401);
        });

        it("stores the review, moves the venue rating and clears the notification", async () => {
            const before = await request(app).get("/api/venues/" + venueId).set("Authorization", "Bearer " + token);

            const response = await request(app)
                .post("/api/parties/" + partyId + "/venue-review")
                .set("Authorization", "Bearer " + token)
                .send({ stars: 5, text: "Sound was immaculate." });
            expect(response.status).toBe(201);
            expect(response.body.venueId).toBe(venueId);
            expect(response.body.stars).toBe(5);
            expect(response.body.text).toBe("Sound was immaculate.");
            expect(response.body.id).toBeTruthy();

            const after = await request(app).get("/api/venues/" + venueId).set("Authorization", "Bearer " + token);
            expect(after.body.reviewsCount).toBe(before.body.reviewsCount + 1);

            const total = before.body.rating * before.body.reviewsCount + 5;
            expect(after.body.rating).toBe(Math.round((total / after.body.reviewsCount) * 10) / 10);

            const room = await request(app).get("/api/parties/" + partyId).set("Authorization", "Bearer " + token);
            expect(room.body.venueReviewed).toBe(true);

            const mine = await request(app).get("/api/parties/mine").set("Authorization", "Bearer " + token);
            expect(mine.body.past.find((party: any) => party.id === partyId).venueReviewed).toBe(true);

            const notifications = await request(app).get("/api/notifications").set("Authorization", "Bearer " + token);
            expect(notifications.body.some((entry: any) => entry.kind === "review" && entry.party.id === partyId)).toBe(false);

            const again = await request(app)
                .post("/api/parties/" + partyId + "/venue-review")
                .set("Authorization", "Bearer " + token)
                .send({ stars: 4, text: "" });
            expect(again.status).toBe(400);
        }, 20000);

        it("puts the fresh review at the top of the venue's list, signed by its author", async () => {
            const singer = await singerWithEndedParty("venuetop");
            const me = await request(app).get("/api/me").set("Authorization", "Bearer " + singer.token);

            const posted = await request(app)
                .post("/api/parties/" + singer.partyId + "/venue-review")
                .set("Authorization", "Bearer " + singer.token)
                .send({ stars: 3, text: "Fine mics, warm room." });
            expect(posted.status).toBe(201);

            const reviews = await request(app)
                .get("/api/venues/" + singer.venueId + "/reviews")
                .set("Authorization", "Bearer " + singer.token);
            // Seeded reviews are all backdated, so the one just written is newest.
            expect(reviews.body[0].id).toBe(posted.body.id);
            expect(reviews.body[0].stars).toBe(3);
            expect(reviews.body[0].text).toBe("Fine mics, warm room.");
            expect(reviews.body[0].from.username).toBe(me.body.username);
        }, 20000);

        it("accepts a text of exactly 280 characters and trims the ends", async () => {
            const singer = await singerWithEndedParty("venuelong");
            const text = "a".repeat(280);

            const response = await request(app)
                .post("/api/parties/" + singer.partyId + "/venue-review")
                .set("Authorization", "Bearer " + singer.token)
                .send({ stars: 4, text: "  " + text + "  " });
            expect(response.status).toBe(201);
            expect(response.body.text).toBe(text);
        }, 20000);

        it("stores an empty text when none is given", async () => {
            const singer = await singerWithEndedParty("venuenotext");

            const response = await request(app)
                .post("/api/parties/" + singer.partyId + "/venue-review")
                .set("Authorization", "Bearer " + singer.token)
                .send({ stars: 2 });
            expect(response.status).toBe(201);
            expect(response.body.text).toBe("");

            const reviews = await request(app)
                .get("/api/venues/" + singer.venueId + "/reviews")
                .set("Authorization", "Bearer " + singer.token);
            expect(reviews.body[0].text).toBe("");
        }, 20000);
    });

    describe("one review per night", () => {
        // Books and pays a night at a venue. Still upcoming, so the host can
        // invite before it is over.
        async function bookNightAt(singerToken: string, at: string) {
            const slots = await request(app)
                .get("/api/venues/" + at + "/slots")
                .set("Authorization", "Bearer " + singerToken);
            const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);
            const booking = await request(app)
                .post("/api/parties")
                .set("Authorization", "Bearer " + singerToken)
                .send({
                    venueId: at,
                    roomId: roomWithSlots.room.id,
                    slotId: roomWithSlots.slots[0].id,
                    title: "Encore Night"
                });
            await request(app)
                .post("/api/parties/" + booking.body.id + "/pay")
                .set("Authorization", "Bearer " + singerToken);
            return booking.body.id;
        }

        // Drags the party's slot into the past, so the next read has to close
        // it — and asks everyone who was there for a review.
        async function finishNight(singerToken: string, nightId: string) {
            const party = await partiesCollection.findOne({ id: nightId });
            await slotsCollection.updateOne(
                { id: party!.slotId },
                {
                    $set: {
                        start: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                        end: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                    }
                }
            );
            const room = await request(app)
                .get("/api/parties/" + nightId)
                .set("Authorization", "Bearer " + singerToken);
            expect(room.body.status).toBe("ended");
        }

        async function endedNightAt(singerToken: string, at: string) {
            const nightId = await bookNightAt(singerToken, at);
            await finishNight(singerToken, nightId);
            return nightId;
        }

        it("takes a second review from the same singer for a different night", async () => {
            const singer = await singerWithEndedParty("venueregular");
            const first = await request(app)
                .post("/api/parties/" + singer.partyId + "/venue-review")
                .set("Authorization", "Bearer " + singer.token)
                .send({ stars: 5, text: "Best night out this year." });
            expect(first.status).toBe(201);

            const before = await request(app)
                .get("/api/venues/" + singer.venueId)
                .set("Authorization", "Bearer " + singer.token);

            // Same venue, another night — the one-per-night rule must not block it.
            const encoreId = await endedNightAt(singer.token, singer.venueId);
            const second = await request(app)
                .post("/api/parties/" + encoreId + "/venue-review")
                .set("Authorization", "Bearer " + singer.token)
                .send({ stars: 1, text: "Off night, broken mic." });
            expect(second.status).toBe(201);
            expect(second.body.venueId).toBe(singer.venueId);

            const after = await request(app)
                .get("/api/venues/" + singer.venueId)
                .set("Authorization", "Bearer " + singer.token);
            expect(after.body.reviewsCount).toBe(before.body.reviewsCount + 1);
            // Both reviews count towards the average, so 1 star pulls it down.
            expect(after.body.rating).toBeLessThan(before.body.rating);
        }, 30000);

        it("counts a review from every singer who was there, and clears only their own ask", async () => {
            const hostToken = await registerWithLocation("venuecrewh");
            const guestToken = await registerWithLocation("venuecrewg");
            const guest = await request(app).get("/api/me").set("Authorization", "Bearer " + guestToken);

            const venues = await request(app)
                .get("/api/venues?distance=2")
                .set("Authorization", "Bearer " + hostToken);
            const sharedVenueId = venues.body[0].id;
            const nightId = await bookNightAt(hostToken, sharedVenueId);

            // The guest has to be in the room before the night is over.
            const invite = await request(app)
                .post("/api/parties/" + nightId + "/invites")
                .set("Authorization", "Bearer " + hostToken)
                .send({ target: "@" + guest.body.username });
            expect(invite.status).toBe(201);
            const notifications = await request(app)
                .get("/api/notifications")
                .set("Authorization", "Bearer " + guestToken);
            const ask = notifications.body.find((entry: any) => entry.party.id === nightId);
            expect(ask).toBeTruthy();
            const accept = await request(app)
                .post("/api/notifications/" + ask.id + "/accept")
                .set("Authorization", "Bearer " + guestToken);
            expect(accept.status).toBe(200);

            await finishNight(hostToken, nightId);

            const before = await request(app)
                .get("/api/venues/" + sharedVenueId)
                .set("Authorization", "Bearer " + hostToken);

            const hostReview = await request(app)
                .post("/api/parties/" + nightId + "/venue-review")
                .set("Authorization", "Bearer " + hostToken)
                .send({ stars: 5, text: "Ran like clockwork." });
            expect(hostReview.status).toBe(201);

            // The host reviewing must not answer the ask sitting in the guest's list.
            const guestAsks = await request(app)
                .get("/api/notifications")
                .set("Authorization", "Bearer " + guestToken);
            const guestAsk = guestAsks.body.find(
                (entry: any) => entry.kind === "review" && entry.party.id === nightId
            );
            expect(guestAsk).toBeTruthy();

            const guestReview = await request(app)
                .post("/api/parties/" + nightId + "/venue-review")
                .set("Authorization", "Bearer " + guestToken)
                .send({ stars: 3, text: "Good, a bit loud." });
            expect(guestReview.status).toBe(201);

            const after = await request(app)
                .get("/api/venues/" + sharedVenueId)
                .set("Authorization", "Bearer " + hostToken);
            expect(after.body.reviewsCount).toBe(before.body.reviewsCount + 2);

            const total = before.body.rating * before.body.reviewsCount + 5 + 3;
            expect(after.body.rating).toBe(Math.round((total / after.body.reviewsCount) * 10) / 10);
        }, 30000);
    });
});

describe("songs & profile", () => {
    let token: string;

    beforeAll(async () => {
        token = await registerWithLocation("songs");
    }, 20000);

    it("returns a genre-interleaved discovery list", async () => {
        const response = await request(app)
            .get("/api/songs")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        const firstGenres = response.body.slice(0, 8).map((song: any) => song.genre[0]);
        expect(new Set(firstGenres).size).toBe(8);
    });

    it("expands favourite songs and genre profile on /me", async () => {
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + token)
            .send({ favoriteSongIds: ["12617", "12543", "11335"] });
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(response.body.favoriteSongs.length).toBe(3);
        expect(response.body.favoriteSongs[0].title).toBeTruthy();
        expect(response.body.genreProfile.Rock).toBe(3);
    });
});

describe("match score between two singers", () => {
    // Three tastes: two identical rock fans, one country fan, and one singer
    // whose favourites straddle both.
    const ROCK = ["12617", "12543", "11335"];
    const COUNTRY = ["90690", "13469", "6229"];
    const MIXED = ["12617", "90690", "13469"];

    let token: string;
    let rockA: string;
    let rockB: string;
    let country: string;
    let mixed: string;

    beforeAll(async () => {
        token = await registerWithLocation("matchcaller");
        rockA = await registerWithFavourites("matchrocka", ROCK);
        rockB = await registerWithFavourites("matchrockb", ROCK);
        country = await registerWithFavourites("matchcountry", COUNTRY);
        mixed = await registerWithFavourites("matchmixed", MIXED);
    }, 20000);

    function match(a: string, b: string) {
        return request(app)
            .get("/api/match")
            .query({ a: a, b: b })
            .set("Authorization", "Bearer " + token);
    }

    it("scores identical taste at 100% and lists the shared songs", async () => {
        const response = await match(rockA, rockB);
        expect(response.status).toBe(200);
        expect(response.body.matchPct).toBe(100);
        expect(response.body.commonSongs.length).toBe(3);
        expect(response.body.a.username).toBe(rockA);
        expect(response.body.b.username).toBe(rockB);
    });

    it("scores unrelated taste at 0% with no shared songs", async () => {
        const response = await match(rockA, country);
        expect(response.status).toBe(200);
        expect(response.body.matchPct).toBe(0);
        expect(response.body.commonSongs).toEqual([]);
    });

    it("ranks partial overlap between identical and unrelated", async () => {
        const partial = await match(rockA, mixed);
        expect(partial.status).toBe(200);
        expect(partial.body.matchPct).toBeGreaterThan(0);
        expect(partial.body.matchPct).toBeLessThan(100);
    });

    it("is symmetric in a and b", async () => {
        const forward = await match(rockA, mixed);
        const reversed = await match(mixed, rockA);
        expect(reversed.body.matchPct).toBe(forward.body.matchPct);
    });

    it("accepts usernames written with a leading @", async () => {
        const response = await match("@" + rockA, "@" + rockB);
        expect(response.status).toBe(200);
        expect(response.body.matchPct).toBe(100);
    });

    it("rejects a missing username", async () => {
        const response = await request(app)
            .get("/api/match")
            .query({ a: rockA })
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(400);
    });

    it("returns 404 for an unknown username", async () => {
        const response = await match(rockA, "definitely_not_a_singer");
        expect(response.status).toBe(404);
    });

    it("requires a token", async () => {
        const response = await request(app).get("/api/match").query({ a: rockA, b: rockB });
        expect(response.status).toBe(401);
    });
});

describe("match score on lists of singers", () => {
    const ROCK = ["12617", "12543", "11335"];
    const COUNTRY = ["90690", "13469", "6229"];

    let token: string;
    let twin: string;
    let opposite: string;

    // Registers a singer with fixed favourites, returning token and username
    // so the same account can both browse lists and appear in them.
    async function registerSinger(prefix: string, favoriteSongIds: string[]) {
        const response = await request(app).post("/api/auth/register").send({
            name: "Test Singer",
            username: prefix + Date.now(),
            email: prefix + Date.now() + "@karamatch.test",
            password: "secret123"
        });
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + response.body.token)
            .send({ favoriteSongIds: favoriteSongIds });
        return { token: response.body.token as string, username: response.body.user.username as string };
    }

    beforeAll(async () => {
        const viewer = await registerSinger("listviewer", ROCK);
        token = viewer.token;
        twin = (await registerSinger("listtwin", ROCK)).username;
        opposite = (await registerSinger("listopposite", COUNTRY)).username;
    }, 20000);

    function search(query: string) {
        return request(app)
            .get("/api/users")
            .query({ q: query })
            .set("Authorization", "Bearer " + token);
    }

    it("scores every singer in people search against the caller", async () => {
        const identical = await search(twin);
        expect(identical.status).toBe(200);
        expect(identical.body.length).toBe(1);
        expect(identical.body[0].matchPct).toBe(100);

        const unrelated = await search(opposite);
        expect(unrelated.body[0].matchPct).toBe(0);
    });

    it("agrees with the two-singer /api/match score", async () => {
        const viewer = await request(app).get("/api/me").set("Authorization", "Bearer " + token);
        const pair = await request(app)
            .get("/api/match")
            .query({ a: viewer.body.username, b: opposite })
            .set("Authorization", "Bearer " + token);
        const listed = await search(opposite);
        expect(listed.body[0].matchPct).toBe(pair.body.matchPct);
    });

    it("carries the score onto the friends list", async () => {
        await request(app)
            .post("/api/friends")
            .set("Authorization", "Bearer " + token)
            .send({ username: twin });

        const friends = await request(app).get("/api/friends").set("Authorization", "Bearer " + token);
        expect(friends.status).toBe(200);
        const listed = friends.body.find((friend: { username: string }) => friend.username === twin);
        expect(listed).toBeTruthy();
        expect(listed.matchPct).toBe(100);
    });

    it("drops a friend again on delete", async () => {
        await request(app)
            .post("/api/friends")
            .set("Authorization", "Bearer " + token)
            .send({ username: opposite });

        const removed = await request(app)
            .delete("/api/friends/" + opposite)
            .set("Authorization", "Bearer " + token);
        expect(removed.status).toBe(200);

        const friends = await request(app).get("/api/friends").set("Authorization", "Bearer " + token);
        const listed = friends.body.find((friend: { username: string }) => friend.username === opposite);
        expect(listed).toBeUndefined();
    });

    it("refuses to remove someone who is not a friend", async () => {
        const response = await request(app)
            .delete("/api/friends/" + opposite)
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(400);
    });
});

describe("singer profile", () => {
    const ROCK = ["12617", "12543", "11335"];
    const COUNTRY = ["90690", "13469", "6229"];

    let token: string;
    let me: string;
    let twin: string;
    let stranger: string;

    beforeAll(async () => {
        const response = await request(app).post("/api/auth/register").send({
            name: "Test Singer",
            username: "profileviewer" + Date.now(),
            email: "profileviewer" + Date.now() + "@karamatch.test",
            password: "secret123"
        });
        token = response.body.token;
        me = response.body.user.username;
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + token)
            .send({ favoriteSongIds: ROCK });
        twin = await registerWithFavourites("profiletwin", ROCK);
        stranger = await registerWithFavourites("profilestranger", COUNTRY);
    }, 20000);

    function profile(username: string) {
        return request(app)
            .get("/api/users/" + username)
            .set("Authorization", "Bearer " + token);
    }

    it("returns the singer with taste compatibility and their favourites", async () => {
        const response = await profile(twin);
        expect(response.status).toBe(200);
        expect(response.body.username).toBe(twin);
        expect(response.body.matchPct).toBe(100);
        expect(response.body.commonSongs.length).toBe(3);
        expect(response.body.favoriteSongs.length).toBe(3);
        expect(response.body.isSelf).toBe(false);
    });

    it("never leaks the password or token", async () => {
        const response = await profile(stranger);
        expect(response.body.password).toBeUndefined();
        expect(response.body.token).toBeUndefined();
    });

    it("flags your own profile with a null match", async () => {
        const response = await profile(me);
        expect(response.status).toBe(200);
        expect(response.body.isSelf).toBe(true);
        expect(response.body.matchPct).toBeNull();
    });

    it("reports friendship, before and after adding", async () => {
        const before = await profile(stranger);
        expect(before.body.isFriend).toBe(false);

        await request(app)
            .post("/api/friends")
            .set("Authorization", "Bearer " + token)
            .send({ username: stranger });

        const after = await profile(stranger);
        expect(after.body.isFriend).toBe(true);
    });

    it("accepts a username written with a leading @", async () => {
        const response = await profile("@" + twin);
        expect(response.status).toBe(200);
        expect(response.body.username).toBe(twin);
    });

    it("returns 404 for an unknown username", async () => {
        const response = await profile("definitely_not_a_singer");
        expect(response.status).toBe(404);
    });

    it("requires a token", async () => {
        const response = await request(app).get("/api/users/" + twin);
        expect(response.status).toBe(401);
    });
});

describe("closing finished parties", () => {
    let token: string;
    let venueId: string;
    let roomId: string;

    // Books a party on the first free slot and returns its id.
    async function book() {
        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + token);
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);
        roomId = roomWithSlots.room.id;
        const booking = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + token)
            .send({ venueId, roomId, slotId: roomWithSlots.slots[0].id, title: "Lifecycle Night" });
        return booking.body.id;
    }

    // Drags a party's slot into the past, so the next read has to close it.
    async function rewindSlot(partyId: string) {
        const party = await partiesCollection.findOne({ id: partyId });
        await slotsCollection.updateOne(
            { id: party!.slotId },
            {
                $set: {
                    start: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    end: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                }
            }
        );
        return party!.slotId;
    }

    beforeAll(async () => {
        token = await registerWithLocation("closing");
        const venues = await request(app)
            .get("/api/venues?distance=2")
            .set("Authorization", "Bearer " + token);
        venueId = venues.body[0].id;
    }, 20000);

    it("ends a paid party once its slot is over", async () => {
        const partyId = await book();
        await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + token);
        await rewindSlot(partyId);

        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + token);
        expect(room.status).toBe(200);
        expect(room.body.status).toBe("ended");
    });

    it("moves the finished party to past and opens rating", async () => {
        const partyId = await book();
        await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + token);
        await rewindSlot(partyId);

        const mine = await request(app).get("/api/parties/mine").set("Authorization", "Bearer " + token);
        expect(mine.body.past.some((party: any) => party.id === partyId)).toBe(true);
        expect(mine.body.upcoming.some((party: any) => party.id === partyId)).toBe(false);

        // Rating is gated on "ended", so it only works once the party closed.
        const crew = await request(app)
            .get("/api/parties/" + partyId + "/crew")
            .set("Authorization", "Bearer " + token);
        expect(crew.status).toBe(200);
    });

    it("cancels a party that was never paid for and frees the slot", async () => {
        const partyId = await book();
        const slotId = await rewindSlot(partyId);

        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + token);
        expect(room.body.status).toBe("cancelled");

        const slot = await slotsCollection.findOne({ id: slotId });
        expect(slot!.status).toBe("available");

        const mine = await request(app).get("/api/parties/mine").set("Authorization", "Bearer " + token);
        expect(mine.body.upcoming.some((party: any) => party.id === partyId)).toBe(false);
        expect(mine.body.past.some((party: any) => party.id === partyId)).toBe(false);
    });

    it("refuses to pay for a cancelled party", async () => {
        const partyId = await book();
        await rewindSlot(partyId);

        const response = await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(400);
    });

    it("keeps a party that has not started yet untouched", async () => {
        const partyId = await book();
        await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + token);

        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + token);
        expect(room.body.status).toBe("upcoming");
    });
});
