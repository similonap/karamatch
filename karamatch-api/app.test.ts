import request from "supertest";
import app from "./app";
import { client } from "./database";

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
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);
        roomId = roomWithSlots.room.id;
        slotId = roomWithSlots.slots[0].id;
    }, 20000);

    it("books a free slot as pending_payment", async () => {
        const response = await request(app)
            .post("/api/boxes")
            .set("Authorization", "Bearer " + hostToken)
            .send({ venueId, roomId, slotId, title: "Test Night" });
        expect(response.status).toBe(201);
        expect(response.body.status).toBe("pending_payment");
        expect(response.body.title).toBe("Test Night");
        expect(response.body.share).toBeGreaterThan(0);
        boxId = response.body.id;
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
        // rock favourites from the seeded catalog → a real genre profile
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + joinerToken)
            .send({ favoriteSongIds: ["s1", "s2", "s3"] });

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
        expect(search.body[0].singerRating).toBe(5);

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
        const firstGenres = response.body.slice(0, 8).map((song: any) => song.genre);
        expect(new Set(firstGenres).size).toBe(8);
    });

    it("expands favourite songs and genre profile on /me", async () => {
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + token)
            .send({ favoriteSongIds: ["s1", "s2", "s3"] });
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(response.body.favoriteSongs.length).toBe(3);
        expect(response.body.favoriteSongs[0].title).toBeTruthy();
        expect(response.body.genreProfile.rock).toBe(3);
    });
});
