import request from "supertest";
import app from "./app";
import { boxesCollection, client, slotsCollection } from "./database";

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

describe("box chat", () => {
    let token: string;
    let outsiderToken: string;
    let boxId: string;

    beforeAll(async () => {
        token = await registerWithLocation("chata");
        outsiderToken = await registerWithLocation("chatb");
        // /boxes/mine backfills one past box the user is a member of — use it as the chat room
        const mine = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer " + token);
        boxId = mine.body.past[0].id;
    });

    it("starts with an empty message list for members", async () => {
        const response = await request(app)
            .get("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it("posts a message and reads it back", async () => {
        const post = await request(app)
            .post("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + token)
            .send({ text: "That last chorus was legendary" });
        expect(post.status).toBe(201);
        expect(post.body.text).toBe("That last chorus was legendary");
        expect(post.body.from.username).toContain("chata");

        const list = await request(app)
            .get("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + token);
        expect(list.status).toBe(200);
        const mine = list.body.filter((message: any) => message.id === post.body.id);
        expect(mine.length).toBe(1);
    });

    it("rejects empty messages", async () => {
        const response = await request(app)
            .post("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + token)
            .send({ text: "   " });
        expect(response.status).toBe(400);
    });

    it("rejects non-members", async () => {
        const response = await request(app)
            .get("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + outsiderToken);
        expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown box", async () => {
        const response = await request(app)
            .get("/api/boxes/b_nope/messages")
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
    let boxId: string;

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
            .post("/api/boxes")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId, title: "Test Night" });
        expect(response.status).toBe(201);
        expect(response.body.status).toBe("pending_payment");
        expect(response.body.title).toBe("Test Night");
        expect(response.body.share).toBeGreaterThan(0);
        expect(response.body.capacity).toBe(roomSeats);
        boxId = response.body.id;
    });

    it("lets the host open fewer spots than the room holds", async () => {
        const full = await request(app)
            .post("/api/boxes")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, spots: 2 });
        expect(full.status).toBe(201);
        expect(full.body.capacity).toBe(3);
        expect(full.body.seats).toBe(roomSeats);
        // Holding seats back must not make the spot pricier for joiners: the
        // share stays the room's per-seat price, and the host carries the rest.
        expect(full.body.share).toBe(Math.round(full.body.totalPrice / roomSeats));
    });

    it("quotes the same per-seat price on the room as the box charges", async () => {
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

        // The booking screen shows room.pricePerSeat before the box exists; it
        // has to match the share the box hands out afterwards.
        const box = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + hostToken);
        expect(box.body.share).toBe(room.pricePerSeat);
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
            .post("/api/boxes")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId: otherSlotId, spots: roomSeats });
        expect(response.status).toBe(400);
    });

    it("host payment confirms the box and books the slot", async () => {
        const response = await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + hostToken);
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("upcoming");

        const again = await request(app)
            .post("/api/boxes")
            .set("Authorization", "Bearer " + joinerToken)
            .send({ venueId, roomId, slotId });
        expect(again.status).toBe(400);
        expect(again.body.error).toBe("Slot already taken");
    });

    it("rejects joining your own box", async () => {
        const response = await request(app)
            .post("/api/boxes/" + boxId + "/join")
            .set("Authorization", "Bearer " + hostToken);
        expect(response.status).toBe(400);
    });

    it("lets another user join and pay their share", async () => {
        const join = await request(app)
            .post("/api/boxes/" + boxId + "/join")
            .set("Authorization", "Bearer " + joinerToken);
        expect(join.status).toBe(200);
        expect(join.body.boxId).toBe(boxId);
        expect(join.body.share).toBeGreaterThan(0);

        const doubleJoin = await request(app)
            .post("/api/boxes/" + boxId + "/join")
            .set("Authorization", "Bearer " + joinerToken);
        expect(doubleJoin.status).toBe(400);

        const pay = await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + joinerToken);
        expect(pay.status).toBe(200);
        expect(pay.body.status).toBe("upcoming");
    });

    it("rejects paying for a box you are not in", async () => {
        const outsiderToken = await registerWithLocation("o");
        const response = await request(app)
            .post("/api/boxes/" + boxId + "/pay")
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
        expect(accept.body.boxId).toBe(invite.box.id);

        const pay = await request(app)
            .post("/api/boxes/" + accept.body.boxId + "/pay")
            .set("Authorization", "Bearer " + joinerToken);
        expect(pay.status).toBe(200);

        const acceptAgain = await request(app)
            .post("/api/notifications/" + invite.id + "/accept")
            .set("Authorization", "Bearer " + joinerToken);
        expect(acceptAgain.status).toBe(400);
    }, 20000);

    it("scores nearby boxes by taste and sorts by matchPct", async () => {
        // Rock favourites from the seeded catalog → a real genre profile
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + joinerToken)
            .send({ favoriteSongIds: ["12617", "12543", "11335"] });

        const response = await request(app)
            .get("/api/boxes/matches")
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
            .get("/api/boxes/matches?minOverlap=101")
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

describe("box room, host controls & invites", () => {
    let hostToken: string;
    let memberToken: string;
    let memberUsername: string;
    let boxId: string;

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
            .post("/api/boxes")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId: roomWithSlots.room.id, slotId: roomWithSlots.slots[0].id });
        boxId = booking.body.id;
        await request(app).post("/api/boxes/" + boxId + "/pay").set("Authorization", "Bearer " + hostToken);
    }, 20000);

    it("shows the room view to members only", async () => {
        const response = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + hostToken);
        expect(response.status).toBe(200);
        expect(response.body.venue.name).toBeTruthy();
        expect(response.body.roomName).toBeTruthy();
        expect(response.body.members[0].role).toBe("host");
        expect(response.body.members[0].paid).toBe(true);
        expect(response.body.spotsLeft).toBe(response.body.capacity - 1);

        const outsider = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + memberToken);
        expect(outsider.status).toBe(403);
    });

    it("lets only the host toggle openToPublic", async () => {
        const forbidden = await request(app)
            .patch("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + memberToken)
            .send({ openToPublic: false });
        expect(forbidden.status).toBe(403);

        const bad = await request(app)
            .patch("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + hostToken)
            .send({ openToPublic: "yes" });
        expect(bad.status).toBe(400);

        const ok = await request(app)
            .patch("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + hostToken)
            .send({ openToPublic: false });
        expect(ok.status).toBe(200);
        expect(ok.body.openToPublic).toBe(false);
    });

    it("host invites by @username and the invitee gets a notification", async () => {
        const invite = await request(app)
            .post("/api/boxes/" + boxId + "/invites")
            .set("Authorization", "Bearer " + hostToken)
            .send({ target: "@" + memberUsername });
        expect(invite.status).toBe(201);
        expect(invite.body.invited).toContain(memberUsername);

        const notifications = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer " + memberToken);
        const fromBox = notifications.body.find((n: any) => n.box.id === boxId);
        expect(fromBox).toBeTruthy();

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + hostToken);
        expect(room.body.invitedUsernames).toContain(memberUsername);
    }, 20000);

    it("rejects duplicate or unknown invites", async () => {
        const duplicate = await request(app)
            .post("/api/boxes/" + boxId + "/invites")
            .set("Authorization", "Bearer " + hostToken)
            .send({ usernames: [memberUsername] });
        expect(duplicate.status).toBe(400);

        const unknown = await request(app)
            .post("/api/boxes/" + boxId + "/invites")
            .set("Authorization", "Bearer " + hostToken)
            .send({ target: "@nobody_here_" + Date.now() });
        expect(unknown.status).toBe(400);
    });
});

describe("crew & ratings", () => {
    let token: string;
    let boxId: string;
    let crew: any[];

    beforeAll(async () => {
        token = await registerWithLocation("rate");
        const mine = await request(app).get("/api/boxes/mine").set("Authorization", "Bearer " + token);
        boxId = mine.body.past[0].id;
    }, 20000);

    it("lists the crew of an ended box", async () => {
        const response = await request(app)
            .get("/api/boxes/" + boxId + "/crew")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].username).toBeTruthy();
        expect(response.body.some((member: any) => member.role === "host")).toBe(true);
        crew = response.body;
    });

    it("rejects invalid stars", async () => {
        const response = await request(app)
            .post("/api/boxes/" + boxId + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings: [{ username: crew[0].username, stars: 7, text: "" }] });
        expect(response.status).toBe(400);
    });

    it("stores ratings, recomputes singer ratings and flags the box rated", async () => {
        const ratings = crew.map((member: any) => ({
            username: member.username,
            stars: 5,
            text: "Great night!"
        }));
        const response = await request(app)
            .post("/api/boxes/" + boxId + "/ratings")
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

        const mine = await request(app).get("/api/boxes/mine").set("Authorization", "Bearer " + token);
        const past = mine.body.past.find((box: any) => box.id === boxId);
        expect(past.rated).toBe(true);

        const again = await request(app)
            .post("/api/boxes/" + boxId + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings });
        expect(again.status).toBe(400);
    }, 20000);

    it("refuses rating a box that has not ended", async () => {
        const open = await request(app)
            .get("/api/boxes/open")
            .set("Authorization", "Bearer " + token);
        const join = await request(app)
            .post("/api/boxes/" + open.body[0].id + "/join")
            .set("Authorization", "Bearer " + token);
        expect(join.status).toBe(200);
        const response = await request(app)
            .post("/api/boxes/" + open.body[0].id + "/ratings")
            .set("Authorization", "Bearer " + token)
            .send({ ratings: [{ username: "whoever", stars: 5, text: "" }] });
        expect(response.status).toBe(400);
    }, 20000);
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

describe("closing finished boxes", () => {
    let token: string;
    let venueId: string;
    let roomId: string;

    // Books a box on the first free slot and returns its id.
    async function book() {
        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + token);
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);
        roomId = roomWithSlots.room.id;
        const booking = await request(app)
            .post("/api/boxes")
            .set("Authorization", "Bearer " + token)
            .send({ venueId, roomId, slotId: roomWithSlots.slots[0].id });
        return booking.body.id;
    }

    // Drags a box's slot into the past, so the next read has to close it.
    async function rewindSlot(boxId: string) {
        const box = await boxesCollection.findOne({ id: boxId });
        await slotsCollection.updateOne(
            { id: box!.slotId },
            {
                $set: {
                    start: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    end: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                }
            }
        );
        return box!.slotId;
    }

    beforeAll(async () => {
        token = await registerWithLocation("closing");
        const venues = await request(app)
            .get("/api/venues?distance=2")
            .set("Authorization", "Bearer " + token);
        venueId = venues.body[0].id;
    }, 20000);

    it("ends a paid box once its slot is over", async () => {
        const boxId = await book();
        await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + token);
        await rewindSlot(boxId);

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + token);
        expect(room.status).toBe(200);
        expect(room.body.status).toBe("ended");
    });

    it("moves the finished box to past and opens rating", async () => {
        const boxId = await book();
        await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + token);
        await rewindSlot(boxId);

        const mine = await request(app).get("/api/boxes/mine").set("Authorization", "Bearer " + token);
        expect(mine.body.past.some((box: any) => box.id === boxId)).toBe(true);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(false);

        // Rating is gated on "ended", so it only works once the box closed.
        const crew = await request(app)
            .get("/api/boxes/" + boxId + "/crew")
            .set("Authorization", "Bearer " + token);
        expect(crew.status).toBe(200);
    });

    it("cancels a box that was never paid for and frees the slot", async () => {
        const boxId = await book();
        const slotId = await rewindSlot(boxId);

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + token);
        expect(room.body.status).toBe("cancelled");

        const slot = await slotsCollection.findOne({ id: slotId });
        expect(slot!.status).toBe("available");

        const mine = await request(app).get("/api/boxes/mine").set("Authorization", "Bearer " + token);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(false);
        expect(mine.body.past.some((box: any) => box.id === boxId)).toBe(false);
    });

    it("refuses to pay for a cancelled box", async () => {
        const boxId = await book();
        await rewindSlot(boxId);

        const response = await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(400);
    });

    it("keeps a box that has not started yet untouched", async () => {
        const boxId = await book();
        await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + token);

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + token);
        expect(room.body.status).toBe("upcoming");
    });
});
