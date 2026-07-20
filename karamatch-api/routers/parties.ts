import express, { Request, Response } from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import {
    ensureOpenPartiesNear, ensureMatchesNear, getMyParties, getPartyById, getMessagesForParty,
    createMessage, maybeNpcReply, getVenueById, getSlotById, createParty, addPartyMember,
    payForParty, shareFor, getPartyRoom, setPartyOpenToPublic, createInvite, getCrew,
    createRatings, hasRatedParty, getUserByUsername, getUserByEmail
} from "../database";
import { resolveLocation } from "./venues";
import { Party, toPublicUser } from "../types";

const router = express.Router();

router.post("/parties", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const venueId: string = req.body.venueId;
    const roomId: string = req.body.roomId;
    const slotId: string = req.body.slotId;
    if (!venueId || !roomId || !slotId) {
        res.status(400).json({ error: "venueId, roomId and slotId are required" });
        return;
    }
    const venue = await getVenueById(venueId);
    if (!venue) {
        res.status(400).json({ error: "Unknown venue" });
        return;
    }
    const room = venue.rooms.find(room => room.id === roomId);
    if (!room) {
        res.status(400).json({ error: "Unknown room" });
        return;
    }
    const slot = await getSlotById(slotId);
    if (!slot || slot.venueId !== venue.id || slot.roomId !== room.id) {
        res.status(400).json({ error: "Unknown slot" });
        return;
    }
    if (slot.status !== "available") {
        res.status(400).json({ error: "Slot already taken" });
        return;
    }
    // How many spots the host opens up to other singers. Defaults to the whole
    // room minus the host's own seat; a lower number keeps seats free for people
    // the host brings along themselves.
    const maxSpots = room.seats - 1;
    let openSpots = maxSpots;
    if (req.body.spots !== undefined) {
        if (!Number.isInteger(req.body.spots) || req.body.spots < 1 || req.body.spots > maxSpots) {
            res.status(400).json({ error: "spots must be a whole number between 1 and " + maxSpots });
            return;
        }
        openSpots = req.body.spots;
    }
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const party = await createParty(user, venue, room, slot, title, openSpots);
    res.status(201).json({ ...party, share: shareFor(party) });
});

router.post("/parties/:id/join", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const party = await getPartyById(req.params.id);
    if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
    }
    if (party.members.some(member => member.userId === user.id)) {
        res.status(400).json({ error: "You are already in this party" });
        return;
    }
    if (!party.openToPublic || party.status !== "upcoming") {
        res.status(400).json({ error: "Party is not open for joining" });
        return;
    }
    if (party.members.length >= party.capacity) {
        res.status(400).json({ error: "Party is full" });
        return;
    }
    await addPartyMember(party, user);
    res.json({ partyId: party.id, share: shareFor(party) });
});

router.post("/parties/:id/pay", verifyAuthToken, async (req, res) => {
    const party = await loadMemberParty(req.params.id, res);
    if (!party) {
        return;
    }
    if (party.status === "ended") {
        res.status(400).json({ error: "Party has already ended" });
        return;
    }
    if (party.status === "cancelled") {
        res.status(400).json({ error: "Party was cancelled — the slot went back to the venue" });
        return;
    }
    // Simulated payment — always succeeds.
    const updated = await payForParty(party, res.locals.user);
    res.json({ partyId: updated.id, status: updated.status, share: shareFor(updated) });
});

// Shared query parsing for the location + time-window endpoints (/open,
// /matches): where to look, how far, and when. Sends the 400 itself and
// returns null when the query is unusable.
function parseWorldQuery(req: Request, res: Response) {
    const location = resolveLocation(res.locals.user, req.query.lat, req.query.lng);
    if (!location) {
        res.status(400).json({ error: "Set your location first, or pass lat and lng" });
        return null;
    }
    let distance = typeof req.query.distance === "string" ? parseFloat(req.query.distance) : 3;
    if (isNaN(distance)) {
        distance = 3;
    }
    distance = Math.min(Math.max(distance, 0.5), 25);

    // Default time window: now → +7 days.
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : new Date();
    const to = typeof req.query.to === "string"
        ? new Date(req.query.to)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
        res.status(400).json({ error: "Invalid from/to range" });
        return null;
    }
    return { location: location, distance: distance, from: from, to: to };
}

router.get("/parties/open", verifyAuthToken, async (req, res) => {
    const query = parseWorldQuery(req, res);
    if (!query) {
        return;
    }
    const parties = await ensureOpenPartiesNear(
        res.locals.user, query.location.lat, query.location.lng, query.distance, query.from, query.to
    );
    res.json(parties);
});

router.get("/parties/matches", verifyAuthToken, async (req, res) => {
    const query = parseWorldQuery(req, res);
    if (!query) {
        return;
    }
    let minOverlap = typeof req.query.minOverlap === "string" ? parseInt(req.query.minOverlap) : 0;
    if (isNaN(minOverlap)) {
        minOverlap = 0;
    }
    const matches = await ensureMatchesNear(
        res.locals.user, query.location.lat, query.location.lng, query.distance, query.from, query.to, minOverlap
    );
    res.json(matches);
});

router.get("/parties/mine", verifyAuthToken, async (req, res) => {
    const mine = await getMyParties(res.locals.user);
    res.json(mine);
});

router.get("/parties/:id", verifyAuthToken, async (req, res) => {
    const party = await loadMemberParty(req.params.id, res);
    if (!party) {
        return;
    }
    const room = await getPartyRoom(party, res.locals.user);
    res.json(room);
});

function isHost(party: Party, userId: number) {
    return party.members.some(member => member.userId === userId && member.role === "host");
}

router.patch("/parties/:id", verifyAuthToken, async (req, res) => {
    const party = await getPartyById(req.params.id);
    if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
    }
    if (!isHost(party, res.locals.user.id)) {
        res.status(403).json({ error: "Host only" });
        return;
    }
    if (typeof req.body.openToPublic !== "boolean") {
        res.status(400).json({ error: "openToPublic must be a boolean" });
        return;
    }
    await setPartyOpenToPublic(party, req.body.openToPublic);
    res.json({ id: party.id, openToPublic: req.body.openToPublic });
});

// Loads the party and checks the caller is a member; sends the 404/403 itself
// and returns null when the caller may not chat here.
async function loadMemberParty(partyId: string, res: Response): Promise<Party | null> {
    const party = await getPartyById(partyId);
    if (!party) {
        res.status(404).json({ error: "Party not found" });
        return null;
    }
    if (!party.members.some(member => member.userId === res.locals.user.id)) {
        res.status(403).json({ error: "Members only" });
        return null;
    }
    return party;
}

router.get("/parties/:id/messages", verifyAuthToken, async (req, res) => {
    const party = await loadMemberParty(req.params.id, res);
    if (!party) {
        return;
    }
    const messages = await getMessagesForParty(party.id);
    res.json(messages);
});

router.post("/parties/:id/messages", verifyAuthToken, async (req, res) => {
    const party = await loadMemberParty(req.params.id, res);
    if (!party) {
        return;
    }
    const text: string = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (text === "") {
        res.status(400).json({ error: "text is required" });
        return;
    }
    const message = await createMessage(party, res.locals.user.id, text);
    // Now and then an NPC member replies — it shows up on the next poll.
    await maybeNpcReply(party, res.locals.user.id);
    res.status(201).json({
        id: message.id,
        partyId: message.partyId,
        userId: message.userId,
        from: toPublicUser(res.locals.user),
        text: message.text,
        sentAt: message.sentAt
    });
});

// An invite target is "@username", a plain username, or an email address.
async function resolveInvitee(target: string) {
    const byUsername = await getUserByUsername(target.replace(/^@/, ""));
    if (byUsername) {
        return byUsername;
    }
    return await getUserByEmail(target);
}

router.post("/parties/:id/invites", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const party = await getPartyById(req.params.id);
    if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
    }
    if (!isHost(party, user.id)) {
        res.status(403).json({ error: "Host only" });
        return;
    }
    if (party.members.length >= party.capacity) {
        res.status(400).json({ error: "No spots left to invite for" });
        return;
    }
    let targets: string[] = [];
    if (Array.isArray(req.body.usernames)) {
        targets = req.body.usernames.filter((target: unknown) => typeof target === "string");
    } else if (typeof req.body.target === "string") {
        targets = [req.body.target];
    }
    if (targets.length === 0) {
        res.status(400).json({ error: "usernames or target is required" });
        return;
    }

    const invited: string[] = [];
    for (const target of targets) {
        const invitee = await resolveInvitee(target.trim());
        if (!invitee || invitee.id === user.id) {
            continue;
        }
        if (party.members.some(member => member.userId === invitee.id)) {
            continue;
        }
        const current = await getPartyById(party.id);
        if (current && current.invitedUsernames.includes(invitee.username)) {
            continue;
        }
        await createInvite(party, user, invitee);
        invited.push(invitee.username);
    }
    if (invited.length === 0) {
        res.status(400).json({ error: "No matching users to invite" });
        return;
    }
    res.status(201).json({ invited: invited });
});

router.get("/parties/:id/crew", verifyAuthToken, async (req, res) => {
    const party = await loadMemberParty(req.params.id, res);
    if (!party) {
        return;
    }
    if (party.status !== "ended") {
        res.status(400).json({ error: "Party has not ended yet" });
        return;
    }
    const crew = await getCrew(party, res.locals.user);
    res.json(crew);
});

router.post("/parties/:id/ratings", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const party = await loadMemberParty(req.params.id, res);
    if (!party) {
        return;
    }
    if (party.status !== "ended") {
        res.status(400).json({ error: "You can only rate an ended party" });
        return;
    }
    if (await hasRatedParty(user, party.id)) {
        res.status(400).json({ error: "You already rated this crew" });
        return;
    }
    const ratings = req.body.ratings;
    if (!Array.isArray(ratings) || ratings.length === 0) {
        res.status(400).json({ error: "ratings must be a non-empty array" });
        return;
    }
    const entries: { toUserId: number; stars: number; text: string }[] = [];
    for (const rating of ratings) {
        if (!Number.isInteger(rating.stars) || rating.stars < 1 || rating.stars > 5) {
            res.status(400).json({ error: "stars must be a whole number between 1 and 5" });
            return;
        }
        const username = typeof rating.username === "string" ? rating.username.replace(/^@/, "") : "";
        const fellow = await getUserByUsername(username);
        if (!fellow || fellow.id === user.id || !party.members.some(member => member.userId === fellow.id)) {
            res.status(400).json({ error: "\"" + rating.username + "\" is not a fellow member of this party" });
            return;
        }
        entries.push({
            toUserId: fellow.id,
            stars: rating.stars,
            text: typeof rating.text === "string" ? rating.text : ""
        });
    }
    await createRatings(party, user, entries);
    res.status(201).json({ message: "Reviews posted — thanks!" });
});

export default router;
