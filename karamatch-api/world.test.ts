import request from "supertest";
import app from "./app";
import { client } from "./database";

afterAll(async () => {
    await client.close();
});

const suffix = Date.now();
let counter = 0;

// Registers a singer without pinning them anywhere — each test decides where
// in the world it wants to look.
async function register(prefix: string) {
    counter++;
    const username = prefix + counter + "_" + suffix;
    const response = await request(app).post("/api/auth/register").send({
        name: "World Tester",
        username: username,
        email: username + "@karamatch.test",
        password: "secret123"
    });
    expect(response.status).toBe(201);
    return response.body.token as string;
}

async function registerAt(prefix: string, lat: number, lng: number, label: string) {
    const token = await register(prefix);
    const response = await request(app)
        .put("/api/me/location")
        .set("Authorization", "Bearer " + token)
        .send({ lat: lat, lng: lng, label: label });
    expect(response.status).toBe(200);
    return token;
}

function venuesNear(token: string, lat: number, lng: number, distance?: number) {
    const range = distance === undefined ? "" : "&distance=" + distance;
    return request(app)
        .get("/api/venues?lat=" + lat + "&lng=" + lng + range)
        .set("Authorization", "Bearer " + token);
}

// Spread deliberately over both hemispheres and both sides of the meridian:
// the cell grid floors coordinates and the bounding party divides by cos(lat),
// so negative and high-latitude coordinates are the interesting cases.
const PLACES = [
    { label: "Antwerp", lat: 51.2194, lng: 4.4025 },
    { label: "Paris", lat: 48.8566, lng: 2.3522 },
    { label: "Lisbon", lat: 38.7223, lng: -9.1393 },
    { label: "Nairobi", lat: -1.2921, lng: 36.8219 },
    { label: "Sao Paulo", lat: -23.5505, lng: -46.6333 },
    { label: "Sydney", lat: -33.8688, lng: 151.2093 },
    { label: "Reykjavik", lat: 64.1466, lng: -21.9426 }
];

describe("the world generates anywhere on the map", () => {
    let token: string;

    beforeAll(async () => {
        token = await register("world");
    }, 30000);

    it.each(PLACES)("fills the venue list around $label", async (place) => {
        const response = await venuesNear(token, place.lat, place.lng, 3);
        expect(response.status).toBe(200);
        // The Venues tab is never allowed to come up empty.
        expect(response.body.length).toBeGreaterThanOrEqual(4);

        for (const venue of response.body) {
            expect(venue.id).toBeTruthy();
            expect(venue.name).toBeTruthy();
            // Rounded to one decimal, so allow the rounding step itself.
            expect(venue.distanceKm).toBeLessThanOrEqual(3.05);
            expect(venue.distanceKm).toBeGreaterThanOrEqual(0);
            expect(venue.rooms.length).toBeGreaterThan(0);
            expect(venue.fromPrice).toBeGreaterThan(0);
            expect(venue.fromPrice)
                .toBe(Math.min(...venue.rooms.map((room: any) => room.pricePerHour)));
        }

        // Nearest first.
        for (let i = 1; i < response.body.length; i++) {
            expect(response.body[i - 1].distanceKm).toBeLessThanOrEqual(response.body[i].distanceKm);
        }
    }, 60000);

    it("keeps the hemisphere it was asked about", async () => {
        // Sydney is south of the equator and east of the meridian; Sao Paulo is
        // south and west. Flooring negative coordinates onto the cell grid is
        // easy to get wrong, and the venues would land a grid cell away.
        const sydney = await venuesNear(token, -33.8688, 151.2093, 3);
        for (const venue of sydney.body) {
            expect(venue.lat).toBeLessThan(0);
            expect(venue.lng).toBeGreaterThan(0);
        }

        const saoPaulo = await venuesNear(token, -23.5505, -46.6333, 3);
        for (const venue of saoPaulo.body) {
            expect(venue.lat).toBeLessThan(0);
            expect(venue.lng).toBeLessThan(0);
        }
    }, 60000);

    it("gives every city its own venues", async () => {
        const paris = await venuesNear(token, 48.8566, 2.3522, 3);
        const sydney = await venuesNear(token, -33.8688, 151.2093, 3);
        const parisIds = paris.body.map((venue: any) => venue.id);
        const sydneyIds = sydney.body.map((venue: any) => venue.id);
        expect(parisIds.some((id: string) => sydneyIds.includes(id))).toBe(false);
    }, 60000);

    it("keeps a place the same on the way back", async () => {
        // Cells are rolled once and then marked generated, so a second look at
        // the same spot must not invent a different neighbourhood.
        const first = await venuesNear(token, 43.7696, 11.2558, 3);
        const second = await venuesNear(token, 43.7696, 11.2558, 3);
        const secondIds = second.body.map((venue: any) => venue.id);
        for (const venue of first.body) {
            expect(secondIds).toContain(venue.id);
        }
        // Same order, same distances.
        expect(second.body.slice(0, first.body.length).map((venue: any) => venue.distanceKm))
            .toEqual(first.body.map((venue: any) => venue.distanceKm));
    }, 60000);
});

describe("how far to look", () => {
    let token: string;

    beforeAll(async () => {
        token = await register("distance");
    }, 30000);

    it("widens the net for a bigger distance", async () => {
        const near = await venuesNear(token, 41.9028, 12.4964, 1);
        const far = await venuesNear(token, 41.9028, 12.4964, 6);
        expect(near.status).toBe(200);
        expect(far.status).toBe(200);
        // Everything within 1km is also within 6km.
        const farIds = far.body.map((venue: any) => venue.id);
        for (const venue of near.body.filter((entry: any) => entry.distanceKm <= 1)) {
            expect(farIds).toContain(venue.id);
        }
        for (const venue of far.body) {
            expect(venue.distanceKm).toBeLessThanOrEqual(6.05);
        }
    }, 60000);

    it("caps a huge distance at 25km", async () => {
        const response = await venuesNear(token, 55.6761, 12.5683, 500);
        expect(response.status).toBe(200);
        for (const venue of response.body) {
            expect(venue.distanceKm).toBeLessThanOrEqual(25.05);
        }
    }, 120000);

    it("lifts a tiny distance to 500m", async () => {
        const response = await venuesNear(token, 59.3293, 18.0686, 0.01);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThanOrEqual(4);
        for (const venue of response.body) {
            expect(venue.distanceKm).toBeLessThanOrEqual(0.55);
        }
    }, 60000);

    it("falls back to 3km when the distance makes no sense", async () => {
        const response = await venuesNear(token, 52.3676, 4.9041, "not-a-number" as any);
        expect(response.status).toBe(200);
        for (const venue of response.body) {
            expect(venue.distanceKm).toBeLessThanOrEqual(3.05);
        }
    }, 60000);
});

describe("where the app looks when you do not say", () => {
    it("uses the location on your profile", async () => {
        const token = await registerAt("pinned", 45.4642, 9.1900, "Milan");
        const implicit = await request(app)
            .get("/api/venues?distance=3")
            .set("Authorization", "Bearer " + token);
        expect(implicit.status).toBe(200);
        expect(implicit.body.length).toBeGreaterThanOrEqual(4);

        // Same answer as asking for Milan by hand.
        const explicit = await venuesNear(token, 45.4642, 9.1900, 3);
        expect(implicit.body.map((venue: any) => venue.id))
            .toEqual(explicit.body.map((venue: any) => venue.id));
    }, 60000);

    it("lets a query override the pinned location", async () => {
        const token = await registerAt("override", 45.4642, 9.1900, "Milan");
        const elsewhere = await venuesNear(token, 37.9838, 23.7275, 3);
        expect(elsewhere.status).toBe(200);
        // Athens venues, not Milan ones.
        for (const venue of elsewhere.body) {
            expect(venue.lat).toBeGreaterThan(37);
            expect(venue.lat).toBeLessThan(39);
        }
    }, 60000);

    it("asks you to set a location when there is none", async () => {
        const token = await register("nowhere");
        for (const path of ["/api/venues", "/api/parties/open", "/api/parties/matches"]) {
            const response = await request(app)
                .get(path)
                .set("Authorization", "Bearer " + token);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain("location");
        }
    }, 30000);

    it("rejects a location that is not a pair of numbers", async () => {
        const token = await register("badpin");
        const response = await request(app)
            .put("/api/me/location")
            .set("Authorization", "Bearer " + token)
            .send({ lat: "somewhere", lng: "else" });
        expect(response.status).toBe(400);
    }, 30000);
});

describe("a full night in a city far from home", () => {
    // Everything the other suites do around Hasselt, done in Lisbon instead —
    // venues, slots, a booking, and the open/match lists that have to generate
    // their own NPC parties in a neighbourhood nobody has visited yet.
    let token: string;
    const lat = 38.7223;
    const lng = -9.1393;

    beforeAll(async () => {
        token = await registerAt("lisbon", lat, lng, "Lisbon");
    }, 30000);

    it("books a room in Lisbon", async () => {
        const venues = await request(app)
            .get("/api/venues?distance=3")
            .set("Authorization", "Bearer " + token);
        expect(venues.status).toBe(200);
        const venueId = venues.body[0].id;

        const detail = await request(app)
            .get("/api/venues/" + venueId)
            .set("Authorization", "Bearer " + token);
        expect(detail.status).toBe(200);
        expect(detail.body.rooms.length).toBeGreaterThan(0);

        const slots = await request(app)
            .get("/api/venues/" + venueId + "/slots")
            .set("Authorization", "Bearer " + token);
        expect(slots.status).toBe(200);
        const roomWithSlots = slots.body.find((entry: any) => entry.slots.length > 0);
        expect(roomWithSlots).toBeTruthy();

        const booking = await request(app)
            .post("/api/parties")
            .set("Authorization", "Bearer " + token)
            .send({
                venueId: venueId,
                roomId: roomWithSlots.room.id,
                slotId: roomWithSlots.slots[0].id,
                title: "Fado & Friends"
            });
        expect(booking.status).toBe(201);
        expect(booking.body.status).toBe("pending_payment");

        const pay = await request(app)
            .post("/api/parties/" + booking.body.id + "/pay")
            .set("Authorization", "Bearer " + token);
        expect(pay.status).toBe(200);
        expect(pay.body.status).toBe("upcoming");
    }, 60000);

    it("populates the open list with parties that are actually nearby", async () => {
        const response = await request(app)
            .get("/api/parties/open?distance=3")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThanOrEqual(3);
        for (const party of response.body) {
            expect(party.venue.distanceKm).toBeLessThanOrEqual(3.05);
            expect(party.status).toBe("upcoming");
            expect(party.spotsOpen).toBeGreaterThan(0);
            expect(party.host.username).toBeTruthy();
        }
    }, 60000);

    it("scores the matches around a brand new city", async () => {
        await request(app)
            .put("/api/me")
            .set("Authorization", "Bearer " + token)
            .send({ favoriteSongIds: ["12617", "12543", "11335"] });

        const response = await request(app)
            .get("/api/parties/matches?distance=3")
            .set("Authorization", "Bearer " + token);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        for (const match of response.body) {
            expect(match.matchPct).toBeGreaterThanOrEqual(0);
            expect(match.matchPct).toBeLessThanOrEqual(100);
            expect(match.venue.distanceKm).toBeLessThanOrEqual(3.05);
        }
    }, 60000);

    it("finds singers near the new city too", async () => {
        const open = await request(app)
            .get("/api/parties/open?distance=3")
            .set("Authorization", "Bearer " + token);
        const host = open.body[0].host.username;

        const profile = await request(app)
            .get("/api/users/" + host)
            .set("Authorization", "Bearer " + token);
        expect(profile.status).toBe(200);
        expect(profile.body.username).toBe(host);
        expect(profile.body.location).toBeTruthy();
        // Generated within a cell of the city they sing in.
        expect(Math.abs(profile.body.location.lat - lat)).toBeLessThan(1);
    }, 60000);
});
