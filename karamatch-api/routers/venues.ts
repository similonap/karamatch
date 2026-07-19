import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import { ensureVenuesNear, ensureSlots, getVenueById } from "../database";
import { User } from "../types";

const router = express.Router();

// Reads a location from ?lat/?lng, falling back to the user's stored profile
// location. Returns null when neither is available.
export function resolveLocation(user: User, latQuery: unknown, lngQuery: unknown) {
    const lat = typeof latQuery === "string" ? parseFloat(latQuery) : user.location?.lat;
    const lng = typeof lngQuery === "string" ? parseFloat(lngQuery) : user.location?.lng;
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        return null;
    }
    return { lat, lng };
}

router.get("/venues", verifyAuthToken, async (req, res) => {
    const location = resolveLocation(res.locals.user, req.query.lat, req.query.lng);
    if (!location) {
        res.status(400).json({ error: "Set your location first, or pass lat and lng" });
        return;
    }
    let distance = typeof req.query.distance === "string" ? parseFloat(req.query.distance) : 3;
    if (isNaN(distance)) {
        distance = 3;
    }
    distance = Math.min(Math.max(distance, 0.5), 25);

    const venues = await ensureVenuesNear(location.lat, location.lng, distance);
    res.json(venues);
});

router.get("/venues/:id", verifyAuthToken, async (req, res) => {
    const venue = await getVenueById(req.params.id);
    if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
    }
    res.json(venue);
});

router.get("/venues/:id/slots", verifyAuthToken, async (req, res) => {
    const venue = await getVenueById(req.params.id);
    if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
    }
    // Default range: tonight → +7 days, same window the seed materializes and
    // the same one GET /boxes/open uses. The calendar grows as you look further.
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : new Date();
    const to = typeof req.query.to === "string"
        ? new Date(req.query.to)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
        res.status(400).json({ error: "Invalid from/to range" });
        return;
    }
    const roomSlots = await ensureSlots(venue, from, to);
    res.json(roomSlots);
});

export default router;
