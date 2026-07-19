import express, { Request, Response } from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import {
    ensureOpenBoxesNear, ensureMatchesNear, getMyBoxes, getBoxById, getMessagesForBox,
    createMessage, maybeNpcReply, getVenueById, getSlotById, createBox, addBoxMember,
    payForBox, shareFor, getBoxRoom, setBoxOpenToPublic, createInvite, getCrew,
    createRatings, hasRatedBox, getUserByUsername, getUserByEmail
} from "../database";
import { resolveLocation } from "./venues";
import { Box, toPublicUser } from "../types";

const router = express.Router();

router.post("/boxes", verifyAuthToken, async (req, res) => {
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
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const box = await createBox(user, venue, room, slot, title);
    res.status(201).json({ ...box, share: shareFor(box) });
});

router.post("/boxes/:id/join", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const box = await getBoxById(req.params.id);
    if (!box) {
        res.status(404).json({ error: "Box not found" });
        return;
    }
    if (box.members.some(member => member.userId === user.id)) {
        res.status(400).json({ error: "You are already in this box" });
        return;
    }
    if (!box.openToPublic || box.status !== "upcoming") {
        res.status(400).json({ error: "Box is not open for joining" });
        return;
    }
    if (box.members.length >= box.capacity) {
        res.status(400).json({ error: "Box is full" });
        return;
    }
    await addBoxMember(box, user);
    res.json({ boxId: box.id, share: shareFor(box) });
});

router.post("/boxes/:id/pay", verifyAuthToken, async (req, res) => {
    const box = await loadMemberBox(req.params.id, res);
    if (!box) {
        return;
    }
    if (box.status === "ended") {
        res.status(400).json({ error: "Box has already ended" });
        return;
    }
    if (box.status === "cancelled") {
        res.status(400).json({ error: "Box was cancelled — the slot went back to the venue" });
        return;
    }
    // Simulated payment — always succeeds.
    const updated = await payForBox(box, res.locals.user);
    res.json({ boxId: updated.id, status: updated.status, share: shareFor(updated) });
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

router.get("/boxes/open", verifyAuthToken, async (req, res) => {
    const query = parseWorldQuery(req, res);
    if (!query) {
        return;
    }
    const boxes = await ensureOpenBoxesNear(
        res.locals.user, query.location.lat, query.location.lng, query.distance, query.from, query.to
    );
    res.json(boxes);
});

router.get("/boxes/matches", verifyAuthToken, async (req, res) => {
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

router.get("/boxes/mine", verifyAuthToken, async (req, res) => {
    const mine = await getMyBoxes(res.locals.user);
    res.json(mine);
});

router.get("/boxes/:id", verifyAuthToken, async (req, res) => {
    const box = await loadMemberBox(req.params.id, res);
    if (!box) {
        return;
    }
    const room = await getBoxRoom(box, res.locals.user);
    res.json(room);
});

function isHost(box: Box, userId: number) {
    return box.members.some(member => member.userId === userId && member.role === "host");
}

router.patch("/boxes/:id", verifyAuthToken, async (req, res) => {
    const box = await getBoxById(req.params.id);
    if (!box) {
        res.status(404).json({ error: "Box not found" });
        return;
    }
    if (!isHost(box, res.locals.user.id)) {
        res.status(403).json({ error: "Host only" });
        return;
    }
    if (typeof req.body.openToPublic !== "boolean") {
        res.status(400).json({ error: "openToPublic must be a boolean" });
        return;
    }
    await setBoxOpenToPublic(box, req.body.openToPublic);
    res.json({ id: box.id, openToPublic: req.body.openToPublic });
});

// Loads the box and checks the caller is a member; sends the 404/403 itself
// and returns null when the caller may not chat here.
async function loadMemberBox(boxId: string, res: Response): Promise<Box | null> {
    const box = await getBoxById(boxId);
    if (!box) {
        res.status(404).json({ error: "Box not found" });
        return null;
    }
    if (!box.members.some(member => member.userId === res.locals.user.id)) {
        res.status(403).json({ error: "Members only" });
        return null;
    }
    return box;
}

router.get("/boxes/:id/messages", verifyAuthToken, async (req, res) => {
    const box = await loadMemberBox(req.params.id, res);
    if (!box) {
        return;
    }
    const messages = await getMessagesForBox(box.id);
    res.json(messages);
});

router.post("/boxes/:id/messages", verifyAuthToken, async (req, res) => {
    const box = await loadMemberBox(req.params.id, res);
    if (!box) {
        return;
    }
    const text: string = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (text === "") {
        res.status(400).json({ error: "text is required" });
        return;
    }
    const message = await createMessage(box, res.locals.user.id, text);
    // Now and then an NPC member replies — it shows up on the next poll.
    await maybeNpcReply(box, res.locals.user.id);
    res.status(201).json({
        id: message.id,
        boxId: message.boxId,
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

router.post("/boxes/:id/invites", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const box = await getBoxById(req.params.id);
    if (!box) {
        res.status(404).json({ error: "Box not found" });
        return;
    }
    if (!isHost(box, user.id)) {
        res.status(403).json({ error: "Host only" });
        return;
    }
    if (box.members.length >= box.capacity) {
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
        if (box.members.some(member => member.userId === invitee.id)) {
            continue;
        }
        const current = await getBoxById(box.id);
        if (current && current.invitedUsernames.includes(invitee.username)) {
            continue;
        }
        await createInvite(box, user, invitee);
        invited.push(invitee.username);
    }
    if (invited.length === 0) {
        res.status(400).json({ error: "No matching users to invite" });
        return;
    }
    res.status(201).json({ invited: invited });
});

router.get("/boxes/:id/crew", verifyAuthToken, async (req, res) => {
    const box = await loadMemberBox(req.params.id, res);
    if (!box) {
        return;
    }
    if (box.status !== "ended") {
        res.status(400).json({ error: "Box has not ended yet" });
        return;
    }
    const crew = await getCrew(box, res.locals.user);
    res.json(crew);
});

router.post("/boxes/:id/ratings", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const box = await loadMemberBox(req.params.id, res);
    if (!box) {
        return;
    }
    if (box.status !== "ended") {
        res.status(400).json({ error: "You can only rate an ended box" });
        return;
    }
    if (await hasRatedBox(user, box.id)) {
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
        if (!fellow || fellow.id === user.id || !box.members.some(member => member.userId === fellow.id)) {
            res.status(400).json({ error: "\"" + rating.username + "\" is not a fellow member of this box" });
            return;
        }
        entries.push({
            toUserId: fellow.id,
            stars: rating.stars,
            text: typeof rating.text === "string" ? rating.text : ""
        });
    }
    await createRatings(box, user, entries);
    res.status(201).json({ message: "Reviews posted — thanks!" });
});

export default router;
