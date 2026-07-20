import request from "supertest";
import app from "./app";
import { boxesCollection, client, slotsCollection } from "./database";

afterAll(async () => {
    await client.close();
});

// One shared suffix keeps the three singers of this journey unique per run,
// while their usernames stay readable in failure output.
const suffix = Date.now();

interface Singer {
    username: string;
    email: string;
    password: string;
    token: string;
}

// Registers a singer, logs them back in and pins them in Hasselt. The token
// kept is the one from login (registering hands out a token too, but logging
// in replaces it), so the whole journey runs on a logged-in session.
async function registerAndLogin(prefix: string): Promise<Singer> {
    const username = prefix + suffix;
    const email = prefix + suffix + "@karamatch.test";
    const password = "secret123";

    const registration = await request(app).post("/api/auth/register").send({
        name: "Journey " + prefix,
        username: username,
        email: email,
        password: password
    });
    expect(registration.status).toBe(201);

    const login = await request(app).post("/api/auth/login").send({ login: username, password: password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const location = await request(app)
        .put("/api/me/location")
        .set("Authorization", "Bearer " + login.body.token)
        .send({ lat: 50.9307, lng: 5.3378, label: "Hasselt" });
    expect(location.status).toBe(200);

    return { username: username, email: email, password: password, token: login.body.token };
}

// Drags a box's slot into the past, so the next read closes the box. Same
// trick the "closing finished boxes" suite uses — there is no endpoint that
// ends a night early.
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
}

// The full night, start to finish: log in, book a room, get befriended, sing
// together, chat, review the crew afterwards and part ways again. The steps
// run in order and each one builds on the state the previous one left behind.
describe("full journey: login → book → befriend → join → chat → review → unfriend", () => {
    let host: Singer;
    let friendOne: Singer;
    let friendTwo: Singer;
    let venueId: string;
    let roomId: string;
    let slotId: string;
    let roomSeats: number;
    let boxId: string;
    let share: number;

    beforeAll(async () => {
        host = await registerAndLogin("journeyhost");
        friendOne = await registerAndLogin("journeyfriend1");
        friendTwo = await registerAndLogin("journeyfriend2");
    }, 30000);

    // -- 1. login ----------------------------------------------------------

    it("logs the host in and returns their own profile", async () => {
        const me = await request(app)
            .get("/api/me")
            .set("Authorization", "Bearer " + host.token);
        expect(me.status).toBe(200);
        expect(me.body.username).toBe(host.username);
        expect(me.body.password).toBeUndefined();
        expect(me.body.token).toBeUndefined();
    });

    it("refuses the journey endpoints without a valid token", async () => {
        const noToken = await request(app).get("/api/boxes/mine");
        expect(noToken.status).toBe(401);

        const badToken = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer not-a-real-token");
        expect(badToken.status).toBe(401);
    });

    // -- 2. booking a box at a venue ---------------------------------------

    it("finds a venue near the host with a bookable slot", async () => {
        const venues = await request(app)
            .get("/api/venues?distance=2")
            .set("Authorization", "Bearer " + host.token);
        expect(venues.status).toBe(200);
        expect(venues.body.length).toBeGreaterThan(0);
        venueId = venues.body[0].id;

        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + host.token);
        expect(slots.status).toBe(200);
        // The room has to seat the host plus both friends.
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0 && entry.room.seats >= 3);
        expect(roomWithSlots).toBeTruthy();
        roomId = roomWithSlots.room.id;
        roomSeats = roomWithSlots.room.seats;
        slotId = roomWithSlots.slots[0].id;
    }, 30000);

    it("books the slot as a box awaiting payment", async () => {
        const booking = await request(app)
            .post("/api/boxes")
            .set("Authorization", "Bearer " + host.token)
            .send({ venueId: venueId, roomId: roomId, slotId: slotId, title: "Journey Night" });
        expect(booking.status).toBe(201);
        expect(booking.body.title).toBe("Journey Night");
        expect(booking.body.status).toBe("pending_payment");
        expect(booking.body.capacity).toBe(roomSeats);
        expect(booking.body.share).toBeGreaterThan(0);
        boxId = booking.body.id;
        share = booking.body.share;
    });

    it("confirms the booking once the host pays", async () => {
        const pay = await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + host.token);
        expect(pay.status).toBe(200);
        expect(pay.body.status).toBe("upcoming");
        expect(pay.body.share).toBe(share);

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.status).toBe(200);
        expect(room.body.status).toBe("upcoming");
        expect(room.body.members.length).toBe(1);
        expect(room.body.members[0].username).toBe(host.username);
        expect(room.body.members[0].role).toBe("host");
        expect(room.body.members[0].paid).toBe(true);
        expect(room.body.spotsLeft).toBe(roomSeats - 1);

        const mine = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer " + host.token);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(true);
    }, 30000);

    // -- 3. other people adding you as a friend ----------------------------

    it("lets both friends add the host, and friendship is mutual", async () => {
        for (const friend of [friendOne, friendTwo]) {
            const add = await request(app)
                .post("/api/friends")
                .set("Authorization", "Bearer " + friend.token)
                .send({ username: "@" + host.username });
            expect(add.status).toBe(201);
            expect(add.body.username).toBe(host.username);

            // The friend sees the host on their side …
            const theirs = await request(app)
                .get("/api/friends")
                .set("Authorization", "Bearer " + friend.token);
            expect(theirs.status).toBe(200);
            expect(theirs.body.some((entry: any) => entry.username === host.username)).toBe(true);
        }

        // … and the host, who added nobody, ends up with both of them.
        const hostFriends = await request(app)
            .get("/api/friends")
            .set("Authorization", "Bearer " + host.token);
        expect(hostFriends.status).toBe(200);
        const usernames = hostFriends.body.map((entry: any) => entry.username);
        expect(usernames).toContain(friendOne.username);
        expect(usernames).toContain(friendTwo.username);

        // The profile page the host lands on from that list agrees.
        const profile = await request(app)
            .get("/api/users/" + friendOne.username)
            .set("Authorization", "Bearer " + host.token);
        expect(profile.status).toBe(200);
        expect(profile.body.isFriend).toBe(true);
    }, 30000);

    it("rejects adding the same friend twice", async () => {
        const again = await request(app)
            .post("/api/friends")
            .set("Authorization", "Bearer " + friendOne.token)
            .send({ username: host.username });
        expect(again.status).toBe(400);
    });

    // -- 4. joining the box ------------------------------------------------

    it("lets both friends join the host's box and pay their share", async () => {
        for (const friend of [friendOne, friendTwo]) {
            const join = await request(app)
                .post("/api/boxes/" + boxId + "/join")
                .set("Authorization", "Bearer " + friend.token);
            expect(join.status).toBe(200);
            expect(join.body.boxId).toBe(boxId);
            // Everyone pays the same per-seat price, however many spots the
            // host opened up.
            expect(join.body.share).toBe(share);

            const pay = await request(app)
                .post("/api/boxes/" + boxId + "/pay")
                .set("Authorization", "Bearer " + friend.token);
            expect(pay.status).toBe(200);
        }

        const room = await request(app)
            .get("/api/boxes/" + boxId + "")
            .set("Authorization", "Bearer " + host.token);
        expect(room.status).toBe(200);
        expect(room.body.members.length).toBe(3);
        expect(room.body.members.every((member: any) => member.paid)).toBe(true);
        expect(room.body.spotsLeft).toBe(roomSeats - 3);

        // The night now shows up for the friends too.
        const mine = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer " + friendOne.token);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(true);
    }, 30000);

    it("rejects joining a box you are already in", async () => {
        const again = await request(app)
            .post("/api/boxes/" + boxId + "/join")
            .set("Authorization", "Bearer " + friendOne.token);
        expect(again.status).toBe(400);
    });

    // -- 5. the chat -------------------------------------------------------

    it("carries a conversation between all three members", async () => {
        const said: { singer: Singer; text: string }[] = [
            { singer: host, text: "Booked it — see you at nine!" },
            { singer: friendOne, text: "Bringing the tambourine" },
            { singer: friendTwo, text: "I call dibs on the power ballads" }
        ];

        for (const line of said) {
            const post = await request(app)
                .post("/api/boxes/" + boxId + "/messages")
                .set("Authorization", "Bearer " + line.singer.token)
                .send({ text: line.text });
            expect(post.status).toBe(201);
            expect(post.body.text).toBe(line.text);
            expect(post.body.from.username).toBe(line.singer.username);
        }

        // Every member reads back the same conversation, oldest first.
        for (const singer of [host, friendOne, friendTwo]) {
            const list = await request(app)
                .get("/api/boxes/" + boxId + "/messages")
                .set("Authorization", "Bearer " + singer.token);
            expect(list.status).toBe(200);
            const ours = list.body.filter((message: any) =>
                said.some(line => line.text === message.text));
            expect(ours.length).toBe(said.length);
            expect(ours.map((message: any) => message.text)).toEqual(said.map(line => line.text));
        }
    }, 30000);

    it("rejects empty messages and keeps outsiders out of the chat", async () => {
        const empty = await request(app)
            .post("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + host.token)
            .send({ text: "   " });
        expect(empty.status).toBe(400);

        const outsider = await registerAndLogin("journeyoutsider");
        const read = await request(app)
            .get("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + outsider.token);
        expect(read.status).toBe(403);

        const write = await request(app)
            .post("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + outsider.token)
            .send({ text: "let me in" });
        expect(write.status).toBe(403);
    }, 30000);

    // -- 6. after the event: reviewing the crew ----------------------------

    it("refuses to rate a box that has not happened yet", async () => {
        const early = await request(app)
            .post("/api/boxes/" + boxId + "/ratings")
            .set("Authorization", "Bearer " + host.token)
            .send({ ratings: [{ username: friendOne.username, stars: 5, text: "too soon" }] });
        expect(early.status).toBe(400);

        const crew = await request(app)
            .get("/api/boxes/" + boxId + "/crew")
            .set("Authorization", "Bearer " + host.token);
        expect(crew.status).toBe(400);
    });

    it("ends the box once its slot is over", async () => {
        await rewindSlot(boxId);

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.status).toBe(200);
        expect(room.body.status).toBe("ended");
        expect(room.body.rated).toBe(false);

        const mine = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer " + host.token);
        expect(mine.body.past.some((box: any) => box.id === boxId)).toBe(true);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(false);
    }, 30000);

    it("shows each member the rest of the crew to review", async () => {
        const crew = await request(app)
            .get("/api/boxes/" + boxId + "/crew")
            .set("Authorization", "Bearer " + host.token);
        expect(crew.status).toBe(200);
        // Everyone but yourself.
        expect(crew.body.length).toBe(2);
        expect(crew.body.map((member: any) => member.username).sort())
            .toEqual([friendOne.username, friendTwo.username].sort());
        expect(crew.body.every((member: any) => member.role === "member")).toBe(true);

        const asFriend = await request(app)
            .get("/api/boxes/" + boxId + "/crew")
            .set("Authorization", "Bearer " + friendOne.token);
        expect(asFriend.status).toBe(200);
        expect(asFriend.body.some((member: any) => member.username === host.username
            && member.role === "host")).toBe(true);
    }, 30000);

    it("rejects invalid stars and strangers in a review", async () => {
        const tooManyStars = await request(app)
            .post("/api/boxes/" + boxId + "/ratings")
            .set("Authorization", "Bearer " + host.token)
            .send({ ratings: [{ username: friendOne.username, stars: 7, text: "" }] });
        expect(tooManyStars.status).toBe(400);

        const notInTheBox = await request(app)
            .post("/api/boxes/" + boxId + "/ratings")
            .set("Authorization", "Bearer " + host.token)
            .send({ ratings: [{ username: "nobody_" + suffix, stars: 5, text: "" }] });
        expect(notInTheBox.status).toBe(400);
    });

    it("lets everyone review everyone else, and averages the stars received", async () => {
        // Host is stricter than the friends, so the averages differ per singer
        // and a wrong recomputation cannot slip through.
        const reviews: { by: Singer; ratings: { username: string; stars: number; text: string }[] }[] = [
            {
                by: host,
                ratings: [
                    { username: friendOne.username, stars: 5, text: "Carried the harmonies" },
                    { username: friendTwo.username, stars: 5, text: "Power ballad royalty" }
                ]
            },
            {
                by: friendOne,
                ratings: [
                    { username: "@" + host.username, stars: 4, text: "Great room, shaky high notes" },
                    { username: friendTwo.username, stars: 5, text: "Encore!" }
                ]
            },
            {
                by: friendTwo,
                ratings: [
                    { username: "@" + host.username, stars: 4, text: "Thanks for organising" },
                    { username: friendOne.username, stars: 5, text: "Tambourine hero" }
                ]
            }
        ];

        for (const review of reviews) {
            const response = await request(app)
                .post("/api/boxes/" + boxId + "/ratings")
                .set("Authorization", "Bearer " + review.by.token)
                .send({ ratings: review.ratings });
            expect(response.status).toBe(201);
        }

        // 4 + 4 → 4 for the host, 5 + 5 → 5 for both friends.
        const expected: { singer: Singer; rating: number }[] = [
            { singer: host, rating: 4 },
            { singer: friendOne, rating: 5 },
            { singer: friendTwo, rating: 5 }
        ];
        for (const entry of expected) {
            const profile = await request(app)
                .get("/api/users/" + entry.singer.username)
                .set("Authorization", "Bearer " + host.token);
            expect(profile.status).toBe(200);
            expect(profile.body.singerRating).toBe(entry.rating);
        }

        // The box is flagged rated for everyone who reviewed, and nobody gets
        // to review the same night twice.
        for (const review of reviews) {
            const mine = await request(app)
                .get("/api/boxes/mine")
                .set("Authorization", "Bearer " + review.by.token);
            const past = mine.body.past.find((box: any) => box.id === boxId);
            expect(past.rated).toBe(true);

            const again = await request(app)
                .post("/api/boxes/" + boxId + "/ratings")
                .set("Authorization", "Bearer " + review.by.token)
                .send({ ratings: review.ratings });
            expect(again.status).toBe(400);
        }
    }, 60000);

    // -- 7. parting ways ---------------------------------------------------

    it("removes both friends again, on both sides", async () => {
        for (const friend of [friendOne, friendTwo]) {
            const remove = await request(app)
                .delete("/api/friends/@" + friend.username)
                .set("Authorization", "Bearer " + host.token);
            expect(remove.status).toBe(200);
            expect(remove.body.username).toBe(friend.username);
        }

        const hostFriends = await request(app)
            .get("/api/friends")
            .set("Authorization", "Bearer " + host.token);
        expect(hostFriends.status).toBe(200);
        expect(hostFriends.body.length).toBe(0);

        // Unfriending is mutual, so the host is gone from their lists too.
        for (const friend of [friendOne, friendTwo]) {
            const theirs = await request(app)
                .get("/api/friends")
                .set("Authorization", "Bearer " + friend.token);
            expect(theirs.status).toBe(200);
            expect(theirs.body.some((entry: any) => entry.username === host.username)).toBe(false);
        }

        const profile = await request(app)
            .get("/api/users/" + friendOne.username)
            .set("Authorization", "Bearer " + host.token);
        expect(profile.body.isFriend).toBe(false);
    }, 30000);

    it("rejects removing someone who is no longer a friend", async () => {
        const again = await request(app)
            .delete("/api/friends/" + friendOne.username)
            .set("Authorization", "Bearer " + host.token);
        expect(again.status).toBe(400);
    });

    it("leaves the finished night and its reviews intact afterwards", async () => {
        // Unfriending must not touch the history: the box, its chat and the
        // ratings all survive.
        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.status).toBe(200);
        expect(room.body.status).toBe("ended");
        expect(room.body.rated).toBe(true);
        expect(room.body.members.length).toBe(3);

        const messages = await request(app)
            .get("/api/boxes/" + boxId + "/messages")
            .set("Authorization", "Bearer " + friendOne.token);
        expect(messages.status).toBe(200);
        expect(messages.body.length).toBeGreaterThanOrEqual(3);

        const profile = await request(app)
            .get("/api/users/" + host.username)
            .set("Authorization", "Bearer " + friendOne.token);
        expect(profile.body.singerRating).toBe(4);
    }, 30000);
});
