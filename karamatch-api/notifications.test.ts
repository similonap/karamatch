import request from "supertest";
import app from "./app";
import { boxesCollection, client, slotsCollection } from "./database";

afterAll(async () => {
    await client.close();
});

const suffix = Date.now();
let counter = 0;

// Everyone in this suite sings in Ghent, so the world layer has somewhere to
// put the boxes an invite can point at.
const LAT = 51.0543;
const LNG = 3.7174;

interface Singer {
    username: string;
    email: string;
    token: string;
}

async function registerSinger(prefix: string): Promise<Singer> {
    counter++;
    const username = prefix + counter + "_" + suffix;
    const email = username + "@karamatch.test";
    const registration = await request(app).post("/api/auth/register").send({
        name: "Invite Tester",
        username: username,
        email: email,
        password: "secret123"
    });
    expect(registration.status).toBe(201);
    const token = registration.body.token as string;

    const location = await request(app)
        .put("/api/me/location")
        .set("Authorization", "Bearer " + token)
        .send({ lat: LAT, lng: LNG, label: "Ghent" });
    expect(location.status).toBe(200);

    return { username: username, email: email, token: token };
}

// Books and pays for a box, so it is "upcoming" and can be invited into.
// spots caps how many singers the host opens the room to, which is how the
// "no spots left" and "box is full" cases get set up cheaply.
async function hostAnUpcomingBox(host: Singer, spots?: number) {
    const venues = await request(app)
        .get("/api/venues?distance=3")
        .set("Authorization", "Bearer " + host.token);
    const venueId = venues.body[0].id;

    const slots = await request(app)
        .get("/api/venues/" + venueId + "/slots")
        .set("Authorization", "Bearer " + host.token);
    const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);

    const body: any = {
        venueId: venueId,
        roomId: roomWithSlots.room.id,
        slotId: roomWithSlots.slots[0].id
    };
    if (spots !== undefined) {
        body.spots = spots;
    }
    const booking = await request(app)
        .post("/api/boxes")
        .set("Authorization", "Bearer " + host.token)
        .send(body);
    expect(booking.status).toBe(201);

    const pay = await request(app)
        .post("/api/boxes/" + booking.body.id + "/pay")
        .set("Authorization", "Bearer " + host.token);
    expect(pay.status).toBe(200);
    return booking.body.id as string;
}

function invite(host: Singer, boxId: string, body: any) {
    return request(app)
        .post("/api/boxes/" + boxId + "/invites")
        .set("Authorization", "Bearer " + host.token)
        .send(body);
}

function notificationsFor(singer: Singer) {
    return request(app)
        .get("/api/notifications")
        .set("Authorization", "Bearer " + singer.token);
}

// Finds the invite that points at a given box, ignoring the guaranteed
// welcome invite every fresh singer gets.
async function inviteFor(singer: Singer, boxId: string) {
    const response = await notificationsFor(singer);
    expect(response.status).toBe(200);
    return response.body.find((notification: any) => notification.box.id === boxId);
}

// Moves a box's slot in time. Offsets are in hours relative to now, so
// (-3, -2) is a night that is over and (-0.5, 0.5) one that is under way.
async function moveSlot(boxId: string, startHours: number, endHours: number) {
    const box = await boxesCollection.findOne({ id: boxId });
    await slotsCollection.updateOne(
        { id: box!.slotId },
        {
            $set: {
                start: new Date(Date.now() + startHours * 60 * 60 * 1000).toISOString(),
                end: new Date(Date.now() + endHours * 60 * 60 * 1000).toISOString()
            }
        }
    );
}

describe("the invite every new singer starts with", () => {
    it("hands a located singer a pending invite on their first look", async () => {
        const singer = await registerSinger("welcome");
        const response = await notificationsFor(singer);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);

        const notification = response.body[0];
        expect(notification.id).toBeTruthy();
        expect(notification.status).toBe("pending");
        // The sender is a public profile — never the raw user document.
        expect(notification.from.username).toBeTruthy();
        expect(notification.from.password).toBeUndefined();
        expect(notification.from.token).toBeUndefined();
        // Enough about the night to render the card without a second call.
        expect(notification.box.id).toBeTruthy();
        expect(notification.box.title).toBeTruthy();
        expect(notification.box.venueName).toBeTruthy();
        expect(notification.box.start).toBeTruthy();
        expect(notification.box.share).toBeGreaterThan(0);
    }, 60000);

    it("does not invent a second one on the next poll", async () => {
        const singer = await registerSinger("poll");
        const first = await notificationsFor(singer);
        const second = await notificationsFor(singer);
        expect(second.body.map((notification: any) => notification.id))
            .toEqual(first.body.map((notification: any) => notification.id));
    }, 60000);

    it("returns an empty list for a singer who is nowhere yet", async () => {
        counter++;
        const username = "unpinned" + counter + "_" + suffix;
        const registration = await request(app).post("/api/auth/register").send({
            name: "Unpinned",
            username: username,
            email: username + "@karamatch.test",
            password: "secret123"
        });
        const response = await request(app)
            .get("/api/notifications")
            .set("Authorization", "Bearer " + registration.body.token);
        // No location means nothing to invite them to — an empty list, not a crash.
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    }, 30000);

    it("needs a token like everything else", async () => {
        const response = await request(app).get("/api/notifications");
        expect(response.status).toBe(401);
    });
});

describe("inviting singers to your box", () => {
    let host: Singer;
    let boxId: string;

    beforeAll(async () => {
        host = await registerSinger("invhost");
        boxId = await hostAnUpcomingBox(host);
    }, 60000);

    it("invites by @username and the invite lands", async () => {
        const guest = await registerSinger("byat");
        const response = await invite(host, boxId, { target: "@" + guest.username });
        expect(response.status).toBe(201);
        expect(response.body.invited).toEqual([guest.username]);

        const notification = await inviteFor(guest, boxId);
        expect(notification).toBeTruthy();
        expect(notification.status).toBe("pending");
        expect(notification.from.username).toBe(host.username);

        // The room shows who is still being waited on.
        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.body.invitedUsernames).toContain(guest.username);
    }, 60000);

    it("invites by plain username and by email", async () => {
        const byName = await registerSinger("byname");
        const byEmail = await registerSinger("byemail");

        const first = await invite(host, boxId, { target: byName.username });
        expect(first.status).toBe(201);
        expect(await inviteFor(byName, boxId)).toBeTruthy();

        const second = await invite(host, boxId, { target: byEmail.email });
        expect(second.status).toBe(201);
        expect(await inviteFor(byEmail, boxId)).toBeTruthy();
    }, 60000);

    it("invites a whole list at once", async () => {
        const one = await registerSinger("bulka");
        const two = await registerSinger("bulkb");

        const response = await invite(host, boxId, {
            usernames: ["@" + one.username, two.username, "ghost_" + suffix]
        });
        expect(response.status).toBe(201);
        // The name nobody answers to is skipped, the real ones go through.
        expect(response.body.invited.sort()).toEqual([one.username, two.username].sort());
        expect(await inviteFor(one, boxId)).toBeTruthy();
        expect(await inviteFor(two, boxId)).toBeTruthy();
    }, 60000);

    it("keeps a singer from being invited twice", async () => {
        const guest = await registerSinger("twice");
        expect((await invite(host, boxId, { target: guest.username })).status).toBe(201);

        const again = await invite(host, boxId, { target: guest.username });
        expect(again.status).toBe(400);

        const theirs = await notificationsFor(guest);
        const forThisBox = theirs.body.filter((notification: any) => notification.box.id === boxId);
        expect(forThisBox.length).toBe(1);
    }, 60000);

    it("turns down invites that make no sense", async () => {
        // Nobody named that.
        expect((await invite(host, boxId, { target: "nobody_" + suffix })).status).toBe(400);
        // Yourself.
        expect((await invite(host, boxId, { target: host.username })).status).toBe(400);
        // Nothing at all.
        expect((await invite(host, boxId, {})).status).toBe(400);
        // A box that does not exist.
        expect((await invite(host, "b-does-not-exist", { target: host.username })).status).toBe(404);
    }, 60000);

    it("lets only the host invite", async () => {
        const member = await registerSinger("member");
        const join = await request(app)
            .post("/api/boxes/" + boxId + "/join")
            .set("Authorization", "Bearer " + member.token);
        expect(join.status).toBe(200);

        // A member is in the room but does not get to fill it.
        const asMember = await invite(member, boxId, { target: host.username });
        expect(asMember.status).toBe(403);

        // Someone who has nothing to do with the box gets the same answer.
        const outsider = await registerSinger("outsider");
        const asOutsider = await invite(outsider, boxId, { target: host.username });
        expect(asOutsider.status).toBe(403);
    }, 60000);

    it("will not invite someone who is already in the room", async () => {
        const alreadyIn = await registerSinger("alreadyin");
        await request(app)
            .post("/api/boxes/" + boxId + "/join")
            .set("Authorization", "Bearer " + alreadyIn.token);

        const response = await invite(host, boxId, { target: alreadyIn.username });
        expect(response.status).toBe(400);
    }, 60000);

    it("stops inviting once the room is full", async () => {
        // One open spot: the host plus a single joiner fills it.
        const smallHost = await registerSinger("smallhost");
        const smallBox = await hostAnUpcomingBox(smallHost, 1);
        const joiner = await registerSinger("smalljoin");
        const join = await request(app)
            .post("/api/boxes/" + smallBox + "/join")
            .set("Authorization", "Bearer " + joiner.token);
        expect(join.status).toBe(200);

        const guest = await registerSinger("toolate");
        const response = await invite(smallHost, smallBox, { target: guest.username });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain("No spots left");
    }, 60000);
});

describe("answering an invite", () => {
    let host: Singer;
    let boxId: string;

    beforeAll(async () => {
        host = await registerSinger("answerhost");
        boxId = await hostAnUpcomingBox(host);
    }, 60000);

    it("accepting reserves the spot and opens payment", async () => {
        const guest = await registerSinger("accepter");
        await invite(host, boxId, { target: guest.username });
        const notification = await inviteFor(guest, boxId);

        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(accept.status).toBe(200);
        expect(accept.body.boxId).toBe(boxId);
        expect(accept.body.share).toBeGreaterThan(0);

        // They are in the room, unpaid, and the night is on their list.
        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + guest.token);
        expect(room.status).toBe(200);
        const them = room.body.members.find((member: any) => member.username === guest.username);
        expect(them.role).toBe("member");
        expect(them.paid).toBe(false);

        const mine = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer " + guest.token);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(true);

        const pay = await request(app)
            .post("/api/boxes/" + boxId + "/pay")
            .set("Authorization", "Bearer " + guest.token);
        expect(pay.status).toBe(200);

        // Handled once — the invite is off the list and cannot be re-accepted.
        expect(await inviteFor(guest, boxId)).toBeUndefined();
        const again = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(again.status).toBe(400);
    }, 60000);

    it("declining drops the invite without joining", async () => {
        const guest = await registerSinger("decliner");
        await invite(host, boxId, { target: guest.username });
        const notification = await inviteFor(guest, boxId);

        const decline = await request(app)
            .post("/api/notifications/" + notification.id + "/decline")
            .set("Authorization", "Bearer " + guest.token);
        expect(decline.status).toBe(204);

        expect(await inviteFor(guest, boxId)).toBeUndefined();

        // Declining is not joining: the box is not theirs and stays shut.
        const mine = await request(app)
            .get("/api/boxes/mine")
            .set("Authorization", "Bearer " + guest.token);
        expect(mine.body.upcoming.some((box: any) => box.id === boxId)).toBe(false);

        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + guest.token);
        expect(room.status).toBe(403);

        // And there is no changing your mind afterwards.
        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(accept.status).toBe(400);
    }, 60000);

    it("keeps invites private to the singer they were sent to", async () => {
        const guest = await registerSinger("private");
        const nosy = await registerSinger("nosy");
        await invite(host, boxId, { target: guest.username });
        const notification = await inviteFor(guest, boxId);

        // Not in someone else's list …
        const theirs = await notificationsFor(nosy);
        expect(theirs.body.some((entry: any) => entry.id === notification.id)).toBe(false);

        // … and not theirs to answer either.
        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + nosy.token);
        expect(accept.status).toBe(404);

        const decline = await request(app)
            .post("/api/notifications/" + notification.id + "/decline")
            .set("Authorization", "Bearer " + nosy.token);
        expect(decline.status).toBe(404);

        // The invite is untouched and still waiting for the person it was for.
        expect(await inviteFor(guest, boxId)).toBeTruthy();
    }, 60000);

    it("404s on an invite that does not exist", async () => {
        const guest = await registerSinger("ghostnote");
        const accept = await request(app)
            .post("/api/notifications/n-nope/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(accept.status).toBe(404);

        const decline = await request(app)
            .post("/api/notifications/n-nope/decline")
            .set("Authorization", "Bearer " + guest.token);
        expect(decline.status).toBe(404);
    }, 30000);

    it("refuses to squeeze into a room that filled up meanwhile", async () => {
        const smallHost = await registerSinger("racehost");
        const smallBox = await hostAnUpcomingBox(smallHost, 1);
        const invited = await registerSinger("raceinvited");
        await invite(smallHost, smallBox, { target: invited.username });
        const notification = await inviteFor(invited, smallBox);

        // Someone else takes the last spot before the invite is answered.
        const quicker = await registerSinger("racequick");
        const join = await request(app)
            .post("/api/boxes/" + smallBox + "/join")
            .set("Authorization", "Bearer " + quicker.token);
        expect(join.status).toBe(200);

        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + invited.token);
        expect(accept.status).toBe(400);
        expect(accept.body.error).toContain("full");
    }, 60000);
});

describe("invites that went stale", () => {
    let host: Singer;

    beforeAll(async () => {
        host = await registerSinger("stalehost");
    }, 30000);

    it("hides an invite once the night is over", async () => {
        const boxId = await hostAnUpcomingBox(host);
        const guest = await registerSinger("afterparty");
        await invite(host, boxId, { target: guest.username });
        expect(await inviteFor(guest, boxId)).toBeTruthy();

        // The night comes and goes.
        await moveSlot(boxId, -3, -2);

        expect(await inviteFor(guest, boxId)).toBeUndefined();
        // Reading the list is what closed the box, and it stays closed.
        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.body.status).toBe("ended");
    }, 60000);

    it("refuses accepting an invite to a night that already ended", async () => {
        const boxId = await hostAnUpcomingBox(host);
        const guest = await registerSinger("toolateaccept");
        await invite(host, boxId, { target: guest.username });
        const notification = await inviteFor(guest, boxId);

        await moveSlot(boxId, -3, -2);

        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(accept.status).toBe(400);
        expect(accept.body.error).toContain("no longer available");
    }, 60000);

    it("hides an invite once the night has started", async () => {
        const boxId = await hostAnUpcomingBox(host);
        const guest = await registerSinger("midnight");
        await invite(host, boxId, { target: guest.username });
        expect(await inviteFor(guest, boxId)).toBeTruthy();

        // Under way: started half an hour ago, still running. The box is very
        // much alive, but showing up now is not what an invite is for.
        await moveSlot(boxId, -0.5, 0.5);

        expect(await inviteFor(guest, boxId)).toBeUndefined();

        // The box itself is untouched — still upcoming, still the host's.
        const room = await request(app)
            .get("/api/boxes/" + boxId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.body.status).toBe("upcoming");
    }, 60000);

    it("still lists invites to nights that are yet to come", async () => {
        const boxId = await hostAnUpcomingBox(host);
        const guest = await registerSinger("stillgood");
        await invite(host, boxId, { target: guest.username });

        await moveSlot(boxId, 24, 25);

        const notification = await inviteFor(guest, boxId);
        expect(notification).toBeTruthy();
        expect(notification.status).toBe("pending");
    }, 60000);
});
