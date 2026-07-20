import request from "supertest";
import app from "./app";
import { partiesCollection, client, slotsCollection } from "./database";

afterAll(async () => {
    await client.close();
});

const suffix = Date.now();
let counter = 0;

// Everyone in this suite sings in Ghent, so the world layer has somewhere to
// put the parties an invite can point at.
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

// Books and pays for a party, so it is "upcoming" and can be invited into.
// spots caps how many singers the host opens the room to, which is how the
// "no spots left" and "party is full" cases get set up cheaply.
async function hostAnUpcomingParty(host: Singer, spots?: number) {
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
        .post("/api/parties")
        .set("Authorization", "Bearer " + host.token)
        .send(body);
    expect(booking.status).toBe(201);

    const pay = await request(app)
        .post("/api/parties/" + booking.body.id + "/pay")
        .set("Authorization", "Bearer " + host.token);
    expect(pay.status).toBe(200);
    return booking.body.id as string;
}

function invite(host: Singer, partyId: string, body: any) {
    return request(app)
        .post("/api/parties/" + partyId + "/invites")
        .set("Authorization", "Bearer " + host.token)
        .send(body);
}

function notificationsFor(singer: Singer) {
    return request(app)
        .get("/api/notifications")
        .set("Authorization", "Bearer " + singer.token);
}

// Finds the invite that points at a given party, ignoring the guaranteed
// welcome invite every fresh singer gets.
async function inviteFor(singer: Singer, partyId: string) {
    const response = await notificationsFor(singer);
    expect(response.status).toBe(200);
    return response.body.find((notification: any) => notification.party.id === partyId);
}

// Moves a party's slot in time. Offsets are in hours relative to now, so
// (-3, -2) is a night that is over and (-0.5, 0.5) one that is under way.
async function moveSlot(partyId: string, startHours: number, endHours: number) {
    const party = await partiesCollection.findOne({ id: partyId });
    await slotsCollection.updateOne(
        { id: party!.slotId },
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
        expect(notification.party.id).toBeTruthy();
        expect(notification.party.title).toBeTruthy();
        expect(notification.party.venueName).toBeTruthy();
        expect(notification.party.start).toBeTruthy();
        expect(notification.party.share).toBeGreaterThan(0);
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

describe("inviting singers to your party", () => {
    let host: Singer;
    let partyId: string;

    beforeAll(async () => {
        host = await registerSinger("invhost");
        partyId = await hostAnUpcomingParty(host);
    }, 60000);

    it("invites by @username and the invite lands", async () => {
        const guest = await registerSinger("byat");
        const response = await invite(host, partyId, { target: "@" + guest.username });
        expect(response.status).toBe(201);
        expect(response.body.invited).toEqual([guest.username]);

        const notification = await inviteFor(guest, partyId);
        expect(notification).toBeTruthy();
        expect(notification.status).toBe("pending");
        expect(notification.from.username).toBe(host.username);

        // The room shows who is still being waited on.
        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.body.invitedUsernames).toContain(guest.username);
    }, 60000);

    it("invites by plain username and by email", async () => {
        const byName = await registerSinger("byname");
        const byEmail = await registerSinger("byemail");

        const first = await invite(host, partyId, { target: byName.username });
        expect(first.status).toBe(201);
        expect(await inviteFor(byName, partyId)).toBeTruthy();

        const second = await invite(host, partyId, { target: byEmail.email });
        expect(second.status).toBe(201);
        expect(await inviteFor(byEmail, partyId)).toBeTruthy();
    }, 60000);

    it("invites a whole list at once", async () => {
        const one = await registerSinger("bulka");
        const two = await registerSinger("bulkb");

        const response = await invite(host, partyId, {
            usernames: ["@" + one.username, two.username, "ghost_" + suffix]
        });
        expect(response.status).toBe(201);
        // The name nobody answers to is skipped, the real ones go through.
        expect(response.body.invited.sort()).toEqual([one.username, two.username].sort());
        expect(await inviteFor(one, partyId)).toBeTruthy();
        expect(await inviteFor(two, partyId)).toBeTruthy();
    }, 60000);

    it("keeps a singer from being invited twice", async () => {
        const guest = await registerSinger("twice");
        expect((await invite(host, partyId, { target: guest.username })).status).toBe(201);

        const again = await invite(host, partyId, { target: guest.username });
        expect(again.status).toBe(400);

        const theirs = await notificationsFor(guest);
        const forThisParty = theirs.body.filter((notification: any) => notification.party.id === partyId);
        expect(forThisParty.length).toBe(1);
    }, 60000);

    it("turns down invites that make no sense", async () => {
        // Nobody named that.
        expect((await invite(host, partyId, { target: "nobody_" + suffix })).status).toBe(400);
        // Yourself.
        expect((await invite(host, partyId, { target: host.username })).status).toBe(400);
        // Nothing at all.
        expect((await invite(host, partyId, {})).status).toBe(400);
        // A party that does not exist.
        expect((await invite(host, "b-does-not-exist", { target: host.username })).status).toBe(404);
    }, 60000);

    it("lets only the host invite", async () => {
        const member = await registerSinger("member");
        const join = await request(app)
            .post("/api/parties/" + partyId + "/join")
            .set("Authorization", "Bearer " + member.token);
        expect(join.status).toBe(200);

        // A member is in the room but does not get to fill it.
        const asMember = await invite(member, partyId, { target: host.username });
        expect(asMember.status).toBe(403);

        // Someone who has nothing to do with the party gets the same answer.
        const outsider = await registerSinger("outsider");
        const asOutsider = await invite(outsider, partyId, { target: host.username });
        expect(asOutsider.status).toBe(403);
    }, 60000);

    it("will not invite someone who is already in the room", async () => {
        const alreadyIn = await registerSinger("alreadyin");
        await request(app)
            .post("/api/parties/" + partyId + "/join")
            .set("Authorization", "Bearer " + alreadyIn.token);

        const response = await invite(host, partyId, { target: alreadyIn.username });
        expect(response.status).toBe(400);
    }, 60000);

    it("stops inviting once the room is full", async () => {
        // One open spot: the host plus a single joiner fills it.
        const smallHost = await registerSinger("smallhost");
        const smallParty = await hostAnUpcomingParty(smallHost, 1);
        const joiner = await registerSinger("smalljoin");
        const join = await request(app)
            .post("/api/parties/" + smallParty + "/join")
            .set("Authorization", "Bearer " + joiner.token);
        expect(join.status).toBe(200);

        const guest = await registerSinger("toolate");
        const response = await invite(smallHost, smallParty, { target: guest.username });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain("No spots left");
    }, 60000);
});

describe("answering an invite", () => {
    let host: Singer;
    let partyId: string;

    beforeAll(async () => {
        host = await registerSinger("answerhost");
        partyId = await hostAnUpcomingParty(host);
    }, 60000);

    it("accepting reserves the spot and opens payment", async () => {
        const guest = await registerSinger("accepter");
        await invite(host, partyId, { target: guest.username });
        const notification = await inviteFor(guest, partyId);

        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(accept.status).toBe(200);
        expect(accept.body.partyId).toBe(partyId);
        expect(accept.body.share).toBeGreaterThan(0);

        // They are in the room, unpaid, and the night is on their list.
        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + guest.token);
        expect(room.status).toBe(200);
        const them = room.body.members.find((member: any) => member.username === guest.username);
        expect(them.role).toBe("member");
        expect(them.paid).toBe(false);

        const mine = await request(app)
            .get("/api/parties/mine")
            .set("Authorization", "Bearer " + guest.token);
        expect(mine.body.upcoming.some((party: any) => party.id === partyId)).toBe(true);

        const pay = await request(app)
            .post("/api/parties/" + partyId + "/pay")
            .set("Authorization", "Bearer " + guest.token);
        expect(pay.status).toBe(200);

        // Handled once — the invite is off the list and cannot be re-accepted.
        expect(await inviteFor(guest, partyId)).toBeUndefined();
        const again = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(again.status).toBe(400);
    }, 60000);

    it("declining drops the invite without joining", async () => {
        const guest = await registerSinger("decliner");
        await invite(host, partyId, { target: guest.username });
        const notification = await inviteFor(guest, partyId);

        const decline = await request(app)
            .post("/api/notifications/" + notification.id + "/decline")
            .set("Authorization", "Bearer " + guest.token);
        expect(decline.status).toBe(204);

        expect(await inviteFor(guest, partyId)).toBeUndefined();

        // Declining is not joining: the party is not theirs and stays shut.
        const mine = await request(app)
            .get("/api/parties/mine")
            .set("Authorization", "Bearer " + guest.token);
        expect(mine.body.upcoming.some((party: any) => party.id === partyId)).toBe(false);

        const room = await request(app)
            .get("/api/parties/" + partyId)
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
        await invite(host, partyId, { target: guest.username });
        const notification = await inviteFor(guest, partyId);

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
        expect(await inviteFor(guest, partyId)).toBeTruthy();
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
        const smallParty = await hostAnUpcomingParty(smallHost, 1);
        const invited = await registerSinger("raceinvited");
        await invite(smallHost, smallParty, { target: invited.username });
        const notification = await inviteFor(invited, smallParty);

        // Someone else takes the last spot before the invite is answered.
        const quicker = await registerSinger("racequick");
        const join = await request(app)
            .post("/api/parties/" + smallParty + "/join")
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
        const partyId = await hostAnUpcomingParty(host);
        const guest = await registerSinger("afterparty");
        await invite(host, partyId, { target: guest.username });
        expect(await inviteFor(guest, partyId)).toBeTruthy();

        // The night comes and goes.
        await moveSlot(partyId, -3, -2);

        expect(await inviteFor(guest, partyId)).toBeUndefined();
        // Reading the list is what closed the party, and it stays closed.
        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.body.status).toBe("ended");
    }, 60000);

    it("refuses accepting an invite to a night that already ended", async () => {
        const partyId = await hostAnUpcomingParty(host);
        const guest = await registerSinger("toolateaccept");
        await invite(host, partyId, { target: guest.username });
        const notification = await inviteFor(guest, partyId);

        await moveSlot(partyId, -3, -2);

        const accept = await request(app)
            .post("/api/notifications/" + notification.id + "/accept")
            .set("Authorization", "Bearer " + guest.token);
        expect(accept.status).toBe(400);
        expect(accept.body.error).toContain("no longer available");
    }, 60000);

    it("hides an invite once the night has started", async () => {
        const partyId = await hostAnUpcomingParty(host);
        const guest = await registerSinger("midnight");
        await invite(host, partyId, { target: guest.username });
        expect(await inviteFor(guest, partyId)).toBeTruthy();

        // Under way: started half an hour ago, still running. The party is very
        // much alive, but showing up now is not what an invite is for.
        await moveSlot(partyId, -0.5, 0.5);

        expect(await inviteFor(guest, partyId)).toBeUndefined();

        // The party itself is untouched — still upcoming, still the host's.
        const room = await request(app)
            .get("/api/parties/" + partyId)
            .set("Authorization", "Bearer " + host.token);
        expect(room.body.status).toBe("upcoming");
    }, 60000);

    it("still lists invites to nights that are yet to come", async () => {
        const partyId = await hostAnUpcomingParty(host);
        const guest = await registerSinger("stillgood");
        await invite(host, partyId, { target: guest.username });

        await moveSlot(partyId, 24, 25);

        const notification = await inviteFor(guest, partyId);
        expect(notification).toBeTruthy();
        expect(notification.status).toBe("pending");
    }, 60000);
});
